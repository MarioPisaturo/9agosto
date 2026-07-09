import {
  CONTENT_API_URL,
  corsHeaders,
  dropboxApiFetch,
} from "./_dropbox.mjs";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: "Metodo non consentito",
    };
  }

  try {
    const path = event.queryStringParameters?.path;

    if (!path) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: "Parametro path mancante",
      };
    }

    const response = await dropboxApiFetch(`${CONTENT_API_URL}/files/download`, {
      method: "POST",
      headers: {
        "Dropbox-API-Arg": JSON.stringify({ path }),
      },
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: corsHeaders(),
        body: await response.text(),
      };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType =
      response.headers.get("content-type") || "application/octet-stream";

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders(),
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
      body: buffer.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: error instanceof Error ? error.message : "Errore sconosciuto",
    };
  }
}
