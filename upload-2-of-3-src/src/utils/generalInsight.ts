import type { AirQualityResult, WeatherResult } from '../types';
import { localNowIso } from './time';
import type { InsightTone } from './personaInsights';

/**
 * The "General" (no persona selected) summary. Plain rules over real live
 * readings — no invented data.
 */
export function generalInsight(weather: WeatherResult, aq: AirQualityResult | null): { headline: string; detail: string; tone: InsightTone; reason: string } {
  const c = weather.current;
  const now = localNowIso(weather.timezone).slice(0, 13);
  const next6 = weather.hourly.filter((h) => h.time.slice(0, 13) >= now).slice(0, 6);
  const maxRain = next6.reduce((m, h) => Math.max(m, h.precipitationProbability), 0);
  const aqi = aq?.current.aqi ?? null;

  if (maxRain >= 60) {
    return {
      headline: 'Carry an umbrella',
      detail: `Up to ${Math.round(maxRain)}% chance of rain in the next 6 hours.`,
      tone: 'moderate',
      reason: 'Highest hourly rain probability in the next 6 hours is 60% or more.',
    };
  }
  if (aqi !== null && aqi > 150) {
    return {
      headline: 'Air quality is poor',
      detail: `AQI ${Math.round(aqi)} (${aq?.current.aqiCategory}). Limit long time outdoors.`,
      tone: 'caution',
      reason: 'US AQI is above 150.',
    };
  }
  if (c.feelsLike >= 38) {
    return {
      headline: 'Very hot outside',
      detail: `Feels like ${Math.round(c.feelsLike)}°. Stay hydrated and avoid midday sun.`,
      tone: 'caution',
      reason: 'Feels-like temperature is 38° or higher.',
    };
  }
  if (c.feelsLike <= 5) {
    return {
      headline: 'Cold today',
      detail: `Feels like ${Math.round(c.feelsLike)}°. Dress in warm layers.`,
      tone: 'moderate',
      reason: 'Feels-like temperature is 5° or lower.',
    };
  }
  return {
    headline: 'Comfortable conditions',
    detail: `${c.condition}, around ${Math.round(c.temperature)}° with a ${Math.round(maxRain)}% chance of rain soon.`,
    tone: 'good',
    reason: 'No rain, heat, cold or air-quality thresholds were crossed.',
  };
}
