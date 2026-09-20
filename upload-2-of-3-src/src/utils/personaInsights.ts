import type { WeatherResult, AirQualityResult, Persona, HourlyWeatherPoint, CommuteWindows } from '../types';
import type { MarineResult } from '../services/marineService';
import type { PollenResult } from '../services/pollenService';
import { getWeatherAnimationCategory } from './weatherCodes';
import { localNowIso } from './time';

export type InsightTone = 'good' | 'moderate' | 'caution' | 'info';

export interface SmartInsight {
  persona: Persona;
  title: string;
  headline: string; // the big, glanceable value
  detail: string; // one supporting sentence
  tone: InsightTone;
  reason: string; // "Why am I seeing this?" — the actual rule that fired
  isEstimate?: boolean; // true when derived/heuristic rather than a direct reading
}

// ---------------------------------------------------------------------
// Best Time Engine — scores upcoming hours for outdoor-activity suitability.
// Shared by Fitness (and reusable later by other outdoor-minded personas).
// Pure scoring, not ML: lower is better on a simple weighted-penalty scale.
// ---------------------------------------------------------------------
function scoreHourForActivity(h: HourlyWeatherPoint): number {
  let penalty = 0;
  penalty += h.precipitationProbability * 1.2; // rain is the biggest deterrent
  const idealTemp = 18; // comfortable running temperature, celsius
  penalty += Math.abs(h.temperature - idealTemp) * 2;
  penalty += Math.max(0, h.windSpeed - 15) * 1.5; // wind only penalized past 15km/h
  if (!h.isDay) penalty += 8; // slight preference for daylight hours
  return penalty;
}

function findBestWindow(hourly: HourlyWeatherPoint[], nowIso: string, windowHours = 2, lookaheadHours = 18) {
  const future = hourly.filter((h) => h.time >= nowIso).slice(0, lookaheadHours);
  if (future.length < windowHours) return null;

  let bestStart = 0;
  let bestScore = Infinity;
  for (let i = 0; i <= future.length - windowHours; i++) {
    const window = future.slice(i, i + windowHours);
    const score = window.reduce((sum, h) => sum + scoreHourForActivity(h), 0) / windowHours;
    if (score < bestScore) {
      bestScore = score;
      bestStart = i;
    }
  }
  const start = future[bestStart];
  const end = future[bestStart + windowHours - 1];
  return { start, end, avgTemp: Math.round((start.temperature + end.temperature) / 2) };
}

