import type { AirQualityResult, WeatherResult } from '../types';
import { localNowIso } from './time';
import { tr, cond, aqiCat } from '../i18n/dynamic';
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
      headline: tr('Carry an umbrella', 'छतरी साथ रखें'),
      detail: tr(`Up to ${Math.round(maxRain)}% chance of rain in the next 6 hours.`, `अगले 6 घंटों में बारिश की संभावना ${Math.round(maxRain)}% तक।`),
      tone: 'moderate',
      reason: tr('Highest hourly rain probability in the next 6 hours is 60% or more.', 'अगले 6 घंटों में घंटेवार बारिश की सबसे ज़्यादा संभावना 60% या उससे अधिक है।'),
    };
  }
  if (aqi !== null && aqi > 150) {
    return {
      headline: tr('Air quality is poor', 'हवा की गुणवत्ता ख़राब है'),
      detail: tr(`AQI ${Math.round(aqi)} (${aq?.current.aqiCategory}). Limit long time outdoors.`, `AQI ${Math.round(aqi)} (${aqiCat(aq?.current.aqiCategory ?? 'Unknown')})। बाहर ज़्यादा समय न बिताएँ।`),
      tone: 'caution',
      reason: tr('US AQI is above 150.', 'US AQI 150 से ऊपर है।'),
    };
  }
  if (c.feelsLike >= 38) {
    return {
      headline: tr('Very hot outside', 'बाहर बहुत गर्मी है'),
      detail: tr(`Feels like ${Math.round(c.feelsLike)}°. Stay hydrated and avoid midday sun.`, `${Math.round(c.feelsLike)}° जैसा महसूस हो रहा है। पानी पीते रहें और दोपहर की धूप से बचें।`),
      tone: 'caution',
      reason: tr('Feels-like temperature is 38° or higher.', 'महसूस होने वाला तापमान 38° या उससे अधिक है।'),
    };
  }
  if (c.feelsLike <= 5) {
    return {
      headline: tr('Cold today', 'आज ठंड है'),
      detail: tr(`Feels like ${Math.round(c.feelsLike)}°. Dress in warm layers.`, `${Math.round(c.feelsLike)}° जैसा महसूस हो रहा है। गर्म कपड़े परतों में पहनें।`),
      tone: 'moderate',
      reason: tr('Feels-like temperature is 5° or lower.', 'महसूस होने वाला तापमान 5° या उससे कम है।'),
    };
  }
  return {
    headline: tr('Comfortable conditions', 'आरामदायक हालात'),
    detail: tr(`${c.condition}, around ${Math.round(c.temperature)}° with a ${Math.round(maxRain)}% chance of rain soon.`, `${cond(c.condition)}, लगभग ${Math.round(c.temperature)}° और जल्द बारिश की ${Math.round(maxRain)}% संभावना।`),
    tone: 'good',
    reason: tr('No rain, heat, cold or air-quality thresholds were crossed.', 'बारिश, गर्मी, ठंड या वायु गुणवत्ता की कोई सीमा पार नहीं हुई।'),
  };
}
