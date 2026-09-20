import type { WeatherResult, AirQualityResult, Persona, HourlyWeatherPoint, CommuteWindows } from '../types';
import type { MarineResult } from '../services/marineService';
import type { PollenResult } from '../services/pollenService';
import { getWeatherAnimationCategory } from './weatherCodes';
import { localNowIso } from './time';
import { tr, timeLocale, aqiCat, pollenType, pollenLevel } from '../i18n/dynamic';

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
  return new Date(iso).toLocaleTimeString(timeLocale(), { hour: 'numeric', minute: '2-digit' });
}

// ---------------------------------------------------------------------
// Per-persona insight builders. Every sentence is written in English and
// Hindi side by side via tr(); numbers come straight from live data.
// ---------------------------------------------------------------------

function healthInsight(weather: WeatherResult, aq: AirQualityResult, pollen: PollenResult | null): SmartInsight {
  const { uvIndex, humidity } = weather.current;
  const aqi = aq.current.aqi;
  const category = aq.current.aqiCategory;

  const concerns: string[] = [];
  let tone: InsightTone = 'good';

  if (aqi != null && aqi > 100) {
    concerns.push(tr(`AQI ${aqi} (${aqiCat(category)}) — sensitive groups should limit prolonged outdoor exertion`, `AQI ${aqi} (${aqiCat(category)}) — संवेदनशील समूह लंबी बाहरी मेहनत सीमित करें`));
    tone = aqi > 150 ? 'caution' : 'moderate';
  }
  if (uvIndex >= 6) {
    concerns.push(tr(`UV index ${uvIndex} — wear sunscreen and sun protection`, `यूवी सूचकांक ${uvIndex} — सनस्क्रीन लगाएँ और धूप से बचाव करें`));
    if (tone === 'good') tone = uvIndex >= 8 ? 'caution' : 'moderate';
  }
  if (humidity >= 70) {
    concerns.push(tr(`humidity ${humidity}% — may worsen breathing for asthma sufferers`, `नमी ${humidity}% — अस्थमा के मरीज़ों की साँस बिगड़ सकती है`));
  }
  if (pollen?.available && pollen.level && (pollen.level === 'High' || pollen.level === 'Very High')) {
    concerns.push(
      tr(
        `${pollen.dominant} pollen is ${pollen.level.toLowerCase()} — allergy sufferers should limit outdoor time`,
        `${pollenType(pollen.dominant ?? '')} पराग ${pollenLevel(pollen.level)} है — एलर्जी वाले बाहर कम समय बिताएँ`
      )
    );
    if (tone === 'good') tone = 'moderate';
  }

  const headline = concerns.length === 0 ? tr('Good conditions', 'अच्छे हालात') : concerns[0].split(' — ')[0];
  const detail =
    concerns.length === 0
      ? tr('Air quality, UV, and humidity are all in comfortable ranges today.', 'आज वायु गुणवत्ता, यूवी और नमी आरामदायक सीमा में हैं।')
      : concerns.map((c) => c.split(' — ')[1] ?? c).join(tr('. ', '। ')) + tr('.', '।');

  return {
    persona: 'health',
    title: tr('Health & Sensitivity', 'स्वास्थ्य और संवेदनशीलता'),
    headline,
    detail,
    tone,
    reason:
      concerns.length === 0
        ? tr(`AQI ${aqi ?? '—'}, UV ${uvIndex}, humidity ${humidity}% are all within normal ranges.`, `AQI ${aqi ?? '—'}, यूवी ${uvIndex}, नमी ${humidity}% सभी सामान्य सीमा में हैं।`)
        : tr(`Triggered by: ${concerns.join('; ')}.`, `कारण: ${concerns.join('; ')}।`),
  };
}

