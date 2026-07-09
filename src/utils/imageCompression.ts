/**
 * Utility per la compressione delle immagini
 * Usata in upload (storage) e in visualizzazione (galleria)
 */

import imageCompression from "browser-image-compression";

export const UPLOAD_COMPRESSION = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 1920,
  quality: 0.82,
  skipBelowBytes: 400 * 1024,
} as const;

export const DISPLAY_COMPRESSION = {
  maxSizeMB: 0.4,
  maxWidthOrHeight: 1200,
  quality: 0.78,
  skipBelowBytes: 250 * 1024,
} as const;

export const THUMB_COMPRESSION = {
  maxSizeMB: 0.15,
  maxWidthOrHeight: 600,
  quality: 0.72,
  skipBelowBytes: 150 * 1024,
} as const;

/**
 * Comprime un'immagine prima dell'upload su Dropbox
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (file.size <= UPLOAD_COMPRESSION.skipBelowBytes) {
    return file;
  }

  try {
    console.log("🗜️ Compressione upload...", {
      original: formatFileSize(file.size),
      fileName: file.name,
    });

    const compressed = await imageCompression(file, {
      maxSizeMB: UPLOAD_COMPRESSION.maxSizeMB,
      maxWidthOrHeight: UPLOAD_COMPRESSION.maxWidthOrHeight,
      useWebWorker: true,
      fileType: "image/jpeg",
      initialQuality: UPLOAD_COMPRESSION.quality,
    });

    const baseName = file.name.replace(/\.[^.]+$/, "");
    const outputName = `${baseName}.jpg`;

    const result =
      compressed.name === outputName
        ? compressed
        : new File([compressed], outputName, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });

    console.log("✅ Upload compresso", {
      original: formatFileSize(file.size),
      compressed: formatFileSize(result.size),
      reduction: `${Math.round((1 - result.size / file.size) * 100)}%`,
    });

    return result;
  } catch (error) {
    console.warn("⚠️ Compressione upload fallita, uso originale:", error);
    return file;
  }
}

/**
 * Riduce un blob per la visualizzazione in galleria/stories
 */
export async function compressBlobForDisplay(
  blob: Blob,
  variant: "display" | "thumb" = "display"
): Promise<Blob> {
  const config =
    variant === "thumb" ? THUMB_COMPRESSION : DISPLAY_COMPRESSION;

  if (blob.size <= config.skipBelowBytes) {
    return blob;
  }

  try {
    const file = new File([blob], "photo.jpg", {
      type: blob.type || "image/jpeg",
    });

    const compressed = await imageCompression(file, {
      maxSizeMB: config.maxSizeMB,
      maxWidthOrHeight: config.maxWidthOrHeight,
      useWebWorker: true,
      fileType: "image/jpeg",
      initialQuality: config.quality,
    });

    return compressed;
  } catch (error) {
    console.warn("⚠️ Compressione display fallita, uso originale:", error);
    return blob;
  }
}

/**
 * Verifica se un file è un'immagine supportata
 */
export const isImageFile = (file: File): boolean => {
  return (
    file.type.startsWith("image/") &&
    ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)
  );
};

/**
 * Formatta la dimensione del file in modo leggibile
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};
