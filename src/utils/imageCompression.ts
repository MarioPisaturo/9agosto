/**
 * Utility per la compressione automatica delle immagini
 * Ridimensiona e comprime le immagini per ottimizzare le dimensioni del file
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
}

interface CompressionResult {
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/**
 * Comprime un'immagine riducendone dimensioni e qualità
 */
export const compressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> => {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    maxSizeKB = 800,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Impossibile creare il context del canvas"));
      return;
    }

    img.onload = () => {
      // Calcola le nuove dimensioni mantenendo le proporzioni
      const { width: newWidth, height: newHeight } = calculateDimensions(
        img.width,
        img.height,
        maxWidth,
        maxHeight
      );

      // Imposta le dimensioni del canvas
      canvas.width = newWidth;
      canvas.height = newHeight;

      // Disegna l'immagine ridimensionata
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Inizia con la qualità specificata
      let currentQuality = quality;
      let attempts = 0;
      const maxAttempts = 5;

      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Errore nella compressione dell'immagine"));
              return;
            }

            const compressedSizeKB = blob.size / 1024;

            // Se la dimensione è accettabile o abbiamo fatto troppi tentativi
            if (compressedSizeKB <= maxSizeKB || attempts >= maxAttempts) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });

              const result: CompressionResult = {
                compressedFile,
                originalSize: file.size,
                compressedSize: blob.size,
                compressionRatio: Math.round((1 - blob.size / file.size) * 100),
              };

              resolve(result);
            } else {
              // Riduci ulteriormente la qualità e riprova
              currentQuality *= 0.8;
              attempts++;
              tryCompress();
            }
          },
          file.type,
          currentQuality
        );
      };

      tryCompress();
    };

    img.onerror = () => {
      reject(new Error("Errore nel caricamento dell'immagine"));
    };

    // Carica l'immagine
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Calcola le nuove dimensioni mantenendo le proporzioni
 */
const calculateDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  let { width, height } = { width: originalWidth, height: originalHeight };

  // Se l'immagine è più grande dei limiti, ridimensiona
  if (width > maxWidth || height > maxHeight) {
    const aspectRatio = width / height;

    if (width > height) {
      width = Math.min(width, maxWidth);
      height = width / aspectRatio;
    } else {
      height = Math.min(height, maxHeight);
      width = height * aspectRatio;
    }

    // Assicurati che entrambe le dimensioni rispettino i limiti
    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
};

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
