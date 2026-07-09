import {
  getEndOfItalyCalendarDay,
  isSameCalendarDayInItaly,
} from "./dateTime";

export type WeddingPhase = "before" | "today" | "celebration";

/** Fase corrente rispetto alla data/ora del matrimonio (fuso Italia) */
export function getWeddingPhase(
  targetDate: Date,
  now: Date = new Date()
): WeddingPhase {
  if (now.getTime() >= targetDate.getTime()) {
    return "celebration";
  }

  if (isSameCalendarDayInItaly(now, targetDate)) {
    return "today";
  }

  return "before";
}

/** True se siamo oltre la fine del giorno del matrimonio in Italia */
export function isAfterWeddingDay(
  targetDate: Date,
  now: Date = new Date()
): boolean {
  const endOfWeddingDay = getEndOfItalyCalendarDay(targetDate);
  return now.getTime() > endOfWeddingDay.getTime();
}

export function getTimeRemaining(targetDate: Date, now: Date = new Date()) {
  const difference = Math.max(0, targetDate.getTime() - now.getTime());

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((difference % (1000 * 60)) / 1000),
    totalMs: difference,
  };
}

/** Timer finto per il debug delle fasi before/today */
export function getDebugTimeRemaining(phase: WeddingPhase) {
  if (phase === "today") {
    return { days: 0, hours: 2, minutes: 15, seconds: 30, totalMs: 0 };
  }

  return { days: 42, hours: 5, minutes: 30, seconds: 15, totalMs: 0 };
}
