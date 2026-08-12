import React, { useEffect, useCallback } from "react";
import type { Photo } from "../types";
import { formatItalyPhotoTimestamp } from "../utils/dateTime";
import DropboxImage from "./DropboxImage";
import "../styles/PhotoLightbox.scss";

interface PhotoLightboxProps {
  photos: Photo[];
  activeIndex: number;
  onClose: () => void;
  onChangeIndex: (index: number) => void;
}

const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  photos,
  activeIndex,
  onClose,
  onChangeIndex,
}) => {
  const photo = photos[activeIndex];
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < photos.length - 1;

  const goPrev = useCallback(() => {
    if (activeIndex > 0) onChangeIndex(activeIndex - 1);
  }, [activeIndex, onChangeIndex]);

  const goNext = useCallback(() => {
    if (activeIndex < photos.length - 1) onChangeIndex(activeIndex + 1);
  }, [activeIndex, photos.length, onChangeIndex]);

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
        </div>

        {hasNext && (
          <button
            type="button"
            className="photo-lightbox__nav photo-lightbox__nav--next"
            onClick={goNext}
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
          {activeIndex + 1} / {photos.length}
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
