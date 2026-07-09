import { useCallback } from "react";
import {
  getMaintenanceModeSource,
  isMaintenanceMode,
  isMaintenanceModeFromEnv,
  setMaintenanceModeDebugOverride,
  type MaintenanceModeSource,
} from "../config/maintenanceMode";

export function useMaintenanceDebug() {
  const active = isMaintenanceMode();
  const source: MaintenanceModeSource = getMaintenanceModeSource();
  const lockedByEnv = isMaintenanceModeFromEnv();

  const setMaintenance = useCallback(
    (enabled: boolean) => {
      if (lockedByEnv && !enabled) {
        return;
      }
      setMaintenanceModeDebugOverride(enabled);
    },
    [lockedByEnv]
  );

  return {
    active,
    source,
    lockedByEnv,
    setMaintenance,
  };
}
