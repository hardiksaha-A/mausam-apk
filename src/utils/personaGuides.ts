import type { AirQualityResult, CommuteWindows, Persona, WeatherResult } from '../types';
import type { MarineResult } from '../services/marineService';
import type { PollenResult } from '../services/pollenService';
import { avgPrecipInWindow, computeComfortIndex } from './personaInsights';
import { tr, pollenType, pollenLevel } from '../i18n/dynamic';

/**
 * "Know your numbers" — for each persona, the few readings that matter to
 * them, each on a standard scale: what is BEST, which zone the live value is
 * in right now (green -> red), and what to do about it.
 *
 * Every threshold is a published/standard scale (US EPA AQI, WHO UV Index,
 * Beaufort wind, meteorological visibility, general beach-safety wave
 * guidance) or one of this app's own documented rules. This is general
 * guidance, not medical advice — the UI says so.
 */
export type LT = { en: string; hi: string };

export interface Band {
  upTo: number; // value <= upTo falls in this band
  color: string;
  label: LT;
  advice: LT;
}

export interface Gauge {
  kind: 'gauge';
  id: string;
  label: LT;
  value: number | null; // in base units (°C, km/h, km, m, %)
  unit: string; // display unit, already for the chosen unit system
  conv: (v: number) => number; // base -> display units
  decimals: number;
  integer?: boolean; // integer scale (AQI, %): ranges read 51–100, not 50–100
  lowerOpen?: boolean; // first band has no lower limit (temperatures)
  min: number;
  max: number;
  bands: Band[];
  best: LT;
  source: LT;
  note?: LT;
}

export interface Note {
  kind: 'note';
  id: string;
  label: LT;
  text: LT;
}

export type GuideItem = Gauge | Note;

export interface GuideContext {
  weather: WeatherResult;
  airQuality: AirQualityResult | null;
  marine: MarineResult | null;
  pollen: PollenResult | null;
  commuteWindows: CommuteWindows;
  units: 'metric' | 'imperial';
}

const G = '#22c55e', LG = '#84cc16', Y = '#eab308', O = '#f97316', R = '#ef4444', P = '#a855f7', M = '#7f1d1d';
const BL = '#3b82f6', LB = '#38bdf8', IN = '#6366f1';

const b = (upTo: number, color: string, en: string, hi: string, enAdv: string, hiAdv: string): Band => ({
  upTo, color, label: { en, hi }, advice: { en: enAdv, hi: hiAdv },
});

// ------------------------------------------------------------------ shared band sets

type AqiKind = 'health' | 'fitness' | 'family';
function aqiBands(kind: AqiKind): Band[] {
  const adv: Record<AqiKind, [LT, LT, LT, LT]> = {
    health: [
      { en: 'Air is clean — the best time for everyone, including people with asthma or allergies.', hi: 'हवा साफ़ है — अस्थमा या एलर्जी वालों समेत सबके लिए सबसे अच्छा समय।' },
      { en: 'Acceptable for most people. Unusually sensitive people may notice symptoms — keep your inhaler handy.', hi: 'ज़्यादातर लोगों के लिए ठीक। बहुत संवेदनशील लोगों को तकलीफ़ हो सकती है — इनहेलर पास रखें।' },
      { en: 'Children, older adults and people with asthma, heart or lung disease should spend less time outdoors.', hi: 'बच्चे, बुज़ुर्ग और अस्थमा, हृदय या फेफड़ों के रोगी बाहर कम समय बिताएँ।' },
      { en: 'Everyone may feel effects. Avoid outdoor exertion; sensitive people should stay indoors. A well-fitted N95 mask helps outside.', hi: 'सभी पर असर हो सकता है। बाहर मेहनत से बचें; संवेदनशील लोग घर में रहें। बाहर N95 मास्क मदद करता है।' },
    ],
    fitness: [
      { en: 'Ideal for any outdoor workout.', hi: 'किसी भी बाहरी वर्कआउट के लिए आदर्श।' },
      { en: 'Fine to exercise. If you feel throat irritation or cough, ease off.', hi: 'व्यायाम ठीक है। गले में जलन या खाँसी हो तो रफ़्तार कम करें।' },
      { en: 'Do light workouts, shorten hard sessions, or move indoors.', hi: 'हल्का व्यायाम करें, कठिन सत्र छोटे करें या घर के अंदर करें।' },
      { en: 'Skip outdoor workouts today — exercise indoors.', hi: 'आज बाहरी वर्कआउट छोड़ें — घर के अंदर व्यायाम करें।' },
    ],
    family: [
      { en: 'Safe for children to play outside all day.', hi: 'बच्चे पूरे दिन बाहर खेल सकते हैं।' },
      { en: 'Fine for outdoor play; keep an eye on children with asthma.', hi: 'बाहर खेलना ठीक है; अस्थमा वाले बच्चों पर नज़र रखें।' },
      { en: 'Limit long outdoor play and sports for children.', hi: 'बच्चों का लंबा बाहरी खेल और खेल-कूद सीमित करें।' },
      { en: 'Keep children indoors; postpone outdoor sports and assemblies.', hi: 'बच्चों को घर के अंदर रखें; बाहरी खेल और सभाएँ टालें।' },
    ],
  };
  const [a1, a2, a3, a4] = adv[kind];
  return [
    b(50, G, 'Good', 'अच्छा', a1.en, a1.hi),
    b(100, Y, 'Moderate', 'मध्यम', a2.en, a2.hi),
    b(150, O, 'Unhealthy for sensitive groups', 'संवेदनशील समूहों के लिए अस्वस्थ', a3.en, a3.hi),
    b(200, R, 'Unhealthy (red)', 'अस्वस्थ (लाल)', a4.en, a4.hi),
    b(300, P, 'Very unhealthy', 'बहुत अस्वस्थ',
      'Health alert: everyone should avoid outdoor activity. Keep windows closed; run an air purifier if you have one.',
      'स्वास्थ्य चेतावनी: सभी बाहर की गतिविधि से बचें। खिड़कियाँ बंद रखें; एयर प्यूरीफ़ायर हो तो चलाएँ।'),
    b(Infinity, M, 'Hazardous', 'ख़तरनाक',
      'Emergency conditions. Stay indoors, seal windows and avoid all outdoor exertion.',
      'आपात स्थिति। घर में रहें, खिड़कियाँ बंद करें और बाहर की हर मेहनत से बचें।'),
  ];
}

