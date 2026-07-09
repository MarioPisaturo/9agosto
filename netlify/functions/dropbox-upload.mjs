import {
  CONTENT_API_URL,
  corsHeaders,
  dropboxApiFetch,
  ensureFolder,
  getDropboxFolder,
  jsonResponse,
} from "./_dropbox.mjs";
import {
  addPhotoToManifest,
  invalidateManifestCache,
  manifestEntryFromUpload,
} from "./_manifest.mjs";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Metodo non consentito" });
  }

  try {
    const folder = getDropboxFolder();
    const payload = JSON.parse(event.body || "{}");
    const { fileName, fileBase64, description, uploadedBy } = payload;

    if (!fileName || !fileBase64) {
      return jsonResponse(400, {
        error: "fileName e fileBase64 sono obbligatori",
      });
    }

    await ensureFolder(folder);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safeName = `${timestamp}_${fileName}`;
    const filePath = `${folder}/${safeName}`;
    const fileBuffer = Buffer.from(fileBase64, "base64");

    const uploadResponse = await dropboxApiFetch(
      `${CONTENT_API_URL}/files/upload`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "Dropbox-API-Arg": JSON.stringify({
            path: filePath,
            mode: "add",
            autorename: true,
            mute: false,
          }),
        },
        body: fileBuffer,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      return jsonResponse(uploadResponse.status, { error: errorText });
    }

    const uploadedFile = await uploadResponse.json();

    const manifestEntry = manifestEntryFromUpload(uploadedFile, {
      description,
      uploadedBy,
      uploadedAt: new Date().toISOString(),
    });

    await addPhotoToManifest(folder, manifestEntry).catch((error) => {
      console.warn("Impossibile aggiornare photos-manifest.json:", error);
    });
    invalidateManifestCache();

    if (description || uploadedBy) {
      const metadata = {
        description,
        uploadedBy,
        uploadedAt: new Date().toISOString(),
      };
      const metadataPath = `${uploadedFile.path_lower}.metadata.json`;

      await dropboxApiFetch(`${CONTENT_API_URL}/files/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "Dropbox-API-Arg": JSON.stringify({
            path: metadataPath,
            mode: "overwrite",
            autorename: false,
            mute: true,
          }),
        },
        body: Buffer.from(JSON.stringify(metadata, null, 2)),
      }).catch(() => {});
    }

    return jsonResponse(200, uploadedFile);
  } catch (error) {
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : "Errore sconosciuto",
    });
  }
}
