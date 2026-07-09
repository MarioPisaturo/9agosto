export const ITALY_TIMEZONE = "Europe/Rome";
export const ITALY_LOCALE = "it-IT";

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  const hour = value("hour");

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: hour === 24 ? 0 : hour,
    minute: value("minute"),
    second: value("second"),
  };
}

/** Crea un Date UTC corrispondente a data/ora locale italiana */
export function createDateInItaly(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0
): Date {
  let utc = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);

  for (let attempt = 0; attempt < 4; attempt++) {
    const zoned = getZonedParts(new Date(utc), ITALY_TIMEZONE);
    const dayDiffMs =
      Date.UTC(year, month - 1, day) -
      Date.UTC(zoned.year, zoned.month - 1, zoned.day);
    const timeDiffMs =
      ((hour - zoned.hour) * 3600 +
        (minute - zoned.minute) * 60 +
        (second - zoned.second)) *
        1000 +
      millisecond;

    const correction = dayDiffMs + timeDiffMs;
    if (correction === 0) break;
    utc += correction;
  }

  return new Date(utc);
}

/** Es. parseItalyDateTime("2026-08-09", "10:30") */
export function parseItalyDateTime(dateISO: string, time = "00:00"): Date {
  const [year, month, day] = dateISO.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return createDateInItaly(year, month, day, hour, minute);
}

export function isSameCalendarDayInItaly(a: Date, b: Date): boolean {
  const pa = getZonedParts(a, ITALY_TIMEZONE);
  const pb = getZonedParts(b, ITALY_TIMEZONE);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

export function getEndOfItalyCalendarDay(date: Date): Date {
  const { year, month, day } = getZonedParts(date, ITALY_TIMEZONE);
  return createDateInItaly(year, month, day, 23, 59, 59, 999);
}

export function formatItalyDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = {}
): string {
  return date.toLocaleDateString(ITALY_LOCALE, {
    timeZone: ITALY_TIMEZONE,
    ...options,
  });
}

export function formatItalyTime(
  date: Date,
  options: Intl.DateTimeFormatOptions = {}
): string {
  return date.toLocaleTimeString(ITALY_LOCALE, {
    timeZone: ITALY_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}

export function formatItalyDateTime(
  date: Date,
  options: Intl.DateTimeFormatOptions = {}
): string {
  return date.toLocaleString(ITALY_LOCALE, {
    timeZone: ITALY_TIMEZONE,
    ...options,
  });
}

export function formatItalyPhotoTimestamp(timestamp: number): string {
  return formatItalyDateTime(new Date(timestamp), {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