const UV_BANDS: Band[] = [
  b(2, G, 'Low', 'कम', 'No protection needed for most people.', 'ज़्यादातर लोगों को सुरक्षा की ज़रूरत नहीं।'),
  b(5, Y, 'Moderate', 'मध्यम', 'Wear sunglasses and SPF 30+ sunscreen; take shade around midday.', 'चश्मा और SPF 30+ सनस्क्रीन लगाएँ; दोपहर में छाँव लें।'),
  b(7, O, 'High', 'ज़्यादा', 'Cover up, use SPF 30+ and reapply every 2 hours; limit sun between 10 am and 4 pm.', 'शरीर ढकें, SPF 30+ लगाएँ और हर 2 घंटे में दोहराएँ; सुबह 10 से शाम 4 बजे के बीच धूप कम लें।'),
  b(10, R, 'Very high (red)', 'बहुत ज़्यादा (लाल)', 'Extra protection needed. Avoid the sun in the middle of the day.', 'अतिरिक्त सुरक्षा ज़रूरी। दिन के बीच में धूप से बचें।'),
  b(Infinity, P, 'Extreme', 'अत्यधिक', 'Skin can burn in minutes. Stay indoors at midday and cover fully outside.', 'त्वचा मिनटों में जल सकती है। दोपहर में घर में रहें और बाहर पूरा ढकें।'),
];

const WIND_BANDS: Band[] = [
  b(19, G, 'Light', 'हल्की', 'Comfortable for any activity.', 'हर गतिविधि के लिए आरामदायक।'),
  b(38, Y, 'Breezy', 'तेज़ हवा', 'Noticeable headwind — cyclists and kite flyers take care.', 'सामने की हवा महसूस होगी — साइकिल चलाने वाले सावधान रहें।'),
  b(61, O, 'Strong', 'तेज़', 'Hard to run or cycle; loose objects can blow around.', 'दौड़ना या साइकिल चलाना कठिन; ढीली चीज़ें उड़ सकती हैं।'),
  b(Infinity, R, 'Gale-force (red)', 'आँधी जैसी (लाल)', 'Unsafe outdoors — stay in.', 'बाहर असुरक्षित — घर में रहें।'),
];

const RAIN_GENERAL: Band[] = [
  b(20, G, 'Low', 'कम', 'Very likely dry.', 'लगभग सूखा रहने की संभावना।'),
  b(40, Y, 'Some chance', 'थोड़ी संभावना', 'Carry a light umbrella if you will be out for long.', 'देर तक बाहर रहें तो हल्की छतरी रखें।'),
  b(70, O, 'Likely', 'संभावित', 'Pack an umbrella or raincoat.', 'छतरी या रेनकोट साथ रखें।'),
  b(Infinity, R, 'Very likely (red)', 'बहुत संभावित (लाल)', 'Plan for rain — expect wet roads and delays.', 'बारिश की तैयारी रखें — गीली सड़कें और देरी संभव।'),
];

const FEELS_EXERCISE: Band[] = [
  b(5, BL, 'Cold', 'ठंड', 'Warm up well and wear layers; muscles stay stiff for longer.', 'अच्छी तरह वार्म-अप करें और परतों में कपड़े पहनें; मांसपेशियाँ देर तक अकड़ी रहती हैं।'),
  b(10, LB, 'Cool', 'ठंडा', 'Good for long runs with a light layer.', 'हल्की परत के साथ लंबी दौड़ के लिए अच्छा।'),
  b(22, G, 'Ideal', 'आदर्श', 'The best range for running and hard training.', 'दौड़ने और कठिन ट्रेनिंग के लिए सबसे अच्छी सीमा।'),
  b(30, Y, 'Warm', 'गर्म', 'Drink more, slow your pace and prefer morning or evening.', 'ज़्यादा पानी पिएँ, रफ़्तार धीमी रखें और सुबह या शाम चुनें।'),
  b(38, O, 'Hot', 'बहुत गर्म', 'Shorten sessions, carry water and avoid midday.', 'सत्र छोटे करें, पानी साथ रखें और दोपहर से बचें।'),
  b(Infinity, R, 'Dangerous heat (red)', 'ख़तरनाक गर्मी (लाल)', 'Risk of heat illness — postpone strenuous outdoor exercise (this is the app\'s heat alert).', 'लू लगने का ख़तरा — कठिन बाहरी व्यायाम टालें (यही ऐप की गर्मी चेतावनी है)।'),
];