function fitnessInsight(weather: WeatherResult): SmartInsight {
  // Hourly timestamps are local to the forecast location, so "now" must be too
  // (previously this compared against UTC, which could recommend hours already past).
  const best = findBestWindow(weather.hourly, localNowIso(weather.timezone));
  const heatRisk = weather.current.feelsLike >= 38;
  const title = tr('Fitness & Outdoor Activity', 'फ़िटनेस और बाहरी गतिविधि');

  if (heatRisk) {
    const f = weather.current.feelsLike;
    return {
      persona: 'fitness',
      title,
      headline: tr('Heat alert', 'गर्मी की चेतावनी'),
      detail: tr(`Feels like ${f}° right now — postpone strenuous outdoor exercise.`, `अभी ${f}° जैसा महसूस हो रहा है — कठिन बाहरी व्यायाम टालें।`),
      tone: 'caution',
      reason: tr(`Feels-like temperature ${f}° exceeds the 38° heat-risk threshold.`, `महसूस होने वाला तापमान ${f}° 38° की गर्मी-जोखिम सीमा से ऊपर है।`),
    };
  }

  if (!best) {
    return {
      persona: 'fitness',
      title,
      headline: tr('Forecast unavailable', 'पूर्वानुमान उपलब्ध नहीं'),
      detail: tr('Not enough hourly forecast data to recommend a running window.', 'दौड़ने का समय सुझाने के लिए घंटेवार पूर्वानुमान डेटा पर्याप्त नहीं है।'),
      tone: 'info',
      reason: tr('Hourly forecast data was insufficient to score a time window.', 'समय-खंड को अंक देने के लिए घंटेवार पूर्वानुमान डेटा पर्याप्त नहीं था।'),
    };
  }

  return {
    persona: 'fitness',
    title,
    headline: tr(`Best: ${formatHour(best.start.time)} – ${formatHour(best.end.time)}`, `सबसे अच्छा: ${formatHour(best.start.time)} – ${formatHour(best.end.time)}`),
    detail: tr(`~${best.avgTemp}°, low rain chance and calm wind expected in this window.`, `इस समय-खंड में ~${best.avgTemp}°, बारिश की कम संभावना और शांत हवा की उम्मीद है।`),
    tone: 'good',
    isEstimate: true,
    reason: tr(
      'Scored the next 18 hours by rain chance, temperature vs. an 18° ideal, and wind — this window scored lowest penalty.',
      'अगले 18 घंटों को बारिश की संभावना, 18° के आदर्श से तापमान के अंतर और हवा के आधार पर अंक दिए — इस समय-खंड को सबसे कम दंड मिला।'
    ),
  };
}

export function travelInsight(weather: WeatherResult): SmartInsight {
  const today = weather.daily[0];
  const items: string[] = [];
  if (today?.precipitationProbability >= 40) items.push(tr('umbrella / raincoat', 'छतरी / रेनकोट'));
  if (today?.min <= 12) items.push(tr('warm jacket', 'गर्म जैकेट'));
  if (weather.current.uvIndex >= 6) items.push(tr('sunscreen', 'सनस्क्रीन'));
  if (today?.windSpeed >= 30) items.push(tr('windbreaker', 'विंडब्रेकर'));

  return {
    persona: 'travel',
    title: tr('Travel Packing', 'यात्रा की पैकिंग'),
    headline: items.length ? items.join(', ') : tr('No special gear needed', 'किसी ख़ास सामान की ज़रूरत नहीं'),
    detail: today
      ? tr(`Today: ${today.min}°–${today.max}°, ${today.precipitationProbability}% rain chance.`, `आज: ${today.min}°–${today.max}°, बारिश की संभावना ${today.precipitationProbability}%।`)
      : tr("Based on today's forecast for your current location.", 'आपके वर्तमान स्थान के आज के पूर्वानुमान पर आधारित।'),
    tone: items.length > 1 ? 'moderate' : 'good',
    isEstimate: true,
    reason: tr(
      `Rule-based from today's forecast: rain ${today?.precipitationProbability ?? '—'}%, low ${today?.min ?? '—'}°, UV ${weather.current.uvIndex}, wind ${today?.windSpeed ?? '—'}km/h.`,
      `आज के पूर्वानुमान से नियम-आधारित: बारिश ${today?.precipitationProbability ?? '—'}%, न्यूनतम ${today?.min ?? '—'}°, यूवी ${weather.current.uvIndex}, हवा ${today?.windSpeed ?? '—'} किमी/घं।`
    ),
  };
}

