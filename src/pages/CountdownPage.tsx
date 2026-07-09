import React from "react";
import Countdown from "../components/Countdown";
import { toWeddingPhase } from "../config/countdownDebug";
import { useCountdownDebug } from "../hooks/useCountdownDebug";
import { getWeddingPhase } from "../utils/weddingDate";
import type { WeddingInfo, Photo } from "../types";

interface CountdownPageProps {
  weddingInfo: WeddingInfo;
  photos: Photo[];
  isLoadingPhotos: boolean;
  onLoadSamplePhotos: () => void;
  /** Solo countdown: niente caricamento foto, demo, ecc. */
  maintenanceMode?: boolean;
}

const CountdownPage: React.FC<CountdownPageProps> = ({
  weddingInfo,
  photos,
  isLoadingPhotos,
  onLoadSamplePhotos,
  maintenanceMode = false,
}) => {
  const { debugPhase, isActive } = useCountdownDebug();

  const isCelebration = isActive && debugPhase
    ? toWeddingPhase(debugPhase) === "celebration"
    : getWeddingPhase(weddingInfo.weddingDate) === "celebration";

  return (
    <div>
      <Countdown
        targetDate={weddingInfo.weddingDate}
        groomName={weddingInfo.groomName}
        brideName={weddingInfo.brideName}
        church={weddingInfo.church}
        churchTime={weddingInfo.churchTime}
        venue={weddingInfo.venue}
        photoCount={maintenanceMode ? 0 : photos.length}
        debugPhase={isActive ? debugPhase : null}
      />
      {!maintenanceMode && isLoadingPhotos && (
        <div className="loading-section">
          <div className="spinner"></div>
          <p>🔄 Caricando foto condivise...</p>
        </div>
      )}
      {!maintenanceMode &&
        !isLoadingPhotos &&
        photos.length === 0 &&
        !isCelebration && (
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
