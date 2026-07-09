import {
  UPLOAD_ACCESS_CONFIG,
  getUploadAccessConfig,
  type UploadAccessConfig,
} from "../config/uploadAccess";

function getConfig(): UploadAccessConfig {
  return UPLOAD_ACCESS_CONFIG;
}

/** La protezione upload è attiva e va applicata? */
export function isUploadAccessRequired(): boolean {
  const config = getConfig();

  if (!config.enabled) {
    return false;
  }

  if (config.openInDev && import.meta.env.DEV) {
    return false;
  }

  return true;
}

export function hasUploadAccess(): boolean {
  if (!isUploadAccessRequired()) {
    return true;
  }

  try {
    return (
      sessionStorage.getItem(getConfig().sessionKey) === "granted"
    );
  } catch {
    return false;
  }
}

export function grantUploadAccess(): void {
  if (!isUploadAccessRequired()) {
    return;
  }

  try {
    sessionStorage.setItem(getConfig().sessionKey, "granted");
  } catch {
    // sessionStorage non disponibile
  }
}

export function isValidUploadToken(token: string): boolean {
  if (!isUploadAccessRequired()) {
    return true;
  }

  const value = token.trim();
  if (!value) return false;

  const { allowedTokens, debugWildcard } = getConfig();

  if (debugWildcard === "*") {
    return true;
  }

  if (debugWildcard && value === debugWildcard) {
    return true;
  }

  return allowedTokens.includes(value);
}

export function readUploadTokenFromSearch(search: string): string | null {
  const { paramName } = getConfig();
  const params = new URLSearchParams(search);
  return params.get(paramName);
}

export function shouldStripUploadParamFromUrl(): boolean {
  const config = getConfig();
  return isUploadAccessRequired() && config.stripParamFromUrl;
}

export function stripUploadParamFromSearch(search: string): string {
  const { paramName } = getConfig();
  const params = new URLSearchParams(search);
  params.delete(paramName);
  const next = params.toString();
  return next ? `?${next}` : "";
}

/**
 * Controlla subito URL + sessione (sync, prima del primo paint).
 */
export function resolveUploadAccessFromUrl(): boolean {
  if (!isUploadAccessRequired()) {
    return true;
  }

  const token = readUploadTokenFromSearch(window.location.search);
  if (token && isValidUploadToken(token)) {
    grantUploadAccess();
    return true;
  }

  return hasUploadAccess();
}

/** Utile in dev per ispezionare la config attiva */
export function getUploadAccessDebugInfo() {
  const config = getUploadAccessConfig();
  return {
    required: isUploadAccessRequired(),
    canUpload: hasUploadAccess(),
    enabled: config.enabled,
    openInDev: config.openInDev,
    paramName: config.paramName,
    allowedTokenCount: config.allowedTokens.length,
    hasDebugWildcard: !!config.debugWildcard,
    stripParamFromUrl: config.stripParamFromUrl,
  };
}
