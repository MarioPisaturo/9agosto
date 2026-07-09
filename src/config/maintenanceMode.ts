/**
 * Modalità manutenzione: mostra solo il Countdown (niente galleria, upload, stories, Dropbox).
 *
 * Attivazione (in ordine di priorità):
 * 1. VITE_MAINTENANCE_MODE=true su Netlify (richiede redeploy)
 * 2. ?maintenance_mode=true in URL (anche in produzione)
 * 3. Toggle nel pannello debug → sessionStorage (solo con pannello visibile)
 */

export const MAINTENANCE_MODE_PARAM = "maintenance_mode";
export const MAINTENANCE_DEBUG_STORAGE_KEY = "maintenance_mode_debug";

export type MaintenanceModeSource = "env" | "url" | "session" | null;

function parseBool(
  value: string | null | undefined,
  defaultValue: boolean
): boolean {
  if (value === undefined || value === null || value.trim() === "") {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function readUrlMaintenanceFlag(): boolean {
  if (typeof window === "undefined") return false;
  return parseBool(
    new URLSearchParams(window.location.search).get(MAINTENANCE_MODE_PARAM),
    false
  );
}

function readSessionMaintenanceFlag(): boolean {
  if (typeof window === "undefined") return false;
  return parseBool(
    sessionStorage.getItem(MAINTENANCE_DEBUG_STORAGE_KEY),
    false
  );
}

export function isMaintenanceModeFromEnv(): boolean {
  return parseBool(import.meta.env.VITE_MAINTENANCE_MODE, false);
}

export function getMaintenanceModeSource(): MaintenanceModeSource {
  if (isMaintenanceModeFromEnv()) return "env";
  if (readUrlMaintenanceFlag()) return "url";
  if (readSessionMaintenanceFlag()) return "session";
  return null;
}

export function isMaintenanceMode(): boolean {
  return getMaintenanceModeSource() !== null;
}

export function setMaintenanceModeDebugOverride(active: boolean): void {
  if (typeof window === "undefined") return;

  if (active) {
    sessionStorage.setItem(MAINTENANCE_DEBUG_STORAGE_KEY, "true");
  } else {
    sessionStorage.removeItem(MAINTENANCE_DEBUG_STORAGE_KEY);
  }

  window.location.reload();
}
