import React, { useEffect, useCallback, useRef } from "react";
import type { Photo } from "../types";
import { formatItalyPhotoTimestamp } from "../utils/dateTime";
import DropboxImage from "./DropboxImage";
import "../styles/PhotoLightbox.scss";

interface PhotoLightboxProps {
  photos: Photo[];
  activeIndex: number;
  hasMorePhotos?: boolean;
  isLoadingMore?: boolean;
  totalCount?: number;
  onClose: () => void;
  onChangeIndex: (index: number) => void;
  onLoadMore?: () => void;
}

const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  photos,
  activeIndex,
  hasMorePhotos = false,
  isLoadingMore = false,
  totalCount,
  onClose,
  onChangeIndex,
  onLoadMore,
}) => {
  const photo = photos[activeIndex];
  const hasPrev = activeIndex > 0;
  const canGoNextInMemory = activeIndex < photos.length - 1;
  const canLoadMoreNext = !canGoNextInMemory && hasMorePhotos;
  const showNext = canGoNextInMemory || canLoadMoreNext;
  const pendingAdvanceRef = useRef(false);
  const photosLengthRef = useRef(photos.length);

  const goPrev = useCallback(() => {
    pendingAdvanceRef.current = false;
    if (activeIndex > 0) onChangeIndex(activeIndex - 1);
  }, [activeIndex, onChangeIndex]);

  const goNext = useCallback(() => {
    if (activeIndex < photos.length - 1) {
      pendingAdvanceRef.current = false;
      onChangeIndex(activeIndex + 1);
      return;
    }

    if (hasMorePhotos && onLoadMore && !isLoadingMore) {
      pendingAdvanceRef.current = true;
      onLoadMore();
    }
  }, [
    activeIndex,
    photos.length,
    hasMorePhotos,
    isLoadingMore,
    onChangeIndex,
    onLoadMore,
  ]);

  // Dopo il load-more, avanza alla nuova foto
  useEffect(() => {
    const previousLength = photosLengthRef.current;
    photosLengthRef.current = photos.length;

    if (
      pendingAdvanceRef.current &&
      photos.length > previousLength &&
      activeIndex === previousLength - 1
    ) {
      pendingAdvanceRef.current = false;
      onChangeIndex(activeIndex + 1);
    }
  }, [photos.length, activeIndex, onChangeIndex]);

  // Se il load fallisce / non ci sono più foto, resetta il pending
  useEffect(() => {
    if (
      pendingAdvanceRef.current &&
      !isLoadingMore &&
      !hasMorePhotos &&
      activeIndex >= photos.length - 1
    ) {
      pendingAdvanceRef.current = false;
    }
  }, [isLoadingMore, hasMorePhotos, activeIndex, photos.length]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") goPrev();
      if (event.key === "ArrowRight") goNext();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, goPrev, goNext]);

  if (!photo) return null;

  const displayTotal =
    typeof totalCount === "number" && totalCount > photos.length
      ? totalCount
      : photos.length;

  return (
    <div
      className="photo-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Foto a schermo intero"
      onClick={onClose}
    >
      <button
        type="button"
        className="photo-lightbox__close"
        onClick={onClose}
        aria-label="Chiudi"
      >
        ✕
      </button>

      <div
        className="photo-lightbox__stage"
        onClick={(event) => event.stopPropagation()}
      >
        {hasPrev && (
          <button
            type="button"
            className="photo-lightbox__nav photo-lightbox__nav--prev"
            onClick={goPrev}
            aria-label="Foto precedente"
          >
            ←
          </button>
        )}

        <div className="photo-lightbox__image-wrap">
          {photo.publicId ? (
            <DropboxImage
              filePath={photo.publicId}
              alt={`Foto ${activeIndex + 1}`}
              className="photo-lightbox__image"
              loading="eager"
              variant="display"
            />
          ) : (
            <img
              src={photo.url}
              alt={`Foto ${activeIndex + 1}`}
              className="photo-lightbox__image"
            />
          )}

          {isLoadingMore && canLoadMoreNext && (
            <div className="photo-lightbox__loading-more" aria-live="polite">
              <div className="photo-lightbox__spinner" />
              <span>Caricando altre foto...</span>
            </div>
          )}
        </div>

        {showNext && (
          <button
            type="button"
            className="photo-lightbox__nav photo-lightbox__nav--next"
            onClick={goNext}
            disabled={isLoadingMore && canLoadMoreNext}
            aria-label="Foto successiva"
          >
            →
          </button>
        )}
      </div>

      <div
        className="photo-lightbox__meta"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="photo-lightbox__counter">
          {activeIndex + 1} / {displayTotal}
          {hasMorePhotos && displayTotal === photos.length ? "+" : ""}
        </span>
        <span className="photo-lightbox__time">
          {formatItalyPhotoTimestamp(photo.timestamp)}
        </span>
        {photo.uploadedBy && (
          <span className="photo-lightbox__author">📸 {photo.uploadedBy}</span>
        )}
        {photo.description && (
          <span className="photo-lightbox__description">
            {photo.description}
          </span>
        )}
      </div>
    </div>
  );
};

export default PhotoLightbox;