function familyInsight(weather: WeatherResult, commuteWindows: CommuteWindows): SmartInsight {
  const { morningStart, morningEnd, eveningStart, eveningEnd } = commuteWindows;
  const morningRain = avgPrecipInWindow(weather.hourly, morningStart, morningEnd);
  const eveningRain = avgPrecipInWindow(weather.hourly, eveningStart, eveningEnd);
  const worst = Math.max(morningRain, eveningRain);

  const fmt = (h: number) => {
    const period = h >= 12 ? tr('PM', 'अपराह्न') : tr('AM', 'पूर्वाह्न');
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return tr(`${hour12}${period}`, `${hour12} ${period}`);
  };
  const morningLabel = tr(`morning (${fmt(morningStart)}-${fmt(morningEnd)})`, `सुबह (${fmt(morningStart)}-${fmt(morningEnd)})`);
  const eveningLabel = tr(`evening (${fmt(eveningStart)}-${fmt(eveningEnd)})`, `शाम (${fmt(eveningStart)}-${fmt(eveningEnd)})`);
  const which = morningRain >= eveningRain ? morningLabel : eveningLabel;

  return {
    persona: 'family',
    title: tr('School Commute', 'स्कूल का सफ़र'),
    headline: worst >= 40 ? tr(`Rain likely — ${which}`, `बारिश की संभावना — ${which}`) : tr('Clear for commute', 'सफ़र के लिए साफ़'),
    detail:
      worst >= 40
        ? tr(`${worst}% chance of rain — pack an umbrella for the school run.`, `बारिश की ${worst}% संभावना — स्कूल के रास्ते के लिए छतरी रखें।`)
        : tr('Low rain chance during both your commute windows.', 'आपके दोनों सफ़र के समय में बारिश की संभावना कम है।'),
    tone: worst >= 60 ? 'caution' : worst >= 40 ? 'moderate' : 'good',
    isEstimate: true,
    reason: tr(
      `Morning window (${fmt(morningStart)}-${fmt(morningEnd)}) avg ${morningRain}% rain chance, evening window (${fmt(eveningStart)}-${fmt(eveningEnd)}) avg ${eveningRain}%. Set your own commute times in Settings.`,
      `सुबह का समय (${fmt(morningStart)}-${fmt(morningEnd)}) औसत ${morningRain}% बारिश की संभावना, शाम का समय (${fmt(eveningStart)}-${fmt(eveningEnd)}) औसत ${eveningRain}%। अपना सफ़र का समय सेटिंग्स में तय करें।`
    ),
  };
}

export function avgPrecipInWindow(hourly: HourlyWeatherPoint[], startHour: number, endHour: number): number {
  const today = new Date().toDateString();
  const points = hourly.filter((h) => {
    const d = new Date(h.time);
    return d.toDateString() === today && d.getHours() >= startHour && d.getHours() < endHour;
  });
  if (points.length === 0) return 0;
  return Math.round(points.reduce((s, h) => s + h.precipitationProbability, 0) / points.length);
}

// Real, derived (not fake) seasonal guidance from the current date and which
// hemisphere the location is in. Guidance text is India-tailored (kharif/rabi
// cropping seasons) since that's this app's primary audience, but the season
// detection itself is correct globally.
function seasonalGuidance(latitude: number): string {
  const month = new Date().getMonth(); // 0=Jan..11=Dec
  const isNorthern = latitude >= 0;
  const bucket = month <= 1 || month === 11 ? 0 : month <= 4 ? 1 : month <= 7 ? 2 : 3; // 0=Dec-Feb .. 3=Sep-Nov
  const season = isNorthern ? bucket : (bucket + 2) % 4;
  const guidance = [
    tr('Winter — protect sensitive crops from frost; good season for wheat and mustard.', 'सर्दी — संवेदनशील फसलों को पाले से बचाएँ; गेहूँ और सरसों के लिए अच्छा मौसम।'),
    tr('Spring — good time for sowing summer vegetables; watch for late frost.', 'वसंत — गर्मी की सब्ज़ियों की बुवाई का अच्छा समय; देर से पड़ने वाले पाले पर नज़र रखें।'),
    tr('Monsoon season approaching — prepare fields for kharif sowing (rice, maize, cotton).', 'मानसून आने वाला है — खरीफ़ की बुवाई (धान, मक्का, कपास) के लिए खेत तैयार करें।'),
    tr('Harvest season for kharif crops; good time for rabi sowing (wheat, gram).', 'खरीफ़ फसलों की कटाई का मौसम; रबी बुवाई (गेहूँ, चना) के लिए अच्छा समय।'),
  ];
  return guidance[season];
}

