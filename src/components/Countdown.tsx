import React, { useState, useEffect } from "react";
import "../styles/Countdown.scss";

interface CountdownProps {
  targetDate: Date;
  brideName: string;
  groomName: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const Countdown: React.FC<CountdownProps> = ({
  targetDate,
  brideName,
  groomName,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor(
          (difference % (1000 * 60 * 60)) / (1000 * 60)
        );
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeRemaining({ days, hours, minutes, seconds });
      } else {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="countdown-container">
      <div className="countdown-header">
        <h1 className="couple-names">
          {groomName} & {brideName}
        </h1>
        <p className="wedding-subtitle">Il nostro giorno speciale</p>
      </div>

      <div className="countdown-timer">
        <div className="time-unit">
          <span className="time-value">{timeRemaining.days}</span>
          <span className="time-label">Giorni</span>
        </div>
        <div className="time-separator">:</div>
        <div className="time-unit">
          <span className="time-value">{timeRemaining.hours}</span>
          <span className="time-label">Ore</span>
        </div>
        <div className="time-separator">:</div>
        <div className="time-unit">
          <span className="time-value">{timeRemaining.minutes}</span>
          <span className="time-label">Minuti</span>
        </div>
        <div className="time-separator">:</div>
        <div className="time-unit">
          <span className="time-value">{timeRemaining.seconds}</span>
          <span className="time-label">Secondi</span>
        </div>
      </div>

      <div className="countdown-date">
        <p>
          {targetDate.toLocaleDateString("it-IT", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
    </div>
  );
};

export default Countdown;
