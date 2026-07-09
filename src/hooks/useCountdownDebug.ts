import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  COUNTDOWN_DEBUG_PARAM,
  getCountdownDebugPhaseFromEnv,
  isCountdownDebugEnabled,
  parseCountdownDebugPhase,
  type CountdownDebugPhase,
} from "../config/countdownDebug";

export function useCountdownDebug() {
  const location = useLocation();
  const navigate = useNavigate();
  const enabled = isCountdownDebugEnabled();

  const readPhase = useCallback((): CountdownDebugPhase | null => {
    if (!enabled) return null;

    const fromUrl = parseCountdownDebugPhase(
      new URLSearchParams(location.search).get(COUNTDOWN_DEBUG_PARAM)
    );
    if (fromUrl) return fromUrl;

    return getCountdownDebugPhaseFromEnv();
  }, [enabled, location.search]);

  const [debugPhase, setDebugPhaseState] = useState<CountdownDebugPhase | null>(
    readPhase
  );

  useEffect(() => {
    setDebugPhaseState(readPhase());
  }, [readPhase]);

  const setDebugPhase = useCallback(
    (phase: CountdownDebugPhase | null) => {
      if (!enabled) return;

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
    [enabled, location.pathname, location.search, navigate]
  );

  return {
    enabled,
    debugPhase,
    setDebugPhase,
    isActive: enabled && debugPhase !== null,
  };
}
