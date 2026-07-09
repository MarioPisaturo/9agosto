/**
 * Opzioni UI del tab Carica.
 *
 * | Variabile                    | Default | Descrizione |
 * |------------------------------|---------|-------------|
 * | VITE_UPLOAD_GALLERY_ENABLED  | true    | false = nasconde galleria, solo fotocamera |
 */

function parseBool(
  value: string | undefined,
  defaultValue: boolean
): boolean {
  if (value === undefined || value.trim() === "") {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export const UPLOAD_UI_CONFIG = {
  /** Se false, resta solo il pulsante "Scatta Foto" */
  galleryEnabled: parseBool(import.meta.env.VITE_UPLOAD_GALLERY_ENABLED, true),
} as const;
