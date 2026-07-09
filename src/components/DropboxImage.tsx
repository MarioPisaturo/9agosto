import React, { useEffect, useState, useRef } from "react";
import { DropboxService } from "../services/dropboxService";
import { GALLERY_IMAGE_PRELOAD_MARGIN } from "../config/gallery";

interface DropboxImageProps {
  filePath: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  /** lazy = scarica solo quando visibile; eager = subito (es. foto corrente in Stories) */
  loading?: "lazy" | "eager";
  variant?: "full" | "display" | "thumb";
  onLoadComplete?: () => void;
  onLoadStart?: () => void;
}

function readCachedSrc(
  filePath: string,
  variant: "full" | "display" | "thumb"
): string {
  return DropboxService.getCachedImageBlobUrl(filePath, { variant }) ?? "";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(loading === "eager");
  const [imageSrc, setImageSrc] = useState(() => readCachedSrc(filePath, variant));
  const [isLoading, setIsLoading] = useState(
    () => loading === "eager" && !readCachedSrc(filePath, variant)
  );
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (loading === "eager") {
      setShouldLoad(true);
      return;
    }

    setShouldLoad(false);
    setImageSrc("");
    setIsLoading(false);
    setError("");

    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { root: null, rootMargin: GALLERY_IMAGE_PRELOAD_MARGIN, threshold: 0.01 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [filePath, loading]);

  useEffect(() => {
    if (!shouldLoad || !filePath) return;

    let isMounted = true;

    const loadImage = async () => {
      const cachedUrl = readCachedSrc(filePath, variant);
      if (cachedUrl) {
        if (isMounted) {
          setImageSrc(cachedUrl);
          setIsLoading(false);
          setError("");
          onLoadComplete?.();
        }
        return;
      }

      try {
        if (isMounted) {
          setImageSrc("");
          setIsLoading(true);
          setError("");
          onLoadStart?.();
        }

        const blobUrl = await DropboxService.getImageBlob(filePath, { variant });

        if (!isMounted) return;

        if (blobUrl) {
          setImageSrc(blobUrl);
          onLoadComplete?.();
        } else {
          setError("Impossibile caricare l'immagine");
        }
        setIsLoading(false);
      } catch (err) {
        if (isMounted) {
          setError("Errore nel caricamento dell'immagine");
          setIsLoading(false);
        }
        console.error("Errore nel caricamento dell'immagine:", err);
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [shouldLoad, filePath, variant, onLoadComplete, onLoadStart]);

  const placeholderStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
    minHeight: "200px",
    width: "100%",
    height: "100%",
    ...style,
  };

  if (!shouldLoad) {
    return (
      <div
        ref={containerRef}
        className={`dropbox-image-placeholder ${className || ""}`}
        style={placeholderStyle}
        aria-hidden="true"
      />
    );
  }

  if (isLoading && !imageSrc) {
    return (
      <div
        ref={containerRef}
        className={`dropbox-image-loading ${className || ""}`}
        style={placeholderStyle}
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

  if (error && !imageSrc) {
    return (
      <div
        ref={containerRef}
        className={`dropbox-image-error ${className || ""}`}
        style={{
          ...placeholderStyle,
          backgroundColor: "#ffe6e6",
          color: "#d63031",
          border: "2px dashed #d63031",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "14px" }}>❌ {error}</p>
        </div>
      </div>
    );
  }

  if (!imageSrc) {
    return null;
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
