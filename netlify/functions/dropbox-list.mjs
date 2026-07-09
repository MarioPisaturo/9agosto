import {
  API_BASE_URL,
  corsHeaders,
  getDropboxConfig,
  jsonResponse,
} from "./_dropbox.mjs";

const SUPPORTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { error: "Metodo non consentito" });
  }

  try {
    const { token, folder } = getDropboxConfig();
    const response = await fetch(`${API_BASE_URL}/files/list_folder`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: folder,
        recursive: false,
        include_media_info: true,
        include_deleted: false,
      }),
    });

    if (response.status === 409) {
      const errorText = await response.text();
      if (errorText.includes("path/not_found")) {
        return jsonResponse(200, { entries: [] });
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      return jsonResponse(response.status, { error: errorText });
    }

    const data = await response.json();
    const entries = (data.entries || []).filter(
      (entry) =>
        entry[".tag"] === "file" &&
        SUPPORTED_EXTENSIONS.some((ext) =>
          entry.name.toLowerCase().endsWith(ext)
        )
    );

    return jsonResponse(200, { entries });
  } catch (error) {
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : "Errore sconosciuto",
    });
  }
}