const VIS_BANDS: Band[] = [
  b(1, R, 'Dense fog (red)', 'घना कोहरा (लाल)', 'Very dangerous to drive — use fog lights, slow right down, or delay the trip.', 'गाड़ी चलाना बहुत ख़तरनाक — फ़ॉग लाइट जलाएँ, बहुत धीमे चलें या यात्रा टालें।'),
  b(2, O, 'Fog or haze', 'कोहरा या धुंध', 'Slow down, headlights on and keep extra distance (below 2 km is the app\'s low-visibility alert).', 'गति कम करें, हेडलाइट जलाएँ और ज़्यादा दूरी रखें (2 किमी से कम ऐप की कम-दृश्यता चेतावनी है)।'),
  b(5, Y, 'Misty', 'हल्की धुंध', 'View is slightly reduced — drive with care.', 'दृश्यता थोड़ी कम — सावधानी से चलाएँ।'),
  b(10, LG, 'Fair', 'ठीक-ठाक', 'Good enough for normal driving.', 'सामान्य ड्राइविंग के लिए ठीक।'),
  b(Infinity, G, 'Clear', 'साफ़', 'Clear view of the road ahead.', 'आगे की सड़क साफ़ दिखती है।'),
];

const HUMIDITY_BANDS: Band[] = [
  b(30, Y, 'Dry', 'सूखी', 'Dry air can irritate skin, eyes and airways — drink water.', 'सूखी हवा त्वचा, आँखों और साँस की नली में जलन कर सकती है — पानी पिएँ।'),
  b(60, G, 'Comfortable', 'आरामदायक', 'The comfort range for most people.', 'ज़्यादातर लोगों के लिए आरामदायक सीमा।'),
  b(70, Y, 'Humid', 'उमस', 'Feels sticky; sweat evaporates slowly.', 'चिपचिपा लगता है; पसीना धीरे सूखता है।'),
  b(100, O, 'Very humid', 'बहुत उमस', 'Heat feels worse — take breaks in shade or AC; mould and dust mites thrive.', 'गर्मी ज़्यादा लगती है — छाँव या AC में आराम करें; फफूँद और धूल के कण बढ़ते हैं।'),
];

// ------------------------------------------------------------------ gauge builders

const id = (v: number) => v;
const f2c = (c: number) => (c * 9) / 5 + 32;
const kmh2mph = (v: number) => v * 0.621371;
const km2mi = (v: number) => v * 0.621371;
const m2ft = (v: number) => v * 3.28084;

function tempGauge(idn: string, label: LT, value: number | null, bands: Band[], best: LT, source: LT, u: GuideContext['units'], note?: LT): Gauge {
  return { kind: 'gauge', id: idn, label, value, unit: u === 'imperial' ? '°F' : '°C', conv: u === 'imperial' ? f2c : id, decimals: 0, lowerOpen: true, min: -10, max: 50, bands, best, source, note };
}

function withRange<T extends Gauge>(g: T, min: number, max: number): T {
  g.min = min;
  g.max = max;
  return g;
}

function windGauge(idn: string, label: LT, value: number, bands: Band[], best: LT, source: LT, u: GuideContext['units'], max = 80): Gauge {
  return { kind: 'gauge', id: idn, label, value, unit: u === 'imperial' ? tr('mph', 'मील/घं') : tr('km/h', 'किमी/घं'), conv: u === 'imperial' ? kmh2mph : id, decimals: 0, min: 0, max, bands, best, source };
}

function aqiGauge(ctx: GuideContext, kind: AqiKind): Gauge {
  const aqi = ctx.airQuality?.current.aqi;
  return {
    kind: 'gauge', id: 'aqi', label: { en: 'Air Quality (US AQI)', hi: 'वायु गुणवत्ता (US AQI)' },
    value: aqi == null ? null : Math.round(aqi), unit: '', conv: id, decimals: 0, integer: true, min: 0, max: 300,
    bands: aqiBands(kind),
    best: { en: 'Best: 0–50 (green). Lower is better; 151+ is red.', hi: 'सबसे अच्छा: 0–50 (हरा)। जितना कम उतना बेहतर; 151+ लाल है।' },
    source: { en: 'US EPA Air Quality Index bands', hi: 'US EPA वायु गुणवत्ता सूचकांक की श्रेणियाँ' },
  };
}

function uvGauge(ctx: GuideContext): Gauge {
  return {
    kind: 'gauge', id: 'uv', label: { en: 'UV Index', hi: 'यूवी सूचकांक' },
    value: ctx.weather.current.uvIndex, unit: '', conv: id, decimals: 0, integer: true, min: 0, max: 12,
    bands: UV_BANDS,
    best: { en: 'Best: 0–2 (green). At 6+ protect your skin; 8+ is red.', hi: 'सबसे अच्छा: 0–2 (हरा)। 6+ पर त्वचा की सुरक्षा करें; 8+ लाल है।' },
    source: { en: 'WHO Global Solar UV Index', hi: 'WHO वैश्विक सौर यूवी सूचकांक' },
  };
}

function rainGauge(idn: string, label: LT, value: number, bands: Band[], best: LT): Gauge {
  return {
    kind: 'gauge', id: idn, label, value, unit: '%', conv: id, decimals: 0, integer: true, min: 0, max: 100, bands, best,
    source: { en: 'Forecast precipitation probability', hi: 'पूर्वानुमानित वर्षा की संभावना' },
  };
}

