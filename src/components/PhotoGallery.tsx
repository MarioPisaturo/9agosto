import React, { useEffect, useRef, useCallback, useState } from "react";
import type { Photo } from "../types/";
import { formatItalyPhotoTimestamp } from "../utils/dateTime";
import { createFullscreenLink } from "../utils/fullscreenUtils";
import DropboxImage from "./DropboxImage";
import PhotoLightbox from "./PhotoLightbox";
import "../styles/PhotoGallery.scss";
import "../styles/DropboxImage.scss";

interface PhotoGalleryProps {
  photos: Photo[];
  hasMorePhotos: boolean;
  isLoadingPhotos: boolean;
  isLoadingMore: boolean;
  totalCount: number;
  onLoadMore: () => void;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos,
  hasMorePhotos,
  isLoadingPhotos,
  isLoadingMore,
  totalCount,
  onLoadMore,
}) => {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMorePhotos && !isLoadingMore) {
        onLoadMore();
      }
    },
    [hasMorePhotos, isLoadingMore, onLoadMore]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: "200px",
      threshold: 0.1,
    });

    const currentLoadMoreRef = loadMoreRef.current;
    if (currentLoadMoreRef) {
      observer.observe(currentLoadMoreRef);
    }

    return () => {
      if (currentLoadMoreRef) {
        observer.unobserve(currentLoadMoreRef);
      }
    };
  }, [handleIntersection]);

  if (isLoadingPhotos) {
    return (
      <div className="photo-gallery-container">
        <div className="gallery-header">
          <h2>Galleria Matrimonio</h2>
          <p>Stiamo caricando le foto del nostro giorno speciale...</p>
        </div>
        <div className="empty-gallery loading-gallery">
          <div className="spinner"></div>
          <p>Caricando le foto...</p>
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="photo-gallery-container">
        <div className="gallery-header">
          <h2>Galleria Matrimonio</h2>
          <p>Le foto del nostro giorno speciale appariranno qui</p>
        </div>
        <div className="empty-gallery">
          <div className="empty-icon">💒</div>
          <p>Ancora nessuna foto caricata</p>
        </div>
      </div>
    );
  }

  return (
    <div className="photo-gallery-container">
      <div className="gallery-header">
        <h2>Galleria Matrimonio</h2>
        <p>
          I momenti più belli del nostro giorno speciale ({photos.length}
          {totalCount > photos.length ? ` di ${totalCount}` : ""} foto)
        </p>
        <div className="gallery-actions">
          <button
            className="fullscreen-link-btn"
            onClick={() => {
              const fullscreenUrl = createFullscreenLink(undefined, "/stories");
              navigator.clipboard
                .writeText(fullscreenUrl)
                .then(() => {
                  alert(
                    "🎉 Link per visualizzazione fullscreen copiato negli appunti!"
                  );
                })
                .catch(() => {
                  const textArea = document.createElement("textarea");
                  textArea.value = fullscreenUrl;
                  document.body.appendChild(textArea);
                  textArea.select();
                  document.execCommand("copy");
                  document.body.removeChild(textArea);
                  alert("🎉 Link per visualizzazione fullscreen copiato!");
                });
            }}
            title="Copia link per aprire direttamente in modalità fullscreen"
          >
            🔗 Condividi Fullscreen
          </button>
        </div>
        {hasMorePhotos && (
          <small className="gallery-info">
            ✨ Scorri in basso per vedere altre foto
          </small>
        )}
      </div>

      <div className="gallery-grid">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className={`gallery-item item-${(index % 4) + 1}`}
            onClick={() => setLightboxIndex(index)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setLightboxIndex(index);
              }
            }}
          >
            {photo.publicId ? (
              <DropboxImage
                filePath={photo.publicId}
                alt={`Wedding photo ${index + 1}`}
                loading="lazy"
                variant="thumb"
                style={{ cursor: "pointer" }}
              />
            ) : (
              <img
                src={photo.url}
                alt={`Wedding photo ${index + 1}`}
                loading="lazy"
                style={{ cursor: "pointer" }}
              />
            )}
            <div className="photo-overlay">
              <div className="photo-meta">
                <span className="photo-time">
                  {formatItalyPhotoTimestamp(photo.timestamp)}
                </span>
                {photo.uploadedBy && (
                  <span className="photo-author">📸 {photo.uploadedBy}</span>
                )}
                {photo.description && (
                  <span className="photo-description">
                    💬 {photo.description}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasMorePhotos && (
        <>
          <div ref={loadMoreRef} className="auto-load-trigger" />

          <div className="load-more-section">
            {isLoadingMore ? (
              <div className="loading-indicator">
                <div className="spinner"></div>
                <p>Caricando altre foto...</p>
                <small>Caricamento automatico attivo</small>
              </div>
            ) : (
              <button
                className="load-more-btn manual"
                onClick={onLoadMore}
                disabled={isLoadingMore}
              >
                <span className="btn-icon">📸</span>
                Carica altre foto ({totalCount - photos.length} rimanenti)
              </button>
            )}
          </div>
        </>
      )}

      {!hasMorePhotos && photos.length > 100 && (
        <div className="all-loaded-section">
          <p>🎉 Hai visto tutte le {photos.length} foto!</p>
          <small>
            Torna più tardi per vedere se sono state aggiunte nuove foto
          </small>
        </div>
      )}

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          activeIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChangeIndex={setLightboxIndex}
        />
      )}
    </div>
  );
};

export default PhotoGallery;
