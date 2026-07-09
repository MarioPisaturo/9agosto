import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  formatItalyDate,
  formatItalyTime,
} from "../utils/dateTime";
import {
  getTimeRemaining,
  getWeddingPhase,
  getDebugTimeRemaining,
  isAfterWeddingDay,
  type WeddingPhase,
} from "../utils/weddingDate";
import {
  isPastWeddingDayForDebug,
  toWeddingPhase,
  type CountdownDebugPhase,
} from "../config/countdownDebug";
import "../styles/Countdown.scss";

interface CountdownProps {
  targetDate: Date;
  brideName: string;
  groomName: string;
  church?: string;
  churchTime?: string;
  venue?: string;
  photoCount?: number;
  debugPhase?: CountdownDebugPhase | null;
}

const formatChurchLabel = (church: string): string =>
  church
    .replace(/^Chiesa di\s+/i, "")
    .replace(/,\s*/g, " ")
    .trim();

const WeddingLocations: React.FC<{
  church?: string;
  churchTime?: string;
  venue?: string;
  className?: string;
}> = ({ church, churchTime, venue, className = "" }) => {
  if (!church && !venue) return null;

  return (
    <div className={`wedding-locations ${className}`.trim()}>
      {church && (
        <p className="wedding-location church">
          Chiesa: {formatChurchLabel(church)}
          {churchTime ? ` ${churchTime}` : ""}
        </p>
      )}
      {venue && (
        <p className="wedding-location venue">🥂 Ricevimento: {venue}</p>
      )}
    </div>
  );
};

const Countdown: React.FC<CountdownProps> = ({
  targetDate,
  brideName,
  groomName,
  church,
  churchTime,
  venue,
  photoCount = 0,
  debugPhase = null,
}) => {
  const [phase, setPhase] = useState<WeddingPhase>(() =>
    getWeddingPhase(targetDate)
  );
  const [isPastWeddingDay, setIsPastWeddingDay] = useState(() =>
    isAfterWeddingDay(targetDate)
  );
  const [timeRemaining, setTimeRemaining] = useState(() =>
    getTimeRemaining(targetDate)
  );

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setPhase(getWeddingPhase(targetDate, now));
      setIsPastWeddingDay(isAfterWeddingDay(targetDate, now));
      setTimeRemaining(getTimeRemaining(targetDate, now));
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  const activePhase: WeddingPhase = debugPhase
    ? toWeddingPhase(debugPhase)
    : phase;
  const activePastWeddingDay = debugPhase
    ? isPastWeddingDayForDebug(debugPhase)
    : isPastWeddingDay;
  const activeTimeRemaining =
    debugPhase && activePhase !== "celebration"
      ? getDebugTimeRemaining(activePhase)
      : timeRemaining;

  const formattedDate = formatItalyDate(targetDate, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const ceremonyTime = churchTime || formatItalyTime(targetDate);

  const locationDetails = (
    <WeddingLocations
      church={church}
      churchTime={churchTime || ceremonyTime}
      venue={venue}
    />
  );

  const subtitleByPhase: Record<WeddingPhase, string> = {
    before: "Il nostro giorno speciale",
    today: "Oggi è il grande giorno!",
    celebration: activePastWeddingDay
      ? "Grazie per aver celebrato con noi"
      : "È il grande giorno!",
  };

  if (activePhase === "celebration") {
    return (
      <div className="countdown-container countdown-container--celebration">
        <div className="celebration-confetti" aria-hidden="true">
          {["💍", "✨", "💐", "🥂", "♥"].map((icon, index) => (
            <span
              key={icon}
              className="confetti-piece"
              style={{ animationDelay: `${index * 0.4}s` }}
            >
              {icon}
            </span>
          ))}
        </div>

        <div className="countdown-header">
          <p className="celebration-badge">
            {activePastWeddingDay ? "Ricordi indimenticabili" : "Live"}
          </p>
          <h1 className="couple-names">
            {groomName} & {brideName}
          </h1>
          <p className="wedding-subtitle">{subtitleByPhase.celebration}</p>
        </div>

        <div className="celebration-message">
          <p className="celebration-lead">
            {activePastWeddingDay
              ? "Il nostro sì è stato detto. Rivivi i momenti più belli insieme a noi."
              : "Il momento è arrivato! Festeggia con noi e condividi i tuoi scatti."}
          </p>
          <WeddingLocations
            church={church}
            churchTime={churchTime || ceremonyTime}
            venue={venue}
            className="celebration-locations"
          />
          <p className="celebration-date">{formattedDate}</p>
        </div>

        {photoCount > 0 && (
          <p className="celebration-photo-count">
            📸 {photoCount} {photoCount === 1 ? "foto" : "foto"} già condivise
          </p>
        )}

        <div className="celebration-actions">
          <Link to="/stories" className="celebration-cta primary">
            ✨ Vivi le Stories
          </Link>
          <Link to="/gallery" className="celebration-cta secondary">
            🖼️ Sfoglia la Galleria
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`countdown-container countdown-container--${activePhase}`}>
      <div className="countdown-header">
        {activePhase === "today" && (
          <p className="today-badge">Oggi si sposano!</p>
        )}
        <h1 className="couple-names">
          {groomName} & {brideName}
        </h1>
        <p className="wedding-subtitle">{subtitleByPhase[activePhase]}</p>
      </div>

      <div className="countdown-timer">
        <div className="time-unit">
          <span className="time-value">{activeTimeRemaining.days}</span>
          <span className="time-label">Giorni</span>
        </div>
        <div className="time-separator">:</div>
        <div className="time-unit">
          <span className="time-value">{activeTimeRemaining.hours}</span>
          <span className="time-label">Ore</span>
        </div>
        <div className="time-separator">:</div>
        <div className="time-unit">
          <span className="time-value">{activeTimeRemaining.minutes}</span>
          <span className="time-label">Minuti</span>
        </div>
        <div className="time-separator">:</div>
        <div className="time-unit">
          <span className="time-value">{activeTimeRemaining.seconds}</span>
          <span className="time-label">Secondi</span>
        </div>
      </div>

      <div className="countdown-date">
        <p>{formattedDate}</p>
        {locationDetails}
      </div>

      {activePhase === "today" && (
        <p className="today-hint">
          Tra poco sarà il momento del sì — preparati a festeggiare con noi!
        </p>
      )}
    </div>
  );
};

export default Countdown;