function agricultureInsight(weather: WeatherResult, latitude: number): SmartInsight {
  const { soilMoisture, soilTemperature } = weather.current;
  const todayMin = weather.daily[0]?.min;
  const frostRisk = todayMin != null && todayMin <= 2;
  const rainNext48 = weather.daily.slice(0, 2).some((d) => d.precipitationProbability >= 60);
  const season = seasonalGuidance(latitude);
  const title = tr('Agriculture', 'कृषि');

  if (frostRisk) {
    return {
      persona: 'agriculture',
      title,
      headline: tr('Frost risk tonight', 'आज रात पाले का ख़तरा'),
      detail: tr(
        `Overnight low of ${todayMin}° may damage sensitive crops — consider frost protection.`,
        `रात का न्यूनतम तापमान ${todayMin}° संवेदनशील फसलों को नुक़सान पहुँचा सकता है — पाले से बचाव करें।`
      ),
      tone: 'caution',
      reason: tr(`Forecast low ${todayMin}° is at or below the 2° frost-risk threshold.`, `पूर्वानुमानित न्यूनतम ${todayMin}° पाले के जोखिम की 2° सीमा पर या उससे कम है।`),
    };
  }

  const detailParts: string[] = [];
  if (soilMoisture != null) detailParts.push(tr(`soil moisture ${(soilMoisture * 100).toFixed(0)}%`, `मिट्टी की नमी ${(soilMoisture * 100).toFixed(0)}%`));
  if (soilTemperature != null) detailParts.push(tr(`soil temp ${soilTemperature}°`, `मिट्टी का तापमान ${soilTemperature}°`));
  if (rainNext48) detailParts.push(tr('rain expected in next 48h', 'अगले 48 घंटे में बारिश की उम्मीद'));

  return {
    persona: 'agriculture',
    title,
    headline:
      soilMoisture != null ? tr(`Soil moisture ${(soilMoisture * 100).toFixed(0)}%`, `मिट्टी की नमी ${(soilMoisture * 100).toFixed(0)}%`) : tr('Conditions normal', 'हालात सामान्य'),
    detail: (detailParts.length ? detailParts.join(', ') + tr('. ', '। ') : '') + season,
    tone: 'good',
    isEstimate: true,
    reason: tr(
      'Live soil sensor data from Open-Meteo (0-1cm depth) at your location, combined with the 2-day rainfall forecast. Seasonal guidance is a general calendar-based suggestion from the current month, not hyper-local advice.',
      'आपके स्थान का Open-Meteo का लाइव मिट्टी-सेंसर डेटा (0-1 सेमी गहराई), 2 दिन के बारिश पूर्वानुमान के साथ। मौसमी सलाह मौजूदा महीने पर आधारित सामान्य सुझाव है, बहुत स्थानीय सलाह नहीं।'
    ),
  };
}

