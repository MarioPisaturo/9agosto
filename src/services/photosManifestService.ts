import { DROPBOX_CONFIG } from "../config/dropbox";
import { USE_DROPBOX_PROXY } from "../config/runtime";
import type {
  PaginatedPhotosResult,
  PhotoManifestEntry,
  PhotosManifest,
} from "../types/photosManifest";
import {
  PHOTOS_MANIFEST_FILENAME,
  PHOTOS_MANIFEST_VERSION,
} from "../types/photosManifest";

const SUPPORTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

let cachedManifest: PhotosManifest | null = null;

function getFolder() {
  return DROPBOX_CONFIG.FOLDER;
}

function getManifestPath(folder = getFolder()) {
  const base = folder.endsWith("/") ? folder.slice(0, -1) : folder;
  return `${base}/${PHOTOS_MANIFEST_FILENAME}`;
}

function isImageFile(name: string) {
  const lower = name.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function sortPhotosNewestFirst(photos: PhotoManifestEntry[]) {
  return [...photos].sort(
    (a, b) =>
      new Date(b.server_modified).getTime() -
      new Date(a.server_modified).getTime()
  );
}

function createEmptyManifest(): PhotosManifest {
  return {
    version: PHOTOS_MANIFEST_VERSION,
    updatedAt: new Date().toISOString(),
    photos: [],
  };
}

async function downloadTextFile(path: string): Promise<string | null> {
  const response = await fetch(
    `https://content.dropboxapi.com/2/files/download`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DROPBOX_CONFIG.ACCESS_TOKEN}`,
        "Dropbox-API-Arg": JSON.stringify({ path }),
      },
    }
  );

  if (response.status === 409) return null;
  if (!response.ok) {
    throw new Error(`Download fallito (${response.status})`);
  }

  return response.text();
}

async function uploadTextFile(path: string, content: string): Promise<void> {
  const response = await fetch(
    `https://content.dropboxapi.com/2/files/upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DROPBOX_CONFIG.ACCESS_TOKEN}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          path,
          mode: "overwrite",
          autorename: false,
          mute: true,
        }),
      },
      body: content,
    }
  );

  if (!response.ok) {
    throw new Error(`Upload manifest fallito: ${await response.text()}`);
  }
}

export class PhotosManifestService {
  static invalidateCache() {
    cachedManifest = null;
  }

