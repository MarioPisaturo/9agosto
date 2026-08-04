import {
  API_BASE_URL,
  CONTENT_API_URL,
  dropboxApiFetch,
  getDropboxFolder,
} from "./_dropbox.mjs";

export const PHOTOS_MANIFEST_FILENAME = "photos-manifest.json";
export const PHOTOS_MANIFEST_VERSION = 1;

const SUPPORTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

let cachedManifest = null;
let cachedManifestKey = "";

function getManifestPath(folder) {
  const base = folder.endsWith("/") ? folder.slice(0, -1) : folder;
  return `${base}/${PHOTOS_MANIFEST_FILENAME}`;
}

function isImageFile(name) {
  const lower = name.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function sortPhotosNewestFirst(photos) {
  return [...photos].sort(
    (a, b) =>
      new Date(b.server_modified).getTime() -
      new Date(a.server_modified).getTime()
  );
}

export function createEmptyManifest() {
  return {
    version: PHOTOS_MANIFEST_VERSION,
    updatedAt: new Date().toISOString(),
    photos: [],
  };
}

export function manifestEntryFromUpload(uploadedFile, extra = {}) {
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

async function downloadTextFile(path) {
  const response = await dropboxApiFetch(`${CONTENT_API_URL}/files/download`, {
    method: "POST",
    headers: {
      "Dropbox-API-Arg": JSON.stringify({ path }),
    },
  });

  if (response.status === 409) return null;
  if (!response.ok) {
    throw new Error(`Download fallito (${response.status}): ${await response.text()}`);
  }

  return response.text();
}

async function uploadTextFile(path, content) {
  const response = await dropboxApiFetch(`${CONTENT_API_URL}/files/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Dropbox-API-Arg": JSON.stringify({
        path,
        mode: "overwrite",
        autorename: false,
        mute: true,
      }),
    },
    body: Buffer.from(content, "utf8"),
  });

  if (!response.ok) {
    throw new Error(`Upload manifest fallito: ${await response.text()}`);
  }
}

export async function readManifest(folder = getDropboxFolder()) {
  const cacheKey = `${folder}`;
  if (cachedManifest && cachedManifestKey === cacheKey) {
    return cachedManifest;
  }

  const manifestPath = getManifestPath(folder);
  const raw = await downloadTextFile(manifestPath);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.photos)) {
      return null;
    }

    parsed.photos = sortPhotosNewestFirst(parsed.photos);
    cachedManifest = parsed;
    cachedManifestKey = cacheKey;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeManifest(folder, manifest) {
  const manifestPath = getManifestPath(folder);
  const payload = {
    version: PHOTOS_MANIFEST_VERSION,
    updatedAt: new Date().toISOString(),
    photos: sortPhotosNewestFirst(manifest.photos || []),
  };

  await uploadTextFile(manifestPath, JSON.stringify(payload, null, 2));
  cachedManifest = payload;
  cachedManifestKey = folder;
  return payload;
}

export function invalidateManifestCache() {
  cachedManifest = null;
  cachedManifestKey = "";
}

export async function addPhotoToManifest(folder, entry) {
  const manifest = (await readManifest(folder)) || createEmptyManifest();
  const withoutDuplicate = manifest.photos.filter(
    (photo) => photo.path_lower !== entry.path_lower
  );
  manifest.photos = sortPhotosNewestFirst([entry, ...withoutDuplicate]);
  return writeManifest(folder, manifest);
}

async function loadLegacyMetadata(pathLower) {
  try {
    const raw = await downloadTextFile(`${pathLower}.metadata.json`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function listImageEntries(folder) {
  const response = await dropboxApiFetch(`${API_BASE_URL}/files/list_folder`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: folder,
      recursive: false,
      include_deleted: false,
    }),
  });

  if (response.status === 409) {
    const errorText = await response.text();
    if (errorText.includes("path/not_found")) {
      return [];
    }
  }

  if (!response.ok) {
    throw new Error(`list_folder fallito: ${await response.text()}`);
  }

  const data = await response.json();
  return (data.entries || []).filter(
    (entry) =>
      entry[".tag"] === "file" &&
      isImageFile(entry.name) &&
      entry.name !== PHOTOS_MANIFEST_FILENAME &&
      !entry.name.endsWith(".metadata.json")
  );
}

function manifestMatchesFolder(manifest, folderEntries) {
  const manifestPaths = new Set(
    (manifest?.photos || []).map((photo) => photo.path_lower)
  );
  const folderPaths = new Set(folderEntries.map((entry) => entry.path_lower));

  if (manifestPaths.size !== folderPaths.size) return false;

  for (const path of folderPaths) {
    if (!manifestPaths.has(path)) return false;
  }

  return true;
}

async function entriesToManifestPhotos(entries) {
  return Promise.all(
    entries.map(async (entry) => {
      const legacy = await loadLegacyMetadata(entry.path_lower);
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
}

export async function buildManifestFromFolder(folder = getDropboxFolder()) {
  const entries = await listImageEntries(folder);
  const photos = await entriesToManifestPhotos(entries);
  return writeManifest(folder, { photos });
}

/**
 * Sincronizza il manifest con i file reali in cartella.
 * Non sovrascrive mai un manifest con foto se list_folder torna vuoto
 * (evita di azzerare tutto per un errore API / token).
 */
export async function reconcileManifest(
  folder = getDropboxFolder(),
  { force = false } = {}
) {
  if (force) {
    invalidateManifestCache();
  }

  let existing = null;
  try {
    // Sempre da Dropbox, non dalla cache in-memory (può essere uno stato vuoto stale)
    if (force || cachedManifest) {
      invalidateManifestCache();
    }
    existing = await readManifest(folder);
  } catch (error) {
    console.warn("Impossibile leggere photos-manifest.json:", error);
  }

  let folderEntries;
  try {
    folderEntries = await listImageEntries(folder);
  } catch (error) {
    console.warn("list_folder fallita, uso il manifest esistente:", error);
    if (existing) return existing;
    throw error;
  }

  const manifestCount = existing?.photos?.length ?? 0;

  // Protezione: non cancellare un manifest pieno se la listing è vuota
  if (folderEntries.length === 0 && manifestCount > 0) {
    console.warn(
      `list_folder vuota ma manifest ha ${manifestCount} foto: tengo il manifest`
    );
    return existing;
  }

  if (!force && existing && manifestMatchesFolder(existing, folderEntries)) {
    return existing;
  }

  invalidateManifestCache();
  const photos = await entriesToManifestPhotos(folderEntries);
  return writeManifest(folder, { photos });
}

export async function ensureManifest(folder = getDropboxFolder()) {
  return reconcileManifest(folder);
}

export async function getPaginatedPhotos(
  folder = getDropboxFolder(),
  limit = 20,
  offset = 0,
  { refresh = false } = {}
) {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const safeOffset = Math.max(0, offset);

  try {
    const manifest = await reconcileManifest(folder, { force: refresh });
    const totalCount = manifest.photos.length;
    const entries = manifest.photos.slice(safeOffset, safeOffset + safeLimit);

    return {
      entries,
      totalCount,
      hasMore: safeOffset + safeLimit < totalCount,
      source: "manifest",
    };
  } catch (error) {
    // Ultimo fallback: prova solo il download del manifest
    invalidateManifestCache();
    const existing = await readManifest(folder);
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
