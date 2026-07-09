import type { WeddingPhase } from "../utils/weddingDate";

export const COUNTDOWN_DEBUG_PARAM = "countdown_debug";

/** Valori: before | today | celebration | after */
export type CountdownDebugPhase = WeddingPhase | "after";

const VALID_PHASES: CountdownDebugPhase[] = [
  "before",
  "today",
  "celebration",
  "after",
];

/** Pannello UI debug: solo dev o con VITE_COUNTDOWN_DEBUG_ENABLED=true */
export function isCountdownDebugPanelEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  return import.meta.env.VITE_COUNTDOWN_DEBUG_ENABLED === "true";
}

/** @deprecated Usa isCountdownDebugPanelEnabled */
export function isCountdownDebugEnabled(): boolean {
  return isCountdownDebugPanelEnabled();
}

export function getCountdownDebugPhaseFromSearch(
  search: string
): CountdownDebugPhase | null {
  return parseCountdownDebugPhase(
    new URLSearchParams(search).get(COUNTDOWN_DEBUG_PARAM)
  );
}

export function parseCountdownDebugPhase(
  value: string | null | undefined
): CountdownDebugPhase | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return VALID_PHASES.includes(normalized as CountdownDebugPhase)
    ? (normalized as CountdownDebugPhase)
    : null;
}

export function getCountdownDebugPhaseFromEnv(): CountdownDebugPhase | null {
  return parseCountdownDebugPhase(import.meta.env.VITE_COUNTDOWN_DEBUG_PHASE);
}

export function toWeddingPhase(
  debugPhase: CountdownDebugPhase
): WeddingPhase {
  return debugPhase === "after" ? "celebration" : debugPhase;
}

export function isPastWeddingDayForDebug(
  debugPhase: CountdownDebugPhase
): boolean {
  return debugPhase === "after";
}