  static async readManifest(
    folder = getFolder(),
    options: { skipCache?: boolean } = {}
  ): Promise<PhotosManifest | null> {
    if (!options.skipCache && cachedManifest) return cachedManifest;

    const raw = await downloadTextFile(getManifestPath(folder));
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as PhotosManifest;
      if (!Array.isArray(parsed.photos)) return null;
      parsed.photos = sortPhotosNewestFirst(parsed.photos);
      cachedManifest = parsed;
      return parsed;
    } catch {
      return null;
    }
  }

  static async writeManifest(
    folder: string,
    manifest: PhotosManifest
  ): Promise<PhotosManifest> {
    const payload: PhotosManifest = {
      version: PHOTOS_MANIFEST_VERSION,
      updatedAt: new Date().toISOString(),
      photos: sortPhotosNewestFirst(manifest.photos),
    };

    await uploadTextFile(getManifestPath(folder), JSON.stringify(payload, null, 2));
    cachedManifest = payload;
    return payload;
  }

  static entryFromUpload(
    uploadedFile: {
      path_lower: string;
      path_display?: string;
      name: string;
      size: number;
      server_modified: string;
      content_hash?: string;
    },
    extra: {
      description?: string;
      uploadedBy?: string;
      uploadedAt?: string;
    } = {}
  ): PhotoManifestEntry {
    return {
      path_lower: uploadedFile.path_lower,
      path_display: uploadedFile.path_display || uploadedFile.path_lower,
      name: uploadedFile.name,
      size: uploadedFile.size,
      server_modified: uploadedFile.server_modified,
      content_hash: uploadedFile.content_hash,
      description: extra.description,
      uploadedBy: extra.uploadedBy,
      uploadedAt: extra.uploadedAt || new Date().toISOString(),
    };
  }

  static async addPhoto(folder: string, entry: PhotoManifestEntry) {
    const manifest = (await this.readManifest(folder)) || createEmptyManifest();
    const photos = manifest.photos.filter(
      (photo) => photo.path_lower !== entry.path_lower
    );
    manifest.photos = sortPhotosNewestFirst([entry, ...photos]);
    return this.writeManifest(folder, manifest);
  }

  private static async loadLegacyMetadata(pathLower: string) {
    try {
      const raw = await downloadTextFile(`${pathLower}.metadata.json`);
      if (!raw) return null;
      return JSON.parse(raw) as {
        description?: string;
        uploadedBy?: string;
        uploadedAt?: string;
      };
    } catch {
      return null;
    }
  }

  private static async listImageEntries(folder: string) {
    const response = await fetch(
      "https://api.dropboxapi.com/2/files/list_folder",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DROPBOX_CONFIG.ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: folder,
          recursive: false,
          include_deleted: false,
        }),
      }
    );

    if (response.status === 409) {
      const errorText = await response.text();
      if (errorText.includes("path/not_found")) return [];
    }

    if (!response.ok) {
      throw new Error(`list_folder fallito: ${await response.text()}`);
    }

    const data = await response.json();
    return (data.entries || []).filter(
      (entry: { ".tag": string; name: string }) =>
        entry[".tag"] === "file" &&
        isImageFile(entry.name) &&
        entry.name !== PHOTOS_MANIFEST_FILENAME &&
        !entry.name.endsWith(".metadata.json")
    );
  }

  static async buildFromFolder(folder = getFolder()): Promise<PhotosManifest> {
    const entries = await this.listImageEntries(folder);
    return this.writeManifestFromEntries(folder, entries);
  }

  private static async writeManifestFromEntries(
    folder: string,
    entries: Array<{
      path_lower: string;
      path_display?: string;
      name: string;
      size: number;
      server_modified: string;
      content_hash?: string;
    }>
  ): Promise<PhotosManifest> {
    const photos = await Promise.all(
      entries.map(async (entry) => {
        const legacy = await this.loadLegacyMetadata(entry.path_lower);
        return {
          path_lower: entry.path_lower,
          path_display: entry.path_display || entry.path_lower,
          name: entry.name,
          size: entry.size,
          server_modified: entry.server_modified,
          content_hash: entry.content_hash,
          description: legacy?.description,
          uploadedBy: legacy?.uploadedBy,
          uploadedAt: legacy?.uploadedAt,
        };
      })
    );

    return this.writeManifest(folder, { ...createEmptyManifest(), photos });
  }

  private static manifestMatchesFolder(
    manifest: PhotosManifest,
    folderEntries: Array<{ path_lower: string }>
  ): boolean {
    const manifestPaths = new Set(
      manifest.photos.map((photo) => photo.path_lower)
    );
    const folderPaths = new Set(folderEntries.map((entry) => entry.path_lower));

    if (manifestPaths.size !== folderPaths.size) return false;
    for (const path of folderPaths) {
      if (!manifestPaths.has(path)) return false;
    }
    return true;
  }

  /**
   * Allinea photos-manifest.json con i file reali in Dropbox.
   * Non azzera mai un manifest pieno se list_folder torna vuota.
   */
  static async reconcileManifest(
    folder = getFolder(),
    options: { force?: boolean } = {}
  ): Promise<PhotosManifest> {
    if (USE_DROPBOX_PROXY) {
      throw new Error("reconcileManifest non disponibile con proxy");
    }

    if (options.force) {
      this.invalidateCache();
    }

    let existing: PhotosManifest | null = null;
    try {
      // Sempre rileggi da Dropbox: la cache in-memory può restare su {photos:[]} stale
      existing = await this.readManifest(folder, { skipCache: true });
    } catch (error) {
      console.warn("Impossibile leggere photos-manifest.json:", error);
    }

    let folderEntries: Array<{
      path_lower: string;
      path_display?: string;
      name: string;
      size: number;
      server_modified: string;
      content_hash?: string;
    }>;

    try {
      folderEntries = await this.listImageEntries(folder);
    } catch (error) {
      console.warn("list_folder fallita, uso il manifest esistente:", error);
      if (existing) return existing;
      throw error;
    }

    const manifestCount = existing?.photos.length ?? 0;

    if (folderEntries.length === 0 && manifestCount > 0) {
      console.warn(
        `list_folder vuota ma manifest ha ${manifestCount} foto: tengo il manifest`
      );
      return existing as PhotosManifest;
    }

    if (
      !options.force &&
      existing &&
      this.manifestMatchesFolder(existing, folderEntries)
    ) {
      return existing;
    }

    this.invalidateCache();
    return this.writeManifestFromEntries(folder, folderEntries);
  }

  static async ensureManifest(folder = getFolder()) {
    return this.reconcileManifest(folder);
  }

  static async getPaginatedPhotos(
    limit = 20,
    offset = 0,
    folder = getFolder(),
    options: { refresh?: boolean } = {}
  ): Promise<PaginatedPhotosResult> {
    if (USE_DROPBOX_PROXY) {
      throw new Error("Usa DropboxService.getWeddingPhotos con proxy");
    }

    const safeLimit = Math.max(1, Math.min(limit, 100));
    const safeOffset = Math.max(0, offset);

    try {
      const manifest = await this.reconcileManifest(folder, {
        force: options.refresh,
      });

      const totalCount = manifest.photos.length;
      const entries = manifest.photos.slice(safeOffset, safeOffset + safeLimit);

      return {
        entries,
        totalCount,
        hasMore: safeOffset + safeLimit < totalCount,
        source: "manifest",
      };
    } catch (error) {
      this.invalidateCache();
      const existing = await this.readManifest(folder, { skipCache: true });
      if (existing) {
        const totalCount = existing.photos.length;
        return {
          entries: existing.photos.slice(safeOffset, safeOffset + safeLimit),
          totalCount,
          hasMore: safeOffset + safeLimit < totalCount,
          source: "manifest",
        };
      }
      throw error;
    }
  }
}