function commuterInsight(weather: WeatherResult): SmartInsight {
  const { visibility } = weather.current;
  const category = getWeatherAnimationCategory(weather.current.weatherCode);
  const isFog = category === 'fog';
  const isStorm = category === 'thunderstorm';
  const title = tr('Commute Conditions', 'सफ़र की स्थिति');

  // Check the next few hours for an approaching storm/fog even if conditions are
  // currently clear — useful for someone about to head out.
  const upcoming = weather.hourly.slice(0, 3);
  const upcomingRisk = upcoming.some((h) => {
    const cat = getWeatherAnimationCategory(h.weatherCode);
    return cat === 'fog' || cat === 'thunderstorm';
  });

  if (isStorm) {
    return {
      persona: 'commuter',
      title,
      headline: tr('Storm — expect delays', 'तूफ़ान — देरी की आशंका'),
      detail: tr(
        `Visibility ${visibility}km. Thunderstorms often slow traffic — allow extra travel time.`,
        `दृश्यता ${visibility} किमी। गरज-तूफ़ान अक्सर यातायात धीमा कर देते हैं — यात्रा में अतिरिक्त समय रखें।`
      ),
      tone: 'caution',
      reason: tr(`Current conditions classified as thunderstorm, visibility ${visibility}km.`, `मौजूदा हालात गरज-तूफ़ान के रूप में वर्गीकृत, दृश्यता ${visibility} किमी।`),
    };
  }

  if (isFog || visibility < 2) {
    return {
      persona: 'commuter',
      title,
      headline: tr(`Low visibility — ${visibility}km`, `कम दृश्यता — ${visibility} किमी`),
      detail: tr(
        'Fog or haze may slow traffic — drive with headlights on and extra following distance.',
        'कोहरा या धुंध यातायात धीमा कर सकती है — हेडलाइट जलाकर और आगे वाली गाड़ी से ज़्यादा दूरी रखकर चलाएँ।'
      ),
      tone: visibility < 1 ? 'caution' : 'moderate',
      reason: tr(
        `Visibility ${visibility}km${isFog ? ' with fog/haze conditions' : ''} — below the 2km comfortable-driving threshold.`,
        `दृश्यता ${visibility} किमी${isFog ? ' (कोहरा/धुंध के साथ)' : ''} — आराम से ड्राइविंग की 2 किमी सीमा से कम।`
      ),
    };
  }

  if (upcomingRisk) {
    return {
      persona: 'commuter',
      title,
      headline: tr('Fog or storm approaching', 'कोहरा या तूफ़ान आ रहा है'),
      detail: tr(
        'Conditions look clear right now but may deteriorate in the next few hours — check before you leave.',
        'अभी हालात साफ़ दिखते हैं पर अगले कुछ घंटों में बिगड़ सकते हैं — निकलने से पहले देख लें।'
      ),
      tone: 'moderate',
      isEstimate: true,
      reason: tr('Fog or thunderstorm conditions detected in the next 3 hours of the forecast.', 'पूर्वानुमान के अगले 3 घंटों में कोहरे या गरज-तूफ़ान के हालात दिखे।'),
    };
  }

  return {
    persona: 'commuter',
    title,
    headline: tr('Clear for your commute', 'आपके सफ़र के लिए साफ़'),
    detail: tr(`Visibility ${visibility}km, no fog or storms expected in the next few hours.`, `दृश्यता ${visibility} किमी, अगले कुछ घंटों में कोहरे या तूफ़ान की उम्मीद नहीं।`),
    tone: 'good',
    reason: tr(
      `Visibility ${visibility}km with no fog/thunderstorm conditions currently or in the next 3 hours.`,
      `दृश्यता ${visibility} किमी, अभी या अगले 3 घंटों में कोहरा/गरज-तूफ़ान नहीं।`
    ),
  };
}

// A simple, transparent comfort-index calculation (not a scientific standard,
// just a clearly-explained weighted score) — same honest "derived, not
// invented" pattern as the app's other calculated values.
export function computeComfortIndex(temp: number, humidity: number, wind: number): { score: number; label: string } {
  let penalty = 0;
  penalty += Math.abs(temp - 23) * 2.2; // ideal outdoor-event temp ~23°C
  penalty += Math.max(0, humidity - 55) * 0.6; // sticky above 55%
  penalty += Math.max(0, wind - 12) * 0.8; // breezy past 12km/h starts to matter for tents/decor

  const score = Math.max(0, Math.round(100 - penalty));
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';
  return { score, label };
}

const COMFORT_LABEL_HI: Record<string, string> = { Excellent: 'उत्कृष्ट', Good: 'अच्छा', Fair: 'ठीक-ठाक', Poor: 'ख़राब' };

