// Configurazione Dropbox
export const DROPBOX_CONFIG = {
  APP_KEY: (import.meta.env.VITE_DROPBOX_APP_KEY || "").trim(),
  ACCESS_TOKEN: (import.meta.env.VITE_DROPBOX_ACCESS_TOKEN || "").trim(),
  FOLDER:
    (import.meta.env.VITE_DROPBOX_FOLDER || "/wedding-photos").trim(),
  MAX_FILE_SIZE_MB: 150,
  MAX_FILE_SIZE_BYTES: 150 * 1024 * 1024,
  SUPPORTED_FORMATS: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ],
  REDIRECT_URI:
    import.meta.env.VITE_DROPBOX_REDIRECT_URI ||
    (typeof window !== "undefined"
      ? window.location.origin + "/auth/dropbox"
      : ""),
};