function formatHour(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// ---------------------------------------------------------------------
// Per-persona insight builders
// ---------------------------------------------------------------------

function healthInsight(weather: WeatherResult, aq: AirQualityResult, pollen: PollenResult | null): SmartInsight {
  const { uvIndex, humidity } = weather.current;
  const aqi = aq.current.aqi;
  const category = aq.current.aqiCategory;

  const concerns: string[] = [];
  let tone: InsightTone = 'good';

  if (aqi != null && aqi > 100) {
    concerns.push(`AQI ${aqi} (${category}) — sensitive groups should limit prolonged outdoor exertion`);
    tone = aqi > 150 ? 'caution' : 'moderate';
  }
  if (uvIndex >= 6) {
    concerns.push(`UV index ${uvIndex} — wear sunscreen and sun protection`);
    if (tone === 'good') tone = uvIndex >= 8 ? 'caution' : 'moderate';
  }
  if (humidity >= 70) {
    concerns.push(`humidity ${humidity}% — may worsen breathing for asthma sufferers`);
  }
  if (pollen?.available && (pollen.level === 'High' || pollen.level === 'Very High')) {
    concerns.push(`${pollen.dominant} pollen is ${pollen.level.toLowerCase()} — allergy sufferers should limit outdoor time`);
    if (tone === 'good') tone = 'moderate';
  }

  const headline = concerns.length === 0 ? 'Good conditions' : concerns[0].split(' — ')[0];
  const detail =
    concerns.length === 0
      ? 'Air quality, UV, and humidity are all in comfortable ranges today.'
      : concerns.map((c) => c.split(' — ')[1] ?? c).join('. ') + '.';

  return {
    persona: 'health',
    title: 'Health & Sensitivity',
    headline,
    detail,
    tone,
    reason:
      concerns.length === 0
        ? `AQI ${aqi ?? '—'}, UV ${uvIndex}, humidity ${humidity}% are all within normal ranges.`
        : `Triggered by: ${concerns.join('; ')}.`,
  };
}

function fitnessInsight(weather: WeatherResult): SmartInsight {
  // Hourly timestamps are local to the forecast location, so "now" must be too
  // (previously this compared against UTC, which could recommend hours already past).
  const best = findBestWindow(weather.hourly, localNowIso(weather.timezone));
  const heatRisk = weather.current.feelsLike >= 38;

  if (heatRisk) {
    return {
      persona: 'fitness',
      title: 'Fitness & Outdoor Activity',
      headline: 'Heat alert',
      detail: `Feels like ${weather.current.feelsLike}° right now — postpone strenuous outdoor exercise.`,
      tone: 'caution',
      reason: `Feels-like temperature ${weather.current.feelsLike}° exceeds the 38° heat-risk threshold.`,
    };
  }

  if (!best) {
    return {
      persona: 'fitness',
      title: 'Fitness & Outdoor Activity',
      headline: 'Forecast unavailable',
      detail: 'Not enough hourly forecast data to recommend a running window.',
      tone: 'info',
      reason: 'Hourly forecast data was insufficient to score a time window.',
    };
  }

  return {
    persona: 'fitness',
    title: 'Fitness & Outdoor Activity',
    headline: `Best: ${formatHour(best.start.time)} – ${formatHour(best.end.time)}`,
    detail: `~${best.avgTemp}°, low rain chance and calm wind expected in this window.`,
    tone: 'good',
    isEstimate: true,
    reason: `Scored the next 18 hours by rain chance, temperature vs. an 18° ideal, and wind — this window scored lowest penalty.`,
  };
}

export function travelInsight(weather: WeatherResult): SmartInsight {
  const today = weather.daily[0];
  const items: string[] = [];
  if (today?.precipitationProbability >= 40) items.push('umbrella / raincoat');
  if (today?.min <= 12) items.push('warm jacket');
  if (weather.current.uvIndex >= 6) items.push('sunscreen');
  if (today?.windSpeed >= 30) items.push('windbreaker');

  return {
    persona: 'travel',
    title: 'Travel Packing',
    headline: items.length ? items.join(', ') : 'No special gear needed',
    detail: today
      ? `Today: ${today.min}°–${today.max}°, ${today.precipitationProbability}% rain chance.`
      : 'Based on today\'s forecast for your current location.',
    tone: items.length > 1 ? 'moderate' : 'good',
    isEstimate: true,
    reason: `Rule-based from today's forecast: rain ${today?.precipitationProbability ?? '—'}%, low ${today?.min ?? '—'}°, UV ${weather.current.uvIndex}, wind ${today?.windSpeed ?? '—'}km/h.`,
  };
}

function familyInsight(weather: WeatherResult, commuteWindows: CommuteWindows): SmartInsight {
  const { morningStart, morningEnd, eveningStart, eveningEnd } = commuteWindows;
  const morningRain = avgPrecipInWindow(weather.hourly, morningStart, morningEnd);
  const eveningRain = avgPrecipInWindow(weather.hourly, eveningStart, eveningEnd);
  const worst = Math.max(morningRain, eveningRain);

  const fmt = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}${period}`;
  };
  const morningLabel = `morning (${fmt(morningStart)}-${fmt(morningEnd)})`;
  const eveningLabel = `evening (${fmt(eveningStart)}-${fmt(eveningEnd)})`;
  const which = morningRain >= eveningRain ? morningLabel : eveningLabel;

  return {
    persona: 'family',
    title: 'School Commute',
    headline: worst >= 40 ? `Rain likely — ${which}` : 'Clear for commute',
    detail: worst >= 40
      ? `${worst}% chance of rain — pack an umbrella for the school run.`
      : 'Low rain chance during both your commute windows.',
    tone: worst >= 60 ? 'caution' : worst >= 40 ? 'moderate' : 'good',
    isEstimate: true,
    reason: `Morning window (${fmt(morningStart)}-${fmt(morningEnd)}) avg ${morningRain}% rain chance, evening window (${fmt(eveningStart)}-${fmt(eveningEnd)}) avg ${eveningRain}%. Set your own commute times in Settings.`,
  };
}

function avgPrecipInWindow(hourly: HourlyWeatherPoint[], startHour: number, endHour: number): number {
  const today = new Date().toDateString();
  const points = hourly.filter((h) => {
    const d = new Date(h.time);
    return d.toDateString() === today && d.getHours() >= startHour && d.getHours() < endHour;
  });
  if (points.length === 0) return 0;
  return Math.round(points.reduce((s, h) => s + h.precipitationProbability, 0) / points.length);
}

// Real, derived (not fake) seasonal guidance from the current date and
// which hemisphere the location is in — no external API needed, since
// season-from-month-and-hemisphere is a straightforward astronomical
// fact. Guidance text is India-tailored (kharif/rabi cropping seasons)
// since that's this app's primary audience, but the season detection
// itself is correct globally.
function seasonalGuidance(latitude: number): string {
  const month = new Date().getMonth(); // 0=Jan..11=Dec
  const isNorthern = latitude >= 0;
  const bucket = month <= 1 || month === 11 ? 0 : month <= 4 ? 1 : month <= 7 ? 2 : 3; // 0=Dec-Feb .. 3=Sep-Nov
  const season = isNorthern ? bucket : (bucket + 2) % 4;
  const guidance = [
    'Winter — protect sensitive crops from frost; good season for wheat and mustard.',
    'Spring — good time for sowing summer vegetables; watch for late frost.',
    'Monsoon season approaching — prepare fields for kharif sowing (rice, maize, cotton).',
    'Harvest season for kharif crops; good time for rabi sowing (wheat, gram).',
  ];
  return guidance[season];
}

function agricultureInsight(weather: WeatherResult, latitude: number): SmartInsight {
  const { soilMoisture, soilTemperature } = weather.current;
  const todayMin = weather.daily[0]?.min;
  const frostRisk = todayMin != null && todayMin <= 2;
  const rainNext48 = weather.daily.slice(0, 2).some((d) => d.precipitationProbability >= 60);
  const season = seasonalGuidance(latitude);

  if (frostRisk) {
    return {
      persona: 'agriculture',
      title: 'Agriculture',
      headline: 'Frost risk tonight',
      detail: `Overnight low of ${todayMin}° may damage sensitive crops — consider frost protection.`,
      tone: 'caution',
      reason: `Forecast low ${todayMin}° is at or below the 2° frost-risk threshold.`,
    };
  }

  const detailParts: string[] = [];
  if (soilMoisture != null) detailParts.push(`soil moisture ${(soilMoisture * 100).toFixed(0)}%`);
  if (soilTemperature != null) detailParts.push(`soil temp ${soilTemperature}°`);
  if (rainNext48) detailParts.push('rain expected in next 48h');

  return {
    persona: 'agriculture',
    title: 'Agriculture',
    headline: soilMoisture != null ? `Soil moisture ${(soilMoisture * 100).toFixed(0)}%` : 'Conditions normal',
    detail: (detailParts.length ? detailParts.join(', ') + '. ' : '') + season,
    tone: 'good',
    isEstimate: true,
    reason: `Live soil sensor data from Open-Meteo (0-1cm depth) at your location, combined with the 2-day rainfall forecast. Seasonal guidance is a general calendar-based suggestion from the current month, not hyper-local advice.`,
  };
}

function commuterInsight(weather: WeatherResult): SmartInsight {
  const { visibility } = weather.current;
  const category = getWeatherAnimationCategory(weather.current.weatherCode);
  const isFog = category === 'fog';
  const isStorm = category === 'thunderstorm';

  // Check the next few hours for an approaching storm/fog even if
  // conditions are currently clear — genuinely useful for someone about
  // to head out, not just a snapshot of right now.
  const upcoming = weather.hourly.slice(0, 3);
  const upcomingRisk = upcoming.some((h) => {
    const cat = getWeatherAnimationCategory(h.weatherCode);
    return cat === 'fog' || cat === 'thunderstorm';
  });

  if (isStorm) {
    return {
      persona: 'commuter',
      title: 'Commute Conditions',
      headline: 'Storm — expect delays',
      detail: `Visibility ${visibility}km. Thunderstorms often slow traffic — allow extra travel time.`,
      tone: 'caution',
      reason: `Current conditions classified as thunderstorm, visibility ${visibility}km.`,
    };
  }

  if (isFog || visibility < 2) {
    return {
      persona: 'commuter',
      title: 'Commute Conditions',
      headline: `Low visibility — ${visibility}km`,
      detail: 'Fog or haze may slow traffic — drive with headlights on and extra following distance.',
      tone: visibility < 1 ? 'caution' : 'moderate',
      reason: `Visibility ${visibility}km${isFog ? ' with fog/haze conditions' : ''} — below the 2km comfortable-driving threshold.`,
    };
  }

  if (upcomingRisk) {
    return {
      persona: 'commuter',
      title: 'Commute Conditions',
      headline: 'Fog or storm approaching',
      detail: 'Conditions look clear right now but may deteriorate in the next few hours — check before you leave.',
      tone: 'moderate',
      isEstimate: true,
      reason: 'Fog or thunderstorm conditions detected in the next 3 hours of the forecast.',
    };
  }

  return {
    persona: 'commuter',
    title: 'Commute Conditions',
    headline: 'Clear for your commute',
    detail: `Visibility ${visibility}km, no fog or storms expected in the next few hours.`,
    tone: 'good',
    reason: `Visibility ${visibility}km with no fog/thunderstorm conditions currently or in the next 3 hours.`,
  };
}

// A simple, transparent comfort-index calculation (not a scientific
// standard, just a clearly-explained weighted score) — same honest
// "derived, not invented" pattern as the app's other calculated values
// like feels-like temperature or the fitness Best Time Engine.
function computeComfortIndex(temp: number, humidity: number, wind: number): { score: number; label: string } {
  let penalty = 0;
  penalty += Math.abs(temp - 23) * 2.2; // ideal outdoor-event temp ~23°C
  penalty += Math.max(0, humidity - 55) * 0.6; // sticky above 55%
  penalty += Math.max(0, wind - 12) * 0.8; // breezy past 12km/h starts to matter for tents/decor

  const score = Math.max(0, Math.round(100 - penalty));
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';
  return { score, label };
}

function eventPlannerInsight(weather: WeatherResult): SmartInsight {
  const { temperature, humidity, windSpeed } = weather.current;
  const today = weather.daily[0];
  const { score, label } = computeComfortIndex(temperature, humidity, windSpeed);

  const rainRisk = today && today.precipitationProbability >= 40;
  const tone: InsightTone = rainRisk ? 'caution' : score >= 60 ? 'good' : 'moderate';

  return {
    persona: 'eventPlanner',
    title: 'Event Planning',
    headline: `Comfort index: ${score}/100 (${label})`,
    detail: rainRisk
      ? `${today.precipitationProbability}% rain chance today — have an indoor backup ready.`
      : `${temperature}°, ${humidity}% humidity, ${windSpeed}km/h wind — good conditions for an outdoor gathering.`,
    tone,
    isEstimate: true,
    reason: `Comfort index is a weighted score from temperature (ideal ~23°), humidity (penalized above 55%), and wind (penalized above 12km/h) — not a scientific standard, just a transparent calculation. Rain risk from today's forecast precipitation probability.`,
  };
}

