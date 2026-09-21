import type { CurrentWeather } from '../types';
import { tr } from '../i18n/dynamic';

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
  if (w.feelsLike > 28) penalties.push({ label: tr('Hot weather', 'गर्म मौसम'), points: (w.feelsLike - 28) * 3 });
  else if (w.feelsLike < 12) penalties.push({ label: tr('Cold weather', 'ठंडा मौसम'), points: (12 - w.feelsLike) * 2.5 });

  penalties.push({ label: tr('Rain likely', 'बारिश की संभावना'), points: w.precipitationProbability * 0.4 });

  if (w.windSpeed > 20) penalties.push({ label: tr('Strong wind', 'तेज़ हवा'), points: (w.windSpeed - 20) * 1.2 });

  if (aqi !== null && aqi > 50) penalties.push({ label: tr('Poor air quality', 'ख़राब वायु गुणवत्ता'), points: Math.min(45, (aqi - 50) * 0.3) });

  if (w.uvIndex >= 6) penalties.push({ label: tr('High UV', 'तेज़ यूवी'), points: Math.min(20, (w.uvIndex - 5) * 4) });

  if (!w.isDay) penalties.push({ label: tr('After dark', 'अँधेरा हो चुका'), points: 8 });

  const total = penalties.reduce((s, p) => s + p.points, 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - total)));
  const worst = [...penalties].sort((a, b) => b.points - a.points)[0];

  return {
    score,
    label: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor',
    limiting: worst && worst.points >= 8 ? worst.label : null,
  };
}

export const activityScoreRules = (): string =>
  tr(
    'Starts at 100. Subtracts points for: feels-like above 28° or below 12°, rain chance, wind above 20 km/h, AQI above 50, UV 6+, and darkness. Computed from live readings — an estimate, not a measurement.',
    '100 से शुरू होता है। इन बातों पर अंक घटते हैं: महसूस होने वाला तापमान 28° से ऊपर या 12° से नीचे, बारिश की संभावना, 20 किमी/घं से ज़्यादा हवा, AQI 50 से ऊपर, यूवी 6+ और अँधेरा। लाइव रीडिंग से निकाला गया — अनुमान है, माप नहीं।'
  );

export function uvCategory(uv: number): { label: string; color: string } {
  if (uv < 3) return { label: tr('Low', 'कम'), color: '#16a34a' };
  if (uv < 6) return { label: tr('Moderate', 'मध्यम'), color: '#d97706' };
  if (uv < 8) return { label: tr('High', 'ज़्यादा'), color: '#ea580c' };
  if (uv < 11) return { label: tr('Very High', 'बहुत ज़्यादा'), color: '#dc2626' };
  return { label: tr('Extreme', 'अत्यधिक'), color: '#7c3aed' };
}
