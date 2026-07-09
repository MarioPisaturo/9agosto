import React from "react";
import CacheDebug from "./CacheDebug";
import CountdownDebugPanel from "./CountdownDebugPanel";
import { isCountdownDebugPanelEnabled } from "../config/countdownDebug";
import { useCountdownDebug } from "../hooks/useCountdownDebug";
import "../styles/DevDebugDock.scss";

const DevDebugDock: React.FC = () => {
  const showCache = import.meta.env.DEV;
  const panelEnabled = isCountdownDebugPanelEnabled();
  const { debugPhase, setDebugPhase } = useCountdownDebug();

  if (!showCache && !panelEnabled) {
    return null;
  }

  return (
    <div className="dev-debug-dock">
      {showCache && <CacheDebug />}
      {panelEnabled && (
        <CountdownDebugPanel
          activePhase={debugPhase}
          onSelect={setDebugPhase}
        />
      )}
    </div>
  );
};

export default DevDebugDock;
