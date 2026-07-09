/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_UPLOAD_ACCESS_ENABLED?: string;
  readonly VITE_UPLOAD_ACCESS_PARAM?: string;
  readonly VITE_UPLOAD_ACCESS_TOKEN?: string;
  readonly VITE_UPLOAD_ACCESS_TOKENS?: string;
  readonly VITE_UPLOAD_DEBUG_WILDCARD?: string;
  readonly VITE_UPLOAD_STRIP_PARAM?: string;
  readonly VITE_UPLOAD_OPEN_IN_DEV?: string;
  readonly VITE_UPLOAD_GALLERY_ENABLED?: string;
  readonly VITE_COUNTDOWN_DEBUG_ENABLED?: string;
  readonly VITE_COUNTDOWN_DEBUG_PHASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