function eventPlannerInsight(weather: WeatherResult): SmartInsight {
  const { temperature, humidity, windSpeed } = weather.current;
  const today = weather.daily[0];
  const { score, label } = computeComfortIndex(temperature, humidity, windSpeed);

  const rainRisk = today && today.precipitationProbability >= 40;
  const tone: InsightTone = rainRisk ? 'caution' : score >= 60 ? 'good' : 'moderate';

  return {
    persona: 'eventPlanner',
    title: tr('Event Planning', 'आयोजन की योजना'),
    headline: tr(`Comfort index: ${score}/100 (${label})`, `कंफ़र्ट इंडेक्स: ${score}/100 (${COMFORT_LABEL_HI[label] ?? label})`),
    detail: rainRisk
      ? tr(`${today.precipitationProbability}% rain chance today — have an indoor backup ready.`, `आज बारिश की ${today.precipitationProbability}% संभावना — अंदर का विकल्प तैयार रखें।`)
      : tr(
          `${temperature}°, ${humidity}% humidity, ${windSpeed}km/h wind — good conditions for an outdoor gathering.`,
          `${temperature}°, नमी ${humidity}%, हवा ${windSpeed} किमी/घं — बाहरी आयोजन के लिए अच्छे हालात।`
        ),
    tone,
    isEstimate: true,
    reason: tr(
      "Comfort index is a weighted score from temperature (ideal ~23°), humidity (penalized above 55%), and wind (penalized above 12km/h) — not a scientific standard, just a transparent calculation. Rain risk from today's forecast precipitation probability.",
      'कंफ़र्ट इंडेक्स तापमान (आदर्श ~23°), नमी (55% से ऊपर दंड) और हवा (12 किमी/घं से ऊपर दंड) से बना भारित स्कोर है — यह वैज्ञानिक मानक नहीं, सिर्फ़ एक पारदर्शी गणना है। बारिश का जोखिम आज के पूर्वानुमान की वर्षा-संभावना से।'
    ),
  };
}

function marineInsight(marine: MarineResult | null): SmartInsight {
  const title = tr('Marine & Beach', 'समुद्र और तट');
  if (!marine || !marine.available) {
    return {
      persona: 'marine',
      title,
      headline: tr('Not a coastal location', 'तटीय स्थान नहीं'),
      detail: tr("Wave and sea-temperature data isn't available for this location.", 'इस स्थान के लिए लहरों और समुद्री तापमान का डेटा उपलब्ध नहीं है।'),
      tone: 'info',
      reason: tr(
        "The marine data provider returned no wave/sea-surface data for these coordinates — this location isn't on its ocean grid.",
        'समुद्री डेटा प्रदाता ने इन निर्देशांकों के लिए लहरों/समुद्र-सतह का डेटा नहीं दिया — यह स्थान उसके समुद्री ग्रिड पर नहीं है।'
      ),
    };
  }

  const tide = tr(
    "Tide times aren't available from a free data source — shown honestly as unavailable rather than guessed.",
    'ज्वार का समय किसी मुफ़्त डेटा स्रोत से उपलब्ध नहीं — अनुमान लगाने के बजाय ईमानदारी से "उपलब्ध नहीं" दिखाया गया है।'
  );
  return {
    persona: 'marine',
    title,
    headline:
      marine.waveHeight != null ? tr(`${marine.waveHeight.toFixed(1)}m waves`, `${marine.waveHeight.toFixed(1)} मी की लहरें`) : tr('Conditions available', 'हालात उपलब्ध'),
    detail:
      marine.seaSurfaceTemperature != null
        ? tr(`Sea temperature ${marine.seaSurfaceTemperature.toFixed(1)}°. ${tide}`, `समुद्र का तापमान ${marine.seaSurfaceTemperature.toFixed(1)}°। ${tide}`)
        : tide,
    tone: marine.waveHeight != null && marine.waveHeight > 2 ? 'caution' : 'good',
    reason: tr('Live wave height and sea-surface temperature from Open-Meteo Marine API.', 'Open-Meteo Marine API से लहरों की ऊँचाई और समुद्र-सतह का तापमान (लाइव)।'),
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

// Note: persona display names/descriptions live in src/i18n/translations.ts (persona.*).
