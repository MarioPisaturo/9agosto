const API_BASE_URL = "https://api.dropboxapi.com/2";
const CONTENT_API_URL = "https://content.dropboxapi.com/2";
const TOKEN_URL = "https://api.dropboxapi.com/oauth2/token";

/** Cache in-memory (riusata tra invocazioni warm della stessa function). */
let cachedAccessToken = null;
let cachedAccessTokenExpiresAt = 0;

export function getDropboxFolder() {
  return process.env.DROPBOX_FOLDER || "/wedding-photos";
}

function getRefreshCredentials() {
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN?.trim();
  const appKey = process.env.DROPBOX_APP_KEY?.trim();
  const appSecret = process.env.DROPBOX_APP_SECRET?.trim();

  if (refreshToken && appKey && appSecret) {
    return { refreshToken, appKey, appSecret };
  }

  return null;
}

function clearTokenCache() {
  cachedAccessToken = null;
  cachedAccessTokenExpiresAt = 0;
}

async function requestNewAccessToken() {
  const credentials = getRefreshCredentials();
  if (!credentials) {
    throw new Error(
      "DROPBOX_REFRESH_TOKEN, DROPBOX_APP_KEY e DROPBOX_APP_SECRET non configurati su Netlify"
    );
  }

  const { refreshToken, appKey, appSecret } = credentials;
  const basicAuth = Buffer.from(`${appKey}:${appSecret}`).toString("base64");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Refresh token Dropbox fallito: ${errorText}`);
  }

  const data = await response.json();
  const expiresIn = Number(data.expires_in) || 4 * 60 * 60;
  const safetyMarginMs = 5 * 60 * 1000;

  cachedAccessToken = data.access_token;
  cachedAccessTokenExpiresAt = Date.now() + expiresIn * 1000 - safetyMarginMs;

  return cachedAccessToken;
}

/**
 * Restituisce un access token valido.
 * Preferisce il refresh token (non scade); fallback su DROPBOX_ACCESS_TOKEN statico.
 */
export async function getDropboxAccessToken({ forceRefresh = false } = {}) {
  if (getRefreshCredentials()) {
    const now = Date.now();
    if (
      !forceRefresh &&
      cachedAccessToken &&
      cachedAccessTokenExpiresAt > now
    ) {
      return cachedAccessToken;
    }

    return requestNewAccessToken();
  }

  const staticToken = process.env.DROPBOX_ACCESS_TOKEN?.trim();
  if (staticToken) {
    return staticToken;
  }

  throw new Error(
    "Configura DROPBOX_REFRESH_TOKEN (+ APP_KEY/SECRET) oppure DROPBOX_ACCESS_TOKEN su Netlify"
  );
}

export function getDropboxAuthMode() {
  return getRefreshCredentials() ? "refresh" : "static";
}

/**
 * Esegue una richiesta API Dropbox con retry automatico su 401 se è configurato il refresh token.
 */
export async function dropboxApiFetch(url, options = {}) {
  const token = await getDropboxAccessToken();
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401 && getRefreshCredentials()) {
    clearTokenCache();
    const refreshedToken = await getDropboxAccessToken({ forceRefresh: true });
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${refreshedToken}`,
      },
    });
  }

  return response;
}

/** @deprecated Usa getDropboxFolder() e getDropboxAccessToken(). */
export function getDropboxConfig() {
  const folder = getDropboxFolder();
  const token = process.env.DROPBOX_ACCESS_TOKEN?.trim();

  if (!token && !getRefreshCredentials()) {
    throw new Error(
      "DROPBOX_REFRESH_TOKEN (+ APP_KEY/SECRET) o DROPBOX_ACCESS_TOKEN non configurato su Netlify"
    );
  }

  return { token, folder };
}

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

export function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

export async function ensureFolder(folder) {
  const response = await dropboxApiFetch(
    `${API_BASE_URL}/files/create_folder_v2`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path: folder, autorename: false }),
    }
  );

  if (response.ok) return;

  const errorText = await response.text();
  if (
    response.status === 409 &&
    (errorText.includes("path/conflict/folder") ||
      errorText.includes("path/conflict"))
  ) {
    return;
  }

  throw new Error(`Impossibile creare cartella Dropbox: ${errorText}`);
}

export { API_BASE_URL, CONTENT_API_URL };