function humidityGauge(ctx: GuideContext): Gauge {
  return {
    kind: 'gauge', id: 'humidity', label: { en: 'Humidity', hi: 'नमी' },
    value: ctx.weather.current.humidity, unit: '%', conv: id, decimals: 0, integer: true, min: 0, max: 100, bands: HUMIDITY_BANDS,
    best: { en: 'Best: 30–60% (green).', hi: 'सबसे अच्छा: 30–60% (हरा)।' },
    source: { en: 'General indoor/outdoor comfort ranges', hi: 'सामान्य आराम की सीमाएँ' },
  };
}

const MOISTURE_BANDS: Band[] = [
  b(10, R, 'Very dry (red)', 'बहुत सूखी (लाल)', 'Surface is dry — irrigate newly sown seed and seedlings.', 'सतह सूखी है — नई बोई फसल और पौधों की सिंचाई करें।'),
  b(20, O, 'Dry', 'सूखी', 'Light irrigation recommended if no rain is due.', 'बारिश न हो तो हल्की सिंचाई करें।'),
  b(35, G, 'Good', 'अच्छी', 'Good moisture for germination and most crops.', 'अंकुरण और ज़्यादातर फसलों के लिए अच्छी नमी।'),
  b(45, Y, 'Wet', 'गीली', 'Hold off irrigation and avoid working heavy soil.', 'सिंचाई रोकें और भारी मिट्टी में काम न करें।'),
  b(Infinity, IN, 'Waterlogged', 'जलभराव', 'Very wet — check drainage to protect roots.', 'बहुत गीली — जड़ों को बचाने के लिए निकासी जाँचें।'),
];

const FROST_BANDS: Band[] = [
  b(0, P, 'Freezing', 'जमाव', 'Frost is likely — cover sensitive crops or irrigate lightly before dusk.', 'पाला पड़ने की संभावना — संवेदनशील फसल ढकें या शाम से पहले हल्की सिंचाई करें।'),
  b(2, R, 'Frost risk (red)', 'पाले का ख़तरा (लाल)', 'At or below 2° is the app\'s frost alert — consider frost protection.', '2° या उससे कम ऐप की पाला चेतावनी है — पाले से बचाव करें।'),
  b(6, O, 'Very cold', 'बहुत ठंडा', 'Chilling risk for tender seedlings.', 'नाज़ुक पौधों को ठंड लग सकती है।'),
  b(Infinity, G, 'Safe', 'सुरक्षित', 'No frost risk tonight.', 'आज रात पाले का ख़तरा नहीं।'),
];

const AGRI_RAIN: Band[] = [
  b(20, '#bfdbfe', 'Dry spell', 'सूखा दौर', 'Plan irrigation — little rain is expected.', 'सिंचाई की योजना बनाएँ — बारिश कम है।'),
  b(40, '#93c5fd', 'Small chance', 'थोड़ी संभावना', 'Don\'t count on rain — keep your irrigation plan.', 'बारिश पर निर्भर न रहें — सिंचाई की योजना रखें।'),
  b(70, '#60a5fa', 'Likely', 'संभावित', 'Rain likely — delay irrigation and spraying (the app flags 60%+).', 'बारिश संभावित — सिंचाई और छिड़काव टालें (ऐप 60%+ पर संकेत देता है)।'),
  b(Infinity, '#2563eb', 'Very likely', 'बहुत संभावित', 'Delay fertiliser and spraying; prepare drainage.', 'खाद और छिड़काव टालें; निकासी तैयार रखें।'),
];

const SPRAY_WIND: Band[] = [
  b(16, G, 'Good for spraying', 'छिड़काव के लिए अच्छा', 'Low drift — a good window to spray.', 'कम बहाव — छिड़काव के लिए अच्छा समय।'),
  b(24, Y, 'Marginal', 'सीमांत', 'Spray drift risk — use the calmest hours.', 'छिड़काव बहने का ख़तरा — सबसे शांत घंटे चुनें।'),
  b(Infinity, R, 'Too windy (red)', 'बहुत तेज़ हवा (लाल)', 'Do not spray pesticide or fertiliser.', 'कीटनाशक या खाद का छिड़काव न करें।'),
];

const WAVE_BANDS: Band[] = [
  b(0.5, G, 'Calm', 'शांत', 'Good for swimming and children (always swim near a lifeguard).', 'तैरने और बच्चों के लिए अच्छा (हमेशा लाइफ़गार्ड के पास तैरें)।'),
  b(1.5, LG, 'Moderate', 'मध्यम', 'Good for surfing and strong swimmers; watch for currents.', 'सर्फ़िंग और अच्छे तैराकों के लिए ठीक; धाराओं से सावधान रहें।'),
  b(2, O, 'Rough', 'उथल-पुथल', 'Experienced surfers only — not for casual swimming.', 'सिर्फ़ अनुभवी सर्फ़र — आम तैराकी के लिए नहीं।'),
  b(Infinity, R, 'Dangerous (red)', 'ख़तरनाक (लाल)', 'Stay out of the water (the app cautions above 2 m).', 'पानी में न उतरें (ऐप 2 मीटर से ऊपर चेतावनी देता है)।'),
];

