export const PHOTOS_MANIFEST_VERSION = 1;
export const PHOTOS_MANIFEST_FILENAME = "photos-manifest.json";

export interface PhotoManifestEntry {
  path_lower: string;
  path_display: string;
  name: string;
  size: number;
  server_modified: string;
  content_hash?: string;
  description?: string;
  uploadedBy?: string;
  uploadedAt?: string;
}

export interface PhotosManifest {
  version: typeof PHOTOS_MANIFEST_VERSION;
  updatedAt: string;
  photos: PhotoManifestEntry[];
}

export interface PaginatedPhotosResult {
  entries: PhotoManifestEntry[];
  totalCount: number;
  hasMore: boolean;
  source: "manifest" | "list_folder";
}