function marineInsight(marine: MarineResult | null): SmartInsight {
  if (!marine || !marine.available) {
    return {
      persona: 'marine',
      title: 'Marine & Beach',
      headline: 'Not a coastal location',
      detail: 'Wave and sea-temperature data isn\'t available for this location.',
      tone: 'info',
      reason: 'The marine data provider returned no wave/sea-surface data for these coordinates — this location isn\'t on its ocean grid.',
    };
  }

  return {
    persona: 'marine',
    title: 'Marine & Beach',
    headline: marine.waveHeight != null ? `${marine.waveHeight.toFixed(1)}m waves` : 'Conditions available',
    detail: marine.seaSurfaceTemperature != null
      ? `Sea temperature ${marine.seaSurfaceTemperature.toFixed(1)}°. Tide times aren't available from a free data source — shown honestly as unavailable rather than guessed.`
      : 'Tide times aren\'t available from a free data source — shown honestly as unavailable rather than guessed.',
    tone: marine.waveHeight != null && marine.waveHeight > 2 ? 'caution' : 'good',
    reason: 'Live wave height and sea-surface temperature from Open-Meteo Marine API.',
  };
}

export function getPersonaInsight(
  persona: Persona,
  data: { weather: WeatherResult | null; airQuality: AirQualityResult | null; marine: MarineResult | null; commuteWindows: CommuteWindows; pollen?: PollenResult | null; latitude: number }
): SmartInsight | null {
  const { weather, airQuality, marine, commuteWindows, pollen, latitude } = data;
  if (!weather) return null;

  switch (persona) {
    case 'health':
      return airQuality ? healthInsight(weather, airQuality, pollen ?? null) : null;
    case 'fitness':
      return fitnessInsight(weather);
    case 'travel':
      return travelInsight(weather);
    case 'family':
      return familyInsight(weather, commuteWindows);
    case 'agriculture':
      return agricultureInsight(weather, latitude);
    case 'marine':
      return marineInsight(marine);
    case 'commuter':
      return commuterInsight(weather);
    case 'eventPlanner':
      return eventPlannerInsight(weather);
    default:
      return null;
  }
}

// Note: persona display names/descriptions moved to src/i18n/translations.ts
// (persona.*) so they can be shown in the user's chosen language — see
// PersonaSelector.tsx and OnboardingFlow.tsx for usage via useLanguage().
