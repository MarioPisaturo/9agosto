import {
  corsHeaders,
  getDropboxFolder,
  jsonResponse,
} from "./_dropbox.mjs";
import { getPaginatedPhotos } from "./_manifest.mjs";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { error: "Metodo non consentito" });
  }

  try {
    const folder = getDropboxFolder();
    const limit = Number.parseInt(event.queryStringParameters?.limit || "20", 10);
    const offset = Number.parseInt(
      event.queryStringParameters?.offset || "0",
      10
    );

    const result = await getPaginatedPhotos(folder, limit, offset);
    return jsonResponse(200, result);
  } catch (error) {
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : "Errore sconosciuto",
    });
  }
}