const SEA_TEMP_BANDS: Band[] = [
  b(16, BL, 'Cold', 'ठंडा', 'Wetsuit needed; limit time in the water.', 'वेटसूट ज़रूरी; पानी में कम समय रहें।'),
  b(20, LB, 'Cool', 'ठंडा-सा', 'Brisk — short swims are fine; wetsuit for surfing.', 'ताज़गी भरा — छोटी तैराकी ठीक; सर्फ़िंग के लिए वेटसूट।'),
  b(28, G, 'Comfortable', 'आरामदायक', 'Pleasant for swimming.', 'तैराकी के लिए सुखद।'),
  b(Infinity, Y, 'Very warm', 'बहुत गर्म', 'Warm water — stay hydrated.', 'पानी गर्म है — पानी पीते रहें।'),
];

const COMFORT_BANDS: Band[] = [
  b(39, R, 'Poor (red)', 'ख़राब (लाल)', 'Uncomfortable — consider another day or a covered/indoor venue.', 'असहज — दूसरा दिन या ढका/अंदर का स्थान सोचें।'),
  b(59, O, 'Fair', 'ठीक-ठाक', 'Manageable — provide shade, water and fans.', 'चल जाएगा — छाँव, पानी और पंखे का इंतज़ाम रखें।'),
  b(79, LG, 'Good', 'अच्छा', 'Comfortable for most guests.', 'ज़्यादातर मेहमानों के लिए आरामदायक।'),
  b(100, G, 'Excellent', 'उत्कृष्ट', 'Ideal for an outdoor gathering.', 'बाहरी आयोजन के लिए आदर्श।'),
];

const EVENT_RAIN: Band[] = [
  b(20, G, 'Low', 'कम', 'Good for an outdoor event.', 'बाहरी आयोजन के लिए अच्छा।'),
  b(40, Y, 'Some chance', 'थोड़ी संभावना', 'Keep a tent or indoor backup on standby.', 'टेंट या अंदर का विकल्प तैयार रखें।'),
  b(70, O, 'Likely', 'संभावित', 'Have an indoor backup ready (the app warns at 40%+).', 'अंदर का विकल्प तैयार रखें (ऐप 40%+ पर चेतावनी देता है)।'),
  b(Infinity, R, 'Very likely (red)', 'बहुत संभावित (लाल)', 'Move indoors or reschedule.', 'अंदर करें या तारीख़ बदलें।'),
];

const EVENT_WIND: Band[] = [
  b(12, G, 'Calm', 'शांत', 'Tents, decor and lightweight items are fine.', 'टेंट, सजावट और हल्का सामान ठीक रहेगा।'),
  b(25, Y, 'Breezy', 'तेज़ हवा', 'Weigh down decor and banners.', 'सजावट और बैनर बाँधकर/वज़न रखकर लगाएँ।'),
  b(40, O, 'Windy', 'हवादार', 'Secure tents; avoid tall structures and balloons.', 'टेंट मज़बूती से बाँधें; ऊँची संरचनाओं और गुब्बारों से बचें।'),
  b(Infinity, R, 'Too windy (red)', 'बहुत तेज़ हवा (लाल)', 'Unsafe for tents and stages — move indoors.', 'टेंट और मंच के लिए असुरक्षित — अंदर करें।'),
];

const LOW_TEMP_TRAVEL: Band[] = [
  b(5, BL, 'Very cold', 'बहुत ठंड', 'Pack heavy layers, gloves and a warm jacket.', 'भारी कपड़े, दस्ताने और गर्म जैकेट रखें।'),
  b(12, LB, 'Cold', 'ठंड', 'Pack a warm jacket (the app suggests one at 12° or below).', 'गर्म जैकेट रखें (ऐप 12° या कम पर सुझाव देता है)।'),
  b(18, LG, 'Cool', 'ठंडा-सा', 'A light layer is enough.', 'एक हल्की परत काफ़ी है।'),
  b(Infinity, G, 'Mild', 'सुहावना', 'No warm clothing needed.', 'गर्म कपड़ों की ज़रूरत नहीं।'),
];

const TRAVEL_RAIN: Band[] = [
  b(20, G, 'Low', 'कम', 'No rain gear needed.', 'रेन गियर की ज़रूरत नहीं।'),
  b(40, Y, 'Some chance', 'थोड़ी संभावना', 'A compact umbrella is enough.', 'छोटी छतरी काफ़ी है।'),
  b(70, O, 'Likely', 'संभावित', 'Pack an umbrella or raincoat (the app suggests one at 40%+).', 'छतरी या रेनकोट रखें (ऐप 40%+ पर सुझाव देता है)।'),
  b(Infinity, R, 'Very likely (red)', 'बहुत संभावित (लाल)', 'Plan indoor alternatives and waterproof your bags.', 'अंदर के विकल्प सोचें और बैग वॉटरप्रूफ़ रखें।'),
];

const FAMILY_RAIN: Band[] = [
  b(20, G, 'Low', 'कम', 'Clear for the school run.', 'स्कूल आने-जाने के लिए साफ़।'),
  b(40, Y, 'Some chance', 'थोड़ी संभावना', 'Put an umbrella in the school bag to be safe.', 'सावधानी के लिए बैग में छतरी रखें।'),
  b(60, O, 'Likely', 'संभावित', 'Pack an umbrella for the school run (the app warns at 40%+).', 'स्कूल के रास्ते के लिए छतरी रखें (ऐप 40%+ पर चेतावनी देता है)।'),
  b(Infinity, R, 'Very likely (red)', 'बहुत संभावित (लाल)', 'Expect wet roads — leave earlier and use raincoats.', 'सड़कें गीली होंगी — जल्दी निकलें और रेनकोट पहनें।'),
];

