/**
 * Open-Meteo returns hourly timestamps as *local time at the forecast
 * location* with no UTC offset (e.g. "2026-09-20T18:00"). To compare
 * "now" against them correctly, "now" must be expressed in that same
 * location's timezone — not the device's, and not UTC.
 */
export function localNowIso(timeZone: string | undefined): string {
  try {
    // sv-SE formats as "YYYY-MM-DD HH:mm:ss" which is trivially ISO-like.
    const s = new Date().toLocaleString('sv-SE', { timeZone });
    return s.replace(' ', 'T').slice(0, 16);
  } catch {
    return new Date().toISOString().slice(0, 16);
  }
}

/** Current hour (0-23) at the forecast location. */
export function localHour(timeZone: string | undefined): number {
  const iso = localNowIso(timeZone);
  return Number(iso.slice(11, 13));
}

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

export function dayPart(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}
