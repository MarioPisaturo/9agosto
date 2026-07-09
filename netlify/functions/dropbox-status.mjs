import {
  API_BASE_URL,
  corsHeaders,
  dropboxApiFetch,
  getDropboxAuthMode,
  jsonResponse,
} from "./_dropbox.mjs";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { error: "Metodo non consentito" });
  }

  try {
    const authMode = getDropboxAuthMode();
    const response = await dropboxApiFetch(`${API_BASE_URL}/check/user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: "{}",
    });

    if (!response.ok) {
      const errorText = await response.text();
      return jsonResponse(response.status, {
        isValid: false,
        authMode,
        error: errorText,
      });
    }

    return jsonResponse(200, { isValid: true, authMode });
  } catch (error) {
    return jsonResponse(500, {
      isValid: false,
      error: error instanceof Error ? error.message : "Errore sconosciuto",
    });
  }
}
