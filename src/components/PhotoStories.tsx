import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Photo } from "../types";
import { addFullscreenParam } from "../utils/fullscreenUtils";
import { useFullscreenRoute } from "../hooks/useFullscreenRoute";
import DropboxImage from "./DropboxImage";
import "../styles/PhotoStories.scss";
import "../styles/DropboxImage.scss";

interface PhotoStoriesProps {
  photos: Photo[];
}

const PhotoStories: React.FC<PhotoStoriesProps> = ({ photos }) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showFullscreenControls, setShowFullscreenControls] = useState(true);
  const [isCurrentPhotoLoading, setIsCurrentPhotoLoading] = useState(false);

  // Paginazione per le thumbnail
  const [thumbnailPage, setThumbnailPage] = useState(0);
  const THUMBNAILS_PER_PAGE = 20;

  // Callbacks per il caricamento delle foto
  const handlePhotoLoadStart = useCallback(
    () => setIsCurrentPhotoLoading(true),
    []
  );
  const handlePhotoLoadComplete = useCallback(
    () => setIsCurrentPhotoLoading(false),
    []
  );
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hook per gestire il fullscreen con routing
  const { shouldActivateFullscreen, clearFullscreenParam } =
    useFullscreenRoute();

  const STORY_DURATION = 5000; // 5 seconds per photo
  const PROGRESS_UPDATE_INTERVAL = 50; // Update progress every 50ms

  const nextPhoto = useCallback(() => {
    if (photos.length === 0) return;

    // Aggiungi effetto di transizione
    setIsTransitioning(true);
    setIsCurrentPhotoLoading(true); // Ferma il countdown durante il cambio foto

    setTimeout(() => {
      setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
      setProgress(0);
      setIsTransitioning(false);
    }, 150); // Durata dell'effetto di transizione
  }, [photos.length]);

  const startStory = useCallback(() => {
    setProgress(0);

    // Progress bar animation
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          return 100;
        }
        return prev + 100 / (STORY_DURATION / PROGRESS_UPDATE_INTERVAL);
      });
    }, PROGRESS_UPDATE_INTERVAL);

    // Auto advance to next photo
    intervalRef.current = setTimeout(() => {
      nextPhoto();
    }, STORY_DURATION);
  }, [nextPhoto]);

  const stopStory = () => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
  };

  useEffect(() => {
    if (photos.length === 0) return;

    // Inizia il countdown solo se la foto non è in caricamento e il player è attivo
    if (isPlaying && !isCurrentPhotoLoading) {
      startStory();
    } else {
      stopStory();
    }

    return () => {
      stopStory();
    };
  }, [
    currentPhotoIndex,
    isPlaying,
    photos.length,
    startStory,
    isCurrentPhotoLoading,
  ]);

  const prevPhoto = useCallback(() => {
    if (photos.length === 0) return;

    // Aggiungi effetto di transizione
    setIsTransitioning(true);
    setIsCurrentPhotoLoading(true); // Ferma il countdown durante il cambio foto

    setTimeout(() => {
      setCurrentPhotoIndex(
        (prev) => (prev - 1 + photos.length) % photos.length
      );
      setProgress(0);
      setIsTransitioning(false);
    }, 150); // Durata dell'effetto di transizione
  }, [photos.length]);

  const togglePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } else if ((document as any).webkitExitFullscreen) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (document as any).webkitExitFullscreen();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } else if ((document as any).msExitFullscreen) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (document as any).msExitFullscreen();
      }
      setIsFullscreen(false);
    } catch (error) {
      console.error("Errore nell'uscire dal fullscreen:", error);
    }
  }, []);

  const enterFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (containerRef.current.requestFullscreen) {
        await containerRef.current.requestFullscreen();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (containerRef.current as any).webkitRequestFullscreen();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } else if ((containerRef.current as any).msRequestFullscreen) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (containerRef.current as any).msRequestFullscreen();
      }
      setIsFullscreen(true);

      // Aggiungi il parametro fullscreen alla URL
      addFullscreenParam();
    } catch (error) {
      console.error("Errore nell'entrare in fullscreen:", error);
    }
  }, []);

  const toggleFullscreen = () => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  };

  // Gestione querystring per fullscreen automatico
  useEffect(() => {
    if (shouldActivateFullscreen && !isFullscreen && containerRef.current) {
      // Ritarda leggermente l'attivazione per assicurarsi che il componente sia completamente montato
      const timer = setTimeout(() => {
        enterFullscreen();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [
    shouldActivateFullscreen,
    isFullscreen,
    enterFullscreen,
    clearFullscreenParam,
  ]);

  // Gestisci i cambiamenti di fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (document as any).webkitFullscreenElement ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);

      // Se esce dal fullscreen, rimuovi il parametro dalla URL
      if (!isCurrentlyFullscreen) {
        clearFullscreenParam();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("msfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "msfullscreenchange",
        handleFullscreenChange
      );
    };
  }, [clearFullscreenParam]);

  // Controlli da tastiera in fullscreen
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          prevPhoto();
          break;
        case "ArrowRight":
          event.preventDefault();
          nextPhoto();
          break;
        case "Escape":
          event.preventDefault();
          exitFullscreen();
          break;
        case " ":
          event.preventDefault();
          togglePlayPause();
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, nextPhoto, prevPhoto, togglePlayPause, exitFullscreen]);

  // Gestione auto-hide controlli fullscreen
  const showControlsTemporarily = useCallback(() => {
    if (!isFullscreen) return;

    setShowFullscreenControls(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    controlsTimeoutRef.current = setTimeout(() => {
      setShowFullscreenControls(false);
    }, 3000); // Nasconde dopo 3 secondi
  }, [isFullscreen]);

  // Mostra controlli quando entra in fullscreen
  useEffect(() => {
    if (isFullscreen) {
      showControlsTemporarily();
    } else {
      setShowFullscreenControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    }
  }, [isFullscreen, showControlsTemporarily]);

  // Event listeners per mostrare controlli
  useEffect(() => {
    if (!isFullscreen) return;

    const handleMouseMove = () => showControlsTemporarily();
    const handleTouchStart = () => showControlsTemporarily();
    const handleKeyDown = () => showControlsTemporarily();

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("touchstart", handleTouchStart);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen, showControlsTemporarily]);

  // Aggiorna automaticamente la pagina delle thumbnail quando cambia la foto corrente
  useEffect(() => {
    if (photos.length > THUMBNAILS_PER_PAGE) {
      const requiredPage = Math.floor(currentPhotoIndex / THUMBNAILS_PER_PAGE);
      if (requiredPage !== thumbnailPage) {
        setThumbnailPage(requiredPage);
      }
    }
  }, [currentPhotoIndex, thumbnailPage, THUMBNAILS_PER_PAGE, photos.length]);

  const handlePhotoClick = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const centerX = rect.width / 2;

    if (clickX < centerX) {
      prevPhoto();
    } else {
      nextPhoto();
    }
  };

  // Gestione touch per mobile
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextPhoto();
    } else if (isRightSwipe) {
      prevPhoto();
    }
  };

  if (photos.length === 0) {
    return (
      <div className="photo-stories-container">
        <div className="no-photos">
          <div className="no-photos-icon">📸</div>
          <h2>Nessuna foto ancora</h2>
          <p>Le foto caricate dagli ospiti appariranno qui come stories!</p>
        </div>
      </div>
    );
  }

  const currentPhoto = photos[currentPhotoIndex];

  return (
    <div
      ref={containerRef}
      className={`photo-stories-container ${
        isFullscreen ? "fullscreen-mode" : ""
      }`}
    >
      <div className="stories-header">
        <h2>I Momenti del Matrimonio</h2>
        {!isFullscreen && (
          <div className="stories-controls">
            <button className="control-btn" onClick={togglePlayPause}>
              {isPlaying ? "⏸️" : "▶️"}
            </button>
            <button
              className="control-btn fullscreen-btn"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? "⤵️" : "⤴️"}
            </button>
            {/*}
            <span className="photo-counter">
              {currentPhotoIndex + 1} / {photos.length}
            </span>
            */}
          </div>
        )}
      </div>

      <div className="progress-bars">
        {photos.map((_, index) => (
          <div key={index} className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width:
                  index < currentPhotoIndex
                    ? "100%"
                    : index === currentPhotoIndex
                    ? `${progress}%`
                    : "0%",
              }}
            />
          </div>
        ))}
      </div>

      <div
        className={`story-photo-container ${
          isTransitioning ? "transitioning" : ""
        }`}
        onClick={handlePhotoClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {currentPhoto.publicId ? (
          <DropboxImage
            filePath={currentPhoto.publicId}
            alt={`Wedding moment ${currentPhotoIndex + 1}`}
            className={`story-photo ${
              isTransitioning ? "fade-transition" : ""
            }`}
            onLoadStart={handlePhotoLoadStart}
            onLoadComplete={handlePhotoLoadComplete}
          />
        ) : (
          <img
            src={currentPhoto.url}
            alt={`Wedding moment ${currentPhotoIndex + 1}`}
            className={`story-photo ${
              isTransitioning ? "fade-transition" : ""
            }`}
            onLoad={() => setIsCurrentPhotoLoading(false)}
            onLoadStart={() => setIsCurrentPhotoLoading(true)}
          />
        )}

        <div className="photo-overlay">
          <div className="photo-info">
            <span className="upload-time">
              {new Date(currentPhoto.timestamp).toLocaleString("it-IT", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {currentPhoto.uploadedBy && (
              <span className="uploaded-by">
                📷 da {currentPhoto.uploadedBy}
              </span>
            )}
            {currentPhoto.description && (
              <span className="photo-description">
                💬 {currentPhoto.description}
              </span>
            )}
          </div>

          {/* Indicatore di caricamento foto */}
          {isCurrentPhotoLoading && (
            <div className="photo-loading-indicator">
              <div className="loading-spinner"></div>
              <span>Caricando foto...</span>
            </div>
          )}
        </div>

        <div className="navigation-hints">
          <div className="nav-hint left">←</div>
          <div className="nav-hint right">→</div>
        </div>
      </div>

      {!isFullscreen && (
        <>
          <div className="story-navigation">
            <button
              className="nav-btn prev-btn"
              onClick={prevPhoto}
              disabled={photos.length <= 1}
            >
              ← Precedente
            </button>
            <button
              className="nav-btn next-btn"
              onClick={nextPhoto}
              disabled={photos.length <= 1}
            >
              Successiva →
            </button>
          </div>

          <div className="photos-grid-preview">
            <h3>Tutte le foto ({photos.length})</h3>

            {/* Paginazione thumbnail */}
            {photos.length > THUMBNAILS_PER_PAGE && (
              <div className="thumbnail-pagination">
                <button
                  className="pagination-btn"
                  onClick={() =>
                    setThumbnailPage(Math.max(0, thumbnailPage - 1))
                  }
                  disabled={thumbnailPage === 0}
                >
                  ← Precedenti
                </button>
                <span className="page-info">
                  Pagina {thumbnailPage + 1} di{" "}
                  {Math.ceil(photos.length / THUMBNAILS_PER_PAGE)}
                </span>
                <button
                  className="pagination-btn"
                  onClick={() =>
                    setThumbnailPage(
                      Math.min(
                        Math.ceil(photos.length / THUMBNAILS_PER_PAGE) - 1,
                        thumbnailPage + 1
                      )
                    )
                  }
                  disabled={
                    thumbnailPage >=
                    Math.ceil(photos.length / THUMBNAILS_PER_PAGE) - 1
                  }
                >
                  Successive →
                </button>
              </div>
            )}

            <div className="grid-container">
              {photos
                .slice(
                  thumbnailPage * THUMBNAILS_PER_PAGE,
                  (thumbnailPage + 1) * THUMBNAILS_PER_PAGE
                )
                .map((photo, relativeIndex) => {
                  const absoluteIndex =
                    thumbnailPage * THUMBNAILS_PER_PAGE + relativeIndex;
                  return (
                    <div
                      key={photo.id}
                      className={`grid-photo ${
                        absoluteIndex === currentPhotoIndex ? "active" : ""
                      }`}
                      onClick={() => {
                        setCurrentPhotoIndex(absoluteIndex);
                        setProgress(0);
                        setIsCurrentPhotoLoading(true); // Ferma il countdown durante il cambio foto manuale

                        // Aggiorna la pagina delle thumbnail se necessario
                        const newPage = Math.floor(
                          absoluteIndex / THUMBNAILS_PER_PAGE
                        );
                        if (newPage !== thumbnailPage) {
                          setThumbnailPage(newPage);
                        }
                      }}
                    >
                      {photo.publicId ? (
                        <DropboxImage
                          filePath={photo.publicId}
                          alt={`Thumbnail ${absoluteIndex + 1}`}
                          loading="lazy"
                        />
                      ) : (
                        <img
                          src={photo.url}
                          alt={`Thumbnail ${absoluteIndex + 1}`}
                          loading="lazy"
                        />
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </>
      )}

      {/* Controlli fullscreen eleganti */}
      {isFullscreen && (
        <div
          className={`fullscreen-controls ${
            showFullscreenControls ? "visible" : "hidden"
          }`}
        >
          {/* Pulsante exit minimale in alto */}
          <button className="fullscreen-exit-minimal" onClick={exitFullscreen}>
            ✕
          </button>

          {/* Barra controlli in basso */}
          <div className="fullscreen-bottom-bar">
            <button
              className="fullscreen-control-btn play-pause"
              onClick={togglePlayPause}
              title={isPlaying ? "Pausa" : "Play"}
            >
              {isPlaying ? "⏸️" : "▶️"}
            </button>

            <button
              className="fullscreen-control-btn exit"
              onClick={exitFullscreen}
              title="Esci dal fullscreen"
            >
              ⤵️
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoStories;
