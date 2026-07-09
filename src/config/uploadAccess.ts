/**
 * Configurazione accesso al tab Carica (QR / query string).
 *
 * Tutto è pilotato da variabili VITE_* in .env (e su Netlify in produzione).
 *
 * | Variabile                      | Default     | Descrizione |
 * |--------------------------------|-------------|-------------|
 * | VITE_UPLOAD_ACCESS_ENABLED     | false       | true = solo chi ha il QR può caricare |
 * | VITE_UPLOAD_ACCESS_PARAM       | upload_key  | Nome parametro in URL (?upload_key=…) |
 * | VITE_UPLOAD_ACCESS_TOKEN       | (vuoto)     | Token principale nel QR |
 * | VITE_UPLOAD_ACCESS_TOKENS      | (vuoto)     | Token extra, separati da virgola |
 * | VITE_UPLOAD_DEBUG_WILDCARD     | (vuoto)     | Valore debug (es. debug). "*" = qualsiasi |
 * | VITE_UPLOAD_STRIP_PARAM        | true        | Rimuove il parametro dall'URL dopo l'accesso |
 * | VITE_UPLOAD_OPEN_IN_DEV        | false       | true = in npm run dev tutti possono caricare |
 *
 * Esempio QR: https://tuodominio.it/?upload_key=IL_TUO_TOKEN
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

function parseTokenList(...values: Array<string | undefined>): string[] {
  const tokens = new Set<string>();

  for (const value of values) {
    if (!value?.trim()) continue;

    for (const token of value.split(",")) {
      const trimmed = token.trim();
      if (trimmed) {
        tokens.add(trimmed);
      }
    }
  }

  return [...tokens];
}

export interface UploadAccessConfig {
  /** Se false, il tab Carica è visibile a tutti */
  enabled: boolean;
  /** Nome del query param (es. upload_key) */
  paramName: string;
  /** Token accettati dal QR / link */
  allowedTokens: string[];
  /** Valore debug; null = disabilitato; "*" = accetta qualsiasi valore */
  debugWildcard: string | null;
  /** Rimuove ?param=… dall'URL dopo aver concesso l'accesso */
  stripParamFromUrl: boolean;
  /** In sviluppo locale, bypassa il controllo */
  openInDev: boolean;
  /** Chiave sessionStorage per la sessione corrente */
  sessionKey: string;
}

export function getUploadAccessConfig(): UploadAccessConfig {
  const primaryToken = (import.meta.env.VITE_UPLOAD_ACCESS_TOKEN || "").trim();
  const extraTokens = parseTokenList(
    import.meta.env.VITE_UPLOAD_ACCESS_TOKENS
  );

  const debugRaw = (import.meta.env.VITE_UPLOAD_DEBUG_WILDCARD || "").trim();

  return {
    enabled: parseBool(import.meta.env.VITE_UPLOAD_ACCESS_ENABLED, false),
    paramName: (
      import.meta.env.VITE_UPLOAD_ACCESS_PARAM || "upload_key"
    ).trim(),
    allowedTokens: parseTokenList(primaryToken, ...extraTokens),
    debugWildcard: debugRaw || null,
    stripParamFromUrl: parseBool(
      import.meta.env.VITE_UPLOAD_STRIP_PARAM,
      true
    ),
    openInDev: parseBool(import.meta.env.VITE_UPLOAD_OPEN_IN_DEV, false),
    sessionKey: "wedding_upload_access_granted",
  };
}

/** Config risolta una volta all'avvio (le env Vite sono statiche). */
export const UPLOAD_ACCESS_CONFIG = getUploadAccessConfig();