// ------------------------------------------------------------------ public API

export function bandFor(g: Gauge): Band | null {
  if (g.value === null || Number.isNaN(g.value)) return null;
  return g.bands.find((x) => g.value! <= x.upTo) ?? g.bands[g.bands.length - 1];
}

/** "51–100", "0–50", "<5", "38+" — in the user's display units. */
export function rangeText(g: Gauge, i: number): string {
  const r = (v: number) => {
    const d = g.conv(v);
    const s = g.decimals === 0 ? String(Math.round(d)) : d.toFixed(g.decimals).replace(/\.0+$/, '');
    return s;
  };
  const band = g.bands[i];
  const prev = i === 0 ? null : g.bands[i - 1].upTo;
  const lo = prev === null ? g.min : g.integer ? prev + 1 : prev;
  if (!Number.isFinite(band.upTo)) return `${r(lo)}+`;
  if (prev === null && g.lowerOpen) return `≤${r(band.upTo)}`;
  return `${r(lo)}–${r(band.upTo)}`;
}

export function displayValue(g: Gauge): string {
  if (g.value === null) return '—';
  const d = g.conv(g.value);
  return g.decimals === 0 ? String(Math.round(d)) : d.toFixed(g.decimals);
}

/** Shown for "General" (no persona): the four numbers most people ask about. */
export function getGeneralGuide(ctx: GuideContext): GuideItem[] {
  const c = ctx.weather.current;
  return [
    aqiGauge(ctx, 'health'),
    uvGauge(ctx),
    rainGauge('rain', { en: 'Rain chance now', hi: 'अभी बारिश की संभावना' }, c.precipitationProbability, RAIN_GENERAL, { en: 'Best: under 20% (green).', hi: 'सबसे अच्छा: 20% से कम (हरा)।' }),
    windGauge('wind', { en: 'Wind', hi: 'हवा' }, c.windSpeed, WIND_BANDS, { en: 'Best: under 19 km/h (green).', hi: 'सबसे अच्छा: 19 किमी/घं से कम (हरा)।' }, { en: 'Beaufort wind scale', hi: 'ब्यूफ़ोर्ट पवन पैमाना' }, ctx.units),
  ];
}

