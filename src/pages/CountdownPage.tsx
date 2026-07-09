import React from "react";
import Countdown from "../components/Countdown";
import type { WeddingInfo, Photo } from "../types";

interface CountdownPageProps {
  weddingInfo: WeddingInfo;
  photos: Photo[];
  isLoadingPhotos: boolean;
  onLoadSamplePhotos: () => void;
}

const CountdownPage: React.FC<CountdownPageProps> = ({
  weddingInfo,
  photos,
  isLoadingPhotos,
  onLoadSamplePhotos,
}) => {
  return (
    <div>
      <Countdown
        targetDate={weddingInfo.weddingDate}
        groomName={weddingInfo.groomName}
        brideName={weddingInfo.brideName}
      />
      {isLoadingPhotos && (
        <div className="loading-section">
          <div className="spinner"></div>
          <p>🔄 Caricando foto condivise...</p>
        </div>
      )}
      {!isLoadingPhotos && photos.length === 0 && (
        <div className="demo-section">
          <button className="demo-button" onClick={onLoadSamplePhotos}>
            🎉 Carica Foto Demo per Vedere l'App in Azione
          </button>
          <p
            style={{
              marginTop: "1rem",
              fontSize: "0.9rem",
              opacity: 0.7,
            }}
          >
            Oppure vai alla sezione "Carica" per aggiungere le tue foto!
          </p>
        </div>
      )}
    </div>
  );
};

export default CountdownPage;
