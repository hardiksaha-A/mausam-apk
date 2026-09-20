import type { CurrentWeather } from '../types';

export interface ActivityScore {
  score: number; // 0-100
  label: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  /** The single biggest thing pulling the score down, or null if nothing notable. */
  limiting: string | null;
}

/**
 * Outdoor Activity Score — a transparent, rule-based composite of REAL live
 * readings (temperature, rain chance, wind, AQI, UV, daylight). It is a
 * derived estimate, not a measured quantity, and the UI labels it as such
 * with the exact rules below. Starts at 100 and subtracts penalties.
 */
export function computeActivityScore(w: CurrentWeather, aqi: number | null): ActivityScore {
  const penalties: { label: string; points: number }[] = [];

  // Comfortable "feels like" band: 12-28°C.
  if (w.feelsLike > 28) penalties.push({ label: 'Hot weather', points: (w.feelsLike - 28) * 3 });
  else if (w.feelsLike < 12) penalties.push({ label: 'Cold weather', points: (12 - w.feelsLike) * 2.5 });

  penalties.push({ label: 'Rain likely', points: w.precipitationProbability * 0.4 });

  if (w.windSpeed > 20) penalties.push({ label: 'Strong wind', points: (w.windSpeed - 20) * 1.2 });

  if (aqi !== null && aqi > 50) penalties.push({ label: 'Poor air quality', points: Math.min(45, (aqi - 50) * 0.3) });

  if (w.uvIndex >= 6) penalties.push({ label: 'High UV', points: Math.min(20, (w.uvIndex - 5) * 4) });

  if (!w.isDay) penalties.push({ label: 'After dark', points: 8 });

  const total = penalties.reduce((s, p) => s + p.points, 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - total)));
  const worst = [...penalties].sort((a, b) => b.points - a.points)[0];

  return {
    score,
    label: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor',
    limiting: worst && worst.points >= 8 ? worst.label : null,
  };
}

export const ACTIVITY_SCORE_RULES =
  'Starts at 100. Subtracts points for: feels-like above 28° or below 12°, rain chance, wind above 20 km/h, AQI above 50, UV 6+, and darkness. Computed from live readings — an estimate, not a measurement.';

export function uvCategory(uv: number): { label: string; color: string } {
  if (uv < 3) return { label: 'Low', color: '#16a34a' };
  if (uv < 6) return { label: 'Moderate', color: '#d97706' };
  if (uv < 8) return { label: 'High', color: '#ea580c' };
  if (uv < 11) return { label: 'Very High', color: '#dc2626' };
  return { label: 'Extreme', color: '#7c3aed' };
}
