const API_BASE_URL = "https://api.dropboxapi.com/2";
const CONTENT_API_URL = "https://content.dropboxapi.com/2";

export function getDropboxConfig() {
  const token = process.env.DROPBOX_ACCESS_TOKEN;
  const folder = process.env.DROPBOX_FOLDER || "/wedding-photos";

  if (!token) {
    throw new Error("DROPBOX_ACCESS_TOKEN non configurato su Netlify");
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

export async function ensureFolder(token, folder) {
  const response = await fetch(`${API_BASE_URL}/files/create_folder_v2`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path: folder, autorename: false }),
  });

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
