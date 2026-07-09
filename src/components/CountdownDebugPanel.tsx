import React from "react";
import type { CountdownDebugPhase } from "../config/countdownDebug";
import { useMaintenanceDebug } from "../hooks/useMaintenanceDebug";
import "../styles/CountdownDebugPanel.scss";

interface CountdownDebugPanelProps {
  activePhase: CountdownDebugPhase | null;
  onSelect: (phase: CountdownDebugPhase | null) => void;
}

const PHASE_OPTIONS: Array<{ id: CountdownDebugPhase; label: string }> = [
  { id: "before", label: "Prima" },
  { id: "today", label: "Giorno" },
  { id: "celebration", label: "Dopo (live)" },
  { id: "after", label: "Dopo (giorno+)" },
];

const SOURCE_LABELS: Record<NonNullable<ReturnType<typeof useMaintenanceDebug>["source"]>, string> = {
  env: "build Netlify",
  url: "URL",
  session: "pannello debug",
};

const CountdownDebugPanel: React.FC<CountdownDebugPanelProps> = ({
  activePhase,
  onSelect,
}) => {
  const {
    active: maintenanceActive,
    source: maintenanceSource,
    lockedByEnv,
    setMaintenance,
  } = useMaintenanceDebug();

  return (
    <div className="countdown-debug-panel">
      <section className="debug-section">
        <span className="debug-label">Debug countdown</span>
        <div className="debug-buttons">
          {PHASE_OPTIONS.map((option) => (
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
          URL: <code>?countdown_debug=before|today|celebration|after</code>
        </p>
      </section>

      <section className="debug-section debug-section--maintenance">
        <span className="debug-label">Manutenzione (solo countdown)</span>
        <div className="debug-buttons">
          <button
            type="button"
            className={`debug-btn maint ${maintenanceActive ? "active" : ""}`}
            onClick={() => setMaintenance(true)}
          >
            Attiva
          </button>
          <button
            type="button"
            className={`debug-btn reset ${!maintenanceActive ? "active" : ""}`}
            onClick={() => setMaintenance(false)}
            disabled={lockedByEnv}
            title={
              lockedByEnv
                ? "Disattiva VITE_MAINTENANCE_MODE su Netlify e redeploy"
                : undefined
            }
          >
            Normale
          </button>
        </div>
        <p className="debug-hint">
          URL: <code>?maintenance_mode=true</code>
          {maintenanceActive && maintenanceSource && (
            <>
              {" "}
              · Attivo via <strong>{SOURCE_LABELS[maintenanceSource]}</strong>
            </>
          )}
          {lockedByEnv && (
            <>
              {" "}
              · <strong>Bloccato da VITE_MAINTENANCE_MODE</strong>
            </>
          )}
        </p>
      </section>
    </div>
  );
};

export default CountdownDebugPanel;
