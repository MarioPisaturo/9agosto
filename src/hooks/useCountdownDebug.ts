import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  COUNTDOWN_DEBUG_PARAM,
  getCountdownDebugPhaseFromEnv,
  getCountdownDebugPhaseFromSearch,
  isCountdownDebugPanelEnabled,
  type CountdownDebugPhase,
} from "../config/countdownDebug";

export function useCountdownDebug() {
  const location = useLocation();
  const navigate = useNavigate();
  const panelEnabled = isCountdownDebugPanelEnabled();

  const readPhase = useCallback((): CountdownDebugPhase | null => {
    const fromUrl = getCountdownDebugPhaseFromSearch(location.search);
    if (fromUrl) return fromUrl;

    if (!panelEnabled) return null;

    return getCountdownDebugPhaseFromEnv();
  }, [panelEnabled, location.search]);

  const [debugPhase, setDebugPhaseState] = useState<CountdownDebugPhase | null>(
    readPhase
  );

  useEffect(() => {
    setDebugPhaseState(readPhase());
  }, [readPhase]);

  const setDebugPhase = useCallback(
    (phase: CountdownDebugPhase | null) => {
      const params = new URLSearchParams(location.search);

      if (phase) {
        params.set(COUNTDOWN_DEBUG_PARAM, phase);
      } else {
        params.delete(COUNTDOWN_DEBUG_PARAM);
      }

      const nextSearch = params.toString();
      navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ""}`, {
        replace: true,
      });
      setDebugPhaseState(phase);
    },
    [location.pathname, location.search, navigate]
  );

  return {
    /** Pannello UI visibile solo in dev o con VITE_COUNTDOWN_DEBUG_ENABLED */
    enabled: panelEnabled,
    debugPhase,
    setDebugPhase,
    /** True se c'è una fase debug attiva (anche via ?countdown_debug= in produzione) */
    isActive: debugPhase !== null,
  };
}
