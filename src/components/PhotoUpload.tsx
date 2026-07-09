import React, { useRef, useState, useEffect } from "react";
import type { Photo } from "../types";
import { StorageService } from "../services/storageService";
import { USE_DROPBOX_PROXY } from "../config/runtime";
import { isImageFile } from "../utils/imageCompression";
import StorageSetupGuide from "./StorageSetupGuide";
import "../styles/PhotoUpload.scss";

interface PhotoUploadProps {
  onPhotoUpload: (photo: Photo) => void;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({ onPhotoUpload }) => {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [uploaderName, setUploaderName] = useState<string>("");
  const [photoDescription, setPhotoDescription] = useState<string>("");
  const [storageStatus, setStorageStatus] = useState<{
    dropbox: boolean;
    recommended: string;
  }>({ dropbox: false, recommended: "checking..." });
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // In produzione il token Dropbox resta sul server (Netlify Functions)
  useEffect(() => {
    if (USE_DROPBOX_PROXY) return;

    const checkStorageAvailability = async () => {
      try {
        const availability = await StorageService.checkProviderAvailability();
        const recommended = await StorageService.getRecommendedProvider();
        
        setStorageStatus({
          dropbox: availability.dropbox.available,
          recommended: recommended.provider,
        });

        // Mostra automaticamente la guida se nessun provider è configurato
        if (recommended.provider === 'none') {
          setShowSetupGuide(true);
        }
      } catch (error) {
        console.warn("Errore nel controllo dei provider di storage:", error);
        setStorageStatus({
          dropbox: false,
          recommended: "none",
        });
        setShowSetupGuide(true);
      }
    };

    checkStorageAvailability();
  }, []);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Verifica che tutti i file siano immagini supportate
    const invalidFiles = Array.from(files).filter((file) => !isImageFile(file));
    if (invalidFiles.length > 0) {
      const fileNames = invalidFiles.map((f) => f.name).join(", ");
      setUploadStatus(
        `❌ Errore: ${
          invalidFiles.length === 1
            ? `Il file "${fileNames}" non è un'immagine supportata`
            : `${invalidFiles.length} file non sono immagini supportate`
        }. Formati supportati: JPEG, PNG, WebP`
      );

      // Reset inputs
      if (galleryInputRef.current) {
        galleryInputRef.current.value = "";
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }

      setTimeout(() => setUploadStatus(""), 5000);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus("Preparazione caricamento...");

    try {
      // Usa il nuovo servizio per caricare le foto
      const uploadResults = await StorageService.uploadMultiplePhotos(
        Array.from(files),
        {
          uploaderName,
          description: photoDescription,
          onProgress: (progress) => {
            setUploadProgress(progress);
            setUploadStatus(`Caricando foto... ${Math.round(progress)}%`);
          },
        }
      );

      // Processa i risultati
      uploadResults.successful.forEach(result => {
        if (result.photo) {
          onPhotoUpload(result.photo);
        }
      });

      // Mostra il risultato finale
      if (uploadResults.failed.length === 0) {
        setUploadStatus(
          `✅ Tutte le ${uploadResults.successful.length} foto caricate con successo!`
        );
      } else if (uploadResults.successful.length > 0) {
        setUploadStatus(
          `⚠️ ${uploadResults.successful.length} foto caricate, ${uploadResults.failed.length} fallite`
        );
      } else {
        setUploadStatus("❌ Nessuna foto caricata con successo");
      }

      // Reset dei campi dopo caricamento riuscito
      if (uploadResults.successful.length > 0) {
        setPhotoDescription("");
      }
    } catch (error) {
      console.error("Errore durante il caricamento:", error);
      setUploadStatus(
        `❌ Errore: ${
          error instanceof Error ? error.message : "Errore sconosciuto"
        }`
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Reset inputs
      if (galleryInputRef.current) {
        galleryInputRef.current.value = "";
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }
      // Nascondi il messaggio di stato dopo 3 secondi
      setTimeout(() => setUploadStatus(""), 3000);
    }
  };

  // Funzione rimossa - ora gestita da StorageService

  const triggerGallery = () => {
    galleryInputRef.current?.click();
  };

  const triggerCamera = () => {
    cameraInputRef.current?.click();
  };

  return (
    <div className="photo-upload-container">
      {/* Input per la galleria */}
      <input
        type="file"
        ref={galleryInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        multiple
        style={{ display: "none" }}
      />

      {/* Input per la fotocamera */}
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
      />

      <div className="upload-header">
        <h2>Condividi i tuoi ricordi</h2>
        <p>
          Carica le foto del matrimonio per condividerle con tutti gli ospiti!
        </p>
        
        {/* Stato storage solo in sviluppo locale */}
        {!USE_DROPBOX_PROXY && (
        <div className="storage-status">
          <h4>📡 Stato servizi di storage:</h4>
          <div className="provider-status">
            <span className={`provider ${storageStatus.dropbox ? 'available' : 'unavailable'}`}>
              {storageStatus.dropbox ? '✅' : '❌'} Dropbox
            </span>
            {storageStatus.recommended !== 'none' && (
              <span className="recommended">
                🚀 Consigliato: Dropbox
              </span>
            )}
            {storageStatus.recommended === 'none' && (
              <>
                <span className="no-provider">
                  ⚠️ Configurazione servizi richiesta
                </span>
                <button 
                  className="setup-btn"
                  onClick={() => setShowSetupGuide(true)}
                >
                  🔧 Configura Ora
                </button>
              </>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Input per il nome dell'ospite */}
      <div className="uploader-info-section">
        <div className="input-group">
          <label htmlFor="uploader-name">Il tuo nome (opzionale):</label>
          <input
            id="uploader-name"
            type="text"
            value={uploaderName}
            onChange={(e) => setUploaderName(e.target.value)}
            placeholder="Es. Mario e Annachiara"
            disabled={isUploading}
            className="name-input"
          />
        </div>

        <div className="input-group">
          <label htmlFor="photo-description">
            Descrizione foto (opzionale):
          </label>
          <textarea
            id="photo-description"
            value={photoDescription}
            onChange={(e) => setPhotoDescription(e.target.value)}
            placeholder="Es. Momento speciale durante il taglio della torta..."
            disabled={isUploading}
            className="description-input"
            rows={3}
            maxLength={200}
          />
          <small className="character-count">
            {photoDescription.length}/200 caratteri
          </small>
        </div>
      </div>

      <div className="upload-buttons">
        <button
          className="upload-btn camera-btn"
          onClick={triggerCamera}
          disabled={isUploading}
        >
          <span className="btn-icon">📷</span>
          <span className="btn-text">Scatta Foto</span>
        </button>

        <button
          className="upload-btn gallery-btn"
          onClick={triggerGallery}
          disabled={isUploading}
        >
          <span className="btn-icon">🖼️</span>
          <span className="btn-text">Galleria</span>
        </button>
      </div>

      {/* Progresso del caricamento */}
      {isUploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <div className="spinner"></div>
          <p>{uploadStatus}</p>
          <small>{uploadProgress}% completato</small>
        </div>
      )}

      {/* Messaggio di stato */}
      {uploadStatus && !isUploading && (
        <div
          className={`upload-status ${
            uploadStatus.includes("❌") ? "error" : "success"
          }`}
        >
          <p>{uploadStatus}</p>
        </div>
      )}

      <div className="upload-tips">
        <h3>💡 Informazioni utili:</h3>
        <ul>
          <li>📸 Scatta foto spontanee e divertenti</li>
          <li>✨ Cattura momenti emozionanti</li>
          <li>👥 Includi gli ospiti nelle foto</li>
          <li>🎉 Documenta i dettagli della festa</li>
          <li>💝 Condividi i momenti più belli</li>
          <li>
            🤖 <strong>Compressione automatica attiva</strong>
          </li>
          <li>
            🗜️ <strong>Le foto vengono ottimizzate automaticamente</strong>
          </li>
          <li>
            📱 <strong>Carica foto di qualsiasi dimensione</strong>
          </li>
          <li>
            ☁️ <strong>Le foto sono condivise con tutti gli ospiti</strong>
          </li>
        </ul>
      </div>

      {/* Guida di setup storage */}
      {showSetupGuide && !USE_DROPBOX_PROXY && (
        <StorageSetupGuide onClose={() => setShowSetupGuide(false)} />
      )}
    </div>
  );
};

export default PhotoUpload;
