import React from "react";
import type { CountdownDebugPhase } from "../config/countdownDebug";
import "../styles/CountdownDebugPanel.scss";

interface CountdownDebugPanelProps {
  activePhase: CountdownDebugPhase | null;
  onSelect: (phase: CountdownDebugPhase | null) => void;
}

const OPTIONS: Array<{ id: CountdownDebugPhase; label: string }> = [
  { id: "before", label: "Prima" },
  { id: "today", label: "Giorno" },
  { id: "celebration", label: "Dopo (live)" },
  { id: "after", label: "Dopo (giorno+)" },
];

const CountdownDebugPanel: React.FC<CountdownDebugPanelProps> = ({
  activePhase,
  onSelect,
}) => {
  return (
    <div className="countdown-debug-panel">
      <span className="debug-label">Debug countdown</span>
      <div className="debug-buttons">
        {OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`debug-btn ${activePhase === option.id ? "active" : ""}`}
            onClick={() => onSelect(option.id)}
          >
            {option.label}
          </button>
        ))}
        <button
          type="button"
          className={`debug-btn reset ${!activePhase ? "active" : ""}`}
          onClick={() => onSelect(null)}
        >
          Reale
        </button>
      </div>
      <p className="debug-hint">
        URL (funziona anche in produzione):{" "}
        <code>?countdown_debug=before|today|celebration|after</code>
      </p>
    </div>
  );
};

export default CountdownDebugPanel;
