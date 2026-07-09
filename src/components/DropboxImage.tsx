import React, { useEffect, useState, useRef } from "react";
import { DropboxService } from "../services/dropboxService";

interface DropboxImageProps {
  filePath: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  loading?: "lazy" | "eager";
  variant?: "full" | "display" | "thumb";
  onLoadComplete?: () => void;
  onLoadStart?: () => void;
}

const DropboxImage: React.FC<DropboxImageProps> = ({
  filePath,
  alt,
  className,
  style,
  onClick,
  loading = "lazy",
  variant = "display",
  onLoadComplete,
  onLoadStart,
}) => {
  const [imageSrc, setImageSrc] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const currentBlobUrlRef = useRef<string>("");

  useEffect(() => {
    let isMounted = true;

    const loadImage = async () => {
      try {
        setIsLoading(true);
        setError("");
        onLoadStart?.();

        console.log(`🖼️ Loading image: ${filePath} (${variant})`);
        const blobUrl = await DropboxService.getImageBlob(filePath, { variant });

        if (isMounted) {
          if (blobUrl) {
            // NON revocare il precedente blob URL - è gestito dalla cache
            currentBlobUrlRef.current = blobUrl;
            setImageSrc(blobUrl);
            console.log(`✅ Image loaded: ${filePath}`);
            onLoadComplete?.();
          } else {
            setError("Impossibile caricare l'immagine");
          }
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError("Errore nel caricamento dell'immagine");
          setIsLoading(false);
        }
        console.error("Errore nel caricamento dell'immagine:", err);
      }
    };

    if (filePath) {
      loadImage();
    }

    // Cleanup: NON revocare il blob URL qui perché potrebbe essere condiviso
    // La cache nel DropboxService si occuperà della pulizia quando necessario
    return () => {
      isMounted = false;
      // Non revocare il blob URL qui - è gestito dalla cache globale
    };
  }, [filePath, variant, onLoadComplete, onLoadStart]);

  if (isLoading) {
    return (
      <div
        className={`dropbox-image-loading ${className || ""}`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f0f0f0",
          minHeight: "200px",
          ...style,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "4px solid #f3f3f3",
              borderTop: "4px solid #3498db",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 10px",
            }}
          />
          <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
            Caricando...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`dropbox-image-error ${className || ""}`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffe6e6",
          color: "#d63031",
          minHeight: "200px",
          border: "2px dashed #d63031",
          ...style,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "14px" }}>❌ {error}</p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      style={style}
      onClick={onClick}
      loading={loading}
    />
  );
};

export default DropboxImage;