export function getPersonaGuide(persona: Persona, ctx: GuideContext): GuideItem[] {
  const { weather, units } = ctx;
  const c = weather.current;
  const today = weather.daily[0];
  const cel: LT = { en: 'General comfort scale', hi: 'सामान्य आराम की श्रेणी' };

  switch (persona) {
    case 'health': {
      const items: GuideItem[] = [aqiGauge(ctx, 'health'), uvGauge(ctx), humidityGauge(ctx)];
      const p = ctx.pollen;
      items.push(
        p && p.available && p.level
          ? { kind: 'note', id: 'pollen', label: { en: 'Pollen', hi: 'पराग' }, text: { en: `${p.dominant ?? 'Pollen'}: ${p.level} right now (CAMS Europe model).`, hi: `${pollenType(p.dominant ?? '') || 'पराग'}: अभी ${pollenLevel(p.level)} (CAMS यूरोप मॉडल)।` } }
          : { kind: 'note', id: 'pollen', label: { en: 'Pollen', hi: 'पराग' }, text: { en: 'Not available here — real pollen data exists only for Europe, so Mausam shows "unavailable" instead of guessing.', hi: 'यहाँ उपलब्ध नहीं — असली पराग डेटा सिर्फ़ यूरोप के लिए है, इसलिए मौसम अनुमान लगाने के बजाय "उपलब्ध नहीं" दिखाता है।' } }
      );
      return items;
    }
    case 'fitness':
      return [
        tempGauge('feels', { en: 'Feels-like temperature', hi: 'महसूस होने वाला तापमान' }, c.feelsLike, FEELS_EXERCISE,
          { en: 'Best for running: about 10–22° (green). Above 38° is red.', hi: 'दौड़ने के लिए सबसे अच्छा: लगभग 10–22° (हरा)। 38° से ऊपर लाल है।' },
          { en: 'Sports-medicine style ranges + the app\'s 38° heat alert', hi: 'खेल-चिकित्सा जैसी श्रेणियाँ + ऐप की 38° गर्मी चेतावनी' }, units),
        aqiGauge(ctx, 'fitness'),
        windGauge('wind', { en: 'Wind', hi: 'हवा' }, c.windSpeed, WIND_BANDS,
          { en: 'Best: under 19 km/h (green).', hi: 'सबसे अच्छा: 19 किमी/घं से कम (हरा)।' }, { en: 'Beaufort wind scale', hi: 'ब्यूफ़ोर्ट पवन पैमाना' }, units),
        uvGauge(ctx),
      ];
    case 'travel':
      return [
        rainGauge('rain', { en: 'Rain chance today', hi: 'आज बारिश की संभावना' }, today?.precipitationProbability ?? c.precipitationProbability, TRAVEL_RAIN,
          { en: 'Best: under 20% (green). At 40%+ pack rain gear.', hi: 'सबसे अच्छा: 20% से कम (हरा)। 40%+ पर रेन गियर रखें।' }),
        withRange(tempGauge('low', { en: 'Today\'s low', hi: 'आज का न्यूनतम तापमान' }, today?.min ?? null, LOW_TEMP_TRAVEL,
          { en: 'Mild above 18° (green). At 12° or below pack a warm jacket.', hi: '18° से ऊपर सुहावना (हरा)। 12° या कम पर गर्म जैकेट रखें।' }, cel, units), -5, 30),
        uvGauge(ctx),
        windGauge('wind', { en: 'Wind today', hi: 'आज की हवा' }, today?.windSpeed ?? c.windSpeed, WIND_BANDS,
          { en: 'Best: under 19 km/h (green). At 30+ a windbreaker helps.', hi: 'सबसे अच्छा: 19 किमी/घं से कम (हरा)। 30+ पर विंडब्रेकर काम आता है।' }, { en: 'Beaufort wind scale', hi: 'ब्यूफ़ोर्ट पवन पैमाना' }, units),
      ];
    case 'family': {
      const w = ctx.commuteWindows;
      const worst = Math.max(avgPrecipInWindow(weather.hourly, w.morningStart, w.morningEnd), avgPrecipInWindow(weather.hourly, w.eveningStart, w.eveningEnd));
      return [
        rainGauge('commuteRain', { en: 'Rain chance on the school run', hi: 'स्कूल के रास्ते में बारिश की संभावना' }, worst, FAMILY_RAIN,
          { en: 'Best: under 20% (green). At 40%+ pack an umbrella.', hi: 'सबसे अच्छा: 20% से कम (हरा)। 40%+ पर छतरी रखें।' }),
        aqiGauge(ctx, 'family'),
        uvGauge(ctx),
      ];
    }
    case 'agriculture': {
      const items: GuideItem[] = [];
      if (c.soilMoisture != null) {
        items.push({
          kind: 'gauge', id: 'moisture', label: { en: 'Soil moisture (surface)', hi: 'मिट्टी की नमी (सतह)' },
          value: Math.round(c.soilMoisture * 100), unit: '%', conv: id, decimals: 0, integer: true, min: 0, max: 60, bands: MOISTURE_BANDS,
          best: { en: 'Best: 20–35% (green).', hi: 'सबसे अच्छा: 20–35% (हरा)।' },
          source: { en: 'General agronomy ranges', hi: 'सामान्य कृषि श्रेणियाँ' },
          note: { en: 'This is the top 0–1 cm layer, which dries and wets quickly — it is not root-zone moisture.', hi: 'यह ऊपरी 0–1 सेमी की परत है जो जल्दी सूखती और भीगती है — यह जड़ क्षेत्र की नमी नहीं है।' },
        });
      }
      items.push(
        withRange(tempGauge('frost', { en: 'Overnight low (frost)', hi: 'रात का न्यूनतम तापमान (पाला)' }, today?.min ?? null, FROST_BANDS,
          { en: 'Best: above 6° (green). At or below 2° is red — frost risk.', hi: 'सबसे अच्छा: 6° से ऊपर (हरा)। 2° या कम लाल है — पाले का ख़तरा।' },
          { en: 'The app\'s 2° frost-risk rule', hi: 'ऐप का 2° पाला-ख़तरा नियम' }, units), -5, 15),
        rainGauge('rain48', { en: 'Rain chance, next 2 days', hi: 'अगले 2 दिनों में बारिश की संभावना' }, Math.max(...weather.daily.slice(0, 2).map((d) => d.precipitationProbability), 0), AGRI_RAIN,
          { en: 'No "best" here — plan irrigation around it. 60%+ means rain is likely.', hi: 'यहाँ कोई "सबसे अच्छा" नहीं — इसके हिसाब से सिंचाई की योजना बनाएँ। 60%+ यानी बारिश संभावित।' }),
        windGauge('spray', { en: 'Wind (for spraying)', hi: 'हवा (छिड़काव के लिए)' }, c.windSpeed, SPRAY_WIND,
          { en: 'Best for spraying: under 16 km/h (green).', hi: 'छिड़काव के लिए सबसे अच्छा: 16 किमी/घं से कम (हरा)।' }, { en: 'Common spray-drift guidance', hi: 'छिड़काव-बहाव की सामान्य सलाह' }, units, 50)
      );
      return items;
    }
    case 'marine': {
      const m = ctx.marine;
      const items: GuideItem[] = [];
      if (m && m.available) {
        if (m.waveHeight != null) {
          items.push({
            kind: 'gauge', id: 'waves', label: { en: 'Wave height', hi: 'लहरों की ऊँचाई' }, value: m.waveHeight,
            unit: units === 'imperial' ? tr('ft', 'फ़ुट') : tr('m', 'मी'), conv: units === 'imperial' ? m2ft : id, decimals: 1, min: 0, max: 3, bands: WAVE_BANDS,
            best: { en: 'Best for swimming: under 0.5 m (green). Above 2 m is red.', hi: 'तैराकी के लिए सबसे अच्छा: 0.5 मी से कम (हरा)। 2 मी से ऊपर लाल है।' },
            source: { en: 'General beach-safety guidance', hi: 'सामान्य समुद्र-तट सुरक्षा सलाह' },
          });
        }
        if (m.seaSurfaceTemperature != null) {
          items.push(tempGauge('sea', { en: 'Sea temperature', hi: 'समुद्र का तापमान' }, m.seaSurfaceTemperature, SEA_TEMP_BANDS,
            { en: 'Most comfortable: 20–28° (green).', hi: 'सबसे आरामदायक: 20–28° (हरा)।' }, { en: 'General swimming comfort ranges', hi: 'तैराकी की सामान्य आराम-सीमाएँ' }, units));
          withRange(items[items.length - 1] as Gauge, 8, 34);
        }
      } else {
        items.push({ kind: 'note', id: 'coast', label: { en: 'Waves & sea', hi: 'लहरें और समुद्र' }, text: { en: 'Not a coastal location — no wave or sea-temperature data here.', hi: 'तटीय स्थान नहीं — यहाँ लहरों या समुद्र के तापमान का डेटा नहीं।' } });
      }
      items.push(
        windGauge('wind', { en: 'Wind', hi: 'हवा' }, c.windSpeed, WIND_BANDS, { en: 'Best: under 19 km/h (green).', hi: 'सबसे अच्छा: 19 किमी/घं से कम (हरा)।' }, { en: 'Beaufort wind scale', hi: 'ब्यूफ़ोर्ट पवन पैमाना' }, units),
        uvGauge(ctx),
        { kind: 'note', id: 'tide', label: { en: 'Tide times', hi: 'ज्वार का समय' }, text: { en: 'Unavailable — no free global tide source exists, so it is shown honestly instead of guessed.', hi: 'उपलब्ध नहीं — कोई मुफ़्त वैश्विक ज्वार स्रोत नहीं है, इसलिए अनुमान के बजाय ईमानदारी से यही दिखाया गया है।' } }
      );
      return items;
    }
    case 'commuter':
      return [
        {
          kind: 'gauge', id: 'vis', label: { en: 'Visibility', hi: 'दृश्यता' }, value: c.visibility,
          unit: units === 'imperial' ? tr('mi', 'मील') : tr('km', 'किमी'), conv: units === 'imperial' ? km2mi : id, decimals: 1, min: 0, max: 15, bands: VIS_BANDS,
          best: { en: 'Best: over 10 km (green). Under 2 km is a low-visibility alert; under 1 km is red.', hi: 'सबसे अच्छा: 10 किमी से ज़्यादा (हरा)। 2 किमी से कम कम-दृश्यता चेतावनी है; 1 किमी से कम लाल है।' },
          source: { en: 'Meteorological visibility categories', hi: 'मौसम-विज्ञान की दृश्यता श्रेणियाँ' },
        },
        rainGauge('rain', { en: 'Rain chance now', hi: 'अभी बारिश की संभावना' }, c.precipitationProbability, RAIN_GENERAL,
          { en: 'Best: under 20% (green).', hi: 'सबसे अच्छा: 20% से कम (हरा)।' }),
        windGauge('wind', { en: 'Wind', hi: 'हवा' }, c.windSpeed, WIND_BANDS, { en: 'Best: under 19 km/h (green). Riders feel gusts most.', hi: 'सबसे अच्छा: 19 किमी/घं से कम (हरा)। दोपहिया चालक झोंके सबसे ज़्यादा महसूस करते हैं।' }, { en: 'Beaufort wind scale', hi: 'ब्यूफ़ोर्ट पवन पैमाना' }, units),
        { kind: 'note', id: 'traffic', label: { en: 'Traffic', hi: 'ट्रैफ़िक' }, text: { en: 'Unavailable — no free real traffic source exists, so Mausam shows weather-driven road conditions only.', hi: 'उपलब्ध नहीं — कोई मुफ़्त असली ट्रैफ़िक स्रोत नहीं है, इसलिए मौसम सिर्फ़ मौसम-आधारित सड़क स्थिति दिखाता है।' } },
      ];
    case 'eventPlanner': {
      const score = computeComfortIndex(c.temperature, c.humidity, c.windSpeed).score;
      return [
        {
          kind: 'gauge', id: 'comfort', label: { en: 'Comfort index', hi: 'कंफ़र्ट इंडेक्स' }, value: score, unit: '/100', conv: id, decimals: 0, integer: true, min: 0, max: 100, bands: COMFORT_BANDS,
          best: { en: 'Best: 80+ (green). Under 40 is red.', hi: 'सबसे अच्छा: 80+ (हरा)। 40 से कम लाल है।' },
          source: { en: 'Mausam\'s transparent score: temperature ~23° ideal, humidity above 55% and wind above 12 km/h count against it', hi: 'मौसम का पारदर्शी स्कोर: तापमान ~23° आदर्श; 55% से ऊपर नमी और 12 किमी/घं से ऊपर हवा स्कोर घटाती है' },
        },
        rainGauge('rain', { en: 'Rain chance today', hi: 'आज बारिश की संभावना' }, today?.precipitationProbability ?? c.precipitationProbability, EVENT_RAIN,
          { en: 'Best: under 20% (green). At 40%+ have an indoor backup.', hi: 'सबसे अच्छा: 20% से कम (हरा)। 40%+ पर अंदर का विकल्प रखें।' }),
        windGauge('wind', { en: 'Wind', hi: 'हवा' }, c.windSpeed, EVENT_WIND, { en: 'Best: under 12 km/h (green) for tents and decor.', hi: 'टेंट और सजावट के लिए सबसे अच्छा: 12 किमी/घं से कम (हरा)।' }, { en: 'Event-setup rules of thumb', hi: 'आयोजन-व्यवस्था के मोटे नियम' }, units, 60),
        humidityGauge(ctx),
      ];
    }
    default:
      return [];
  }
}
