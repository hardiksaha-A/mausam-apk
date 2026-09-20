/**
 * Generated-text translation.
 *
 * Static UI labels live in translations.ts (t('key')). Text that is BUILT
 * from live data at runtime — insight sentences, alert descriptions,
 * weather condition names, AQI categories — is written once with both
 * languages side by side via tr('English', 'हिन्दी'), so nothing is
 * machine-translated and numbers/units are always correct.
 *
 * The current language is a module-level value kept in sync by
 * LanguageProvider, and the route tree is re-keyed on language change, so
 * every screen re-renders in the new language immediately.
 */
export type Lang = 'en' | 'hi';

let current: Lang = 'en';

export function setCurrentLanguage(l: Lang): void {
  current = l;
}
export function getCurrentLanguage(): Lang {
  return current;
}
export const isHindi = (): boolean => current === 'hi';
export const tr = (en: string, hi: string): string => (current === 'hi' ? hi : en);

/** Locale for dates/times: Hindi when Hindi is selected, otherwise the device default. */
export const timeLocale = (): string | undefined => (current === 'hi' ? 'hi-IN' : undefined);

const COND_HI: Record<string, string> = {
  'Clear Sky': 'साफ़ आसमान',
  'Mainly Clear': 'ज़्यादातर साफ़',
  'Partly Cloudy': 'आंशिक बादल',
  Overcast: 'घने बादल',
  Fog: 'कोहरा',
  'Rime Fog': 'पाले वाला कोहरा',
  'Light Drizzle': 'हल्की फुहार',
  Drizzle: 'फुहार',
  'Dense Drizzle': 'घनी फुहार',
  'Freezing Drizzle': 'जमने वाली फुहार',
  'Light Rain': 'हल्की बारिश',
  Rain: 'बारिश',
  'Heavy Rain': 'भारी बारिश',
  'Freezing Rain': 'जमने वाली बारिश',
  'Light Snow': 'हल्की बर्फ़बारी',
  Snow: 'बर्फ़बारी',
  'Heavy Snow': 'भारी बर्फ़बारी',
  'Snow Grains': 'बर्फ़ के दाने',
  'Light Showers': 'हल्की बौछारें',
  Showers: 'बौछारें',
  'Violent Showers': 'तेज़ बौछारें',
  'Snow Showers': 'बर्फ़ की बौछारें',
  'Heavy Snow Showers': 'भारी बर्फ़ की बौछारें',
  Thunderstorm: 'गरज के साथ बारिश',
  'Thunderstorm w/ Hail': 'ओलों के साथ गरज-तूफ़ान',
  'Severe Thunderstorm': 'भीषण गरज-तूफ़ान',
  Unknown: 'अज्ञात',
};
/** Weather condition name (e.g. "Partly Cloudy") in the current language. */
export const cond = (en: string): string => (current === 'hi' ? COND_HI[en] ?? en : en);

const COMPASS_HI: Record<string, string> = {
  N: 'उत्तर', NNE: 'उ.-उ.पू.', NE: 'उत्तर-पूर्व', ENE: 'पू.-उ.पू.', E: 'पूर्व', ESE: 'पू.-द.पू.', SE: 'दक्षिण-पूर्व', SSE: 'द.-द.पू.',
  S: 'दक्षिण', SSW: 'द.-द.प.', SW: 'दक्षिण-पश्चिम', WSW: 'प.-द.प.', W: 'पश्चिम', WNW: 'प.-उ.प.', NW: 'उत्तर-पश्चिम', NNW: 'उ.-उ.प.',
};
export const compass = (en: string): string => (current === 'hi' ? COMPASS_HI[en] ?? en : en);

const AQI_CAT_HI: Record<string, string> = {
  Good: 'अच्छा',
  Moderate: 'मध्यम',
  'Unhealthy for Sensitive Groups': 'संवेदनशील समूहों के लिए अस्वस्थ',
  Unhealthy: 'अस्वस्थ',
  'Very Unhealthy': 'बहुत अस्वस्थ',
  Hazardous: 'ख़तरनाक',
  Unknown: 'अज्ञात',
};
export const aqiCat = (en: string): string => (current === 'hi' ? AQI_CAT_HI[en] ?? en : en);

const AQI_ADVICE_HI: Record<string, string> = {
  Good: 'हवा की गुणवत्ता संतोषजनक है। सामान्य बाहरी गतिविधियों का आनंद लें।',
  Moderate: 'हवा की गुणवत्ता स्वीकार्य है। बहुत संवेदनशील लोग लंबी बाहरी मेहनत कम करने पर विचार करें।',
  'Unhealthy for Sensitive Groups': 'संवेदनशील समूह (बच्चे, बुज़ुर्ग, साँस/हृदय के रोगी) लंबी बाहरी मेहनत कम करें।',
  Unhealthy: 'सभी को स्वास्थ्य पर असर महसूस होना शुरू हो सकता है। संवेदनशील समूह बाहरी मेहनत से बचें।',
  'Very Unhealthy': 'स्वास्थ्य चेतावनी: सभी पर ज़्यादा गंभीर असर हो सकता है। बाहरी मेहनत से बचें।',
  Hazardous: 'आपात स्थिति की स्वास्थ्य चेतावनी। सभी बाहर की हर मेहनत से बचें।',
  Unknown: 'इस स्थान के लिए वायु गुणवत्ता का डेटा अभी उपलब्ध नहीं है।',
};
export const aqiAdvice = (en: string, category: string): string => (current === 'hi' ? AQI_ADVICE_HI[category] ?? en : en);

const SEV_HI: Record<string, string> = { Critical: 'गंभीर', High: 'उच्च', Medium: 'मध्यम', Low: 'कम' };
export const severity = (en: string): string => (current === 'hi' ? SEV_HI[en] ?? en : en);

const ALERT_CAT_HI: Record<string, string> = { 'Air Quality': 'वायु गुणवत्ता', Pollution: 'प्रदूषण', Weather: 'मौसम', Visibility: 'दृश्यता' };
export const alertCategory = (en: string): string => (current === 'hi' ? ALERT_CAT_HI[en] ?? en : en);

const STATUS_HI: Record<string, string> = { Active: 'सक्रिय', Acknowledged: 'स्वीकृत', Resolved: 'हल हुआ' };
export const alertStatus = (en: string): string => (current === 'hi' ? STATUS_HI[en] ?? en : en);

const POLLEN_TYPE_HI: Record<string, string> = { Alder: 'एल्डर', Birch: 'बर्च', Grass: 'घास', Mugwort: 'मगवॉर्ट', Olive: 'जैतून', Ragweed: 'रैगवीड' };
export const pollenType = (en: string): string => (current === 'hi' ? POLLEN_TYPE_HI[en] ?? en : en);
const POLLEN_LEVEL_HI: Record<string, string> = { Low: 'कम', Moderate: 'मध्यम', High: 'ज़्यादा', 'Very High': 'बहुत ज़्यादा' };
export const pollenLevel = (en: string): string => (current === 'hi' ? POLLEN_LEVEL_HI[en] ?? en : en);

export const unitKmh = (): string => tr('km/h', 'किमी/घं');

/** Short labels defined in module-level constants — translated at the point they are displayed. */
const PH_HI: Record<string, string> = {
  Live: 'लाइव', Cached: 'कैश्ड', Forecast: 'पूर्वानुमान', Estimated: 'अनुमानित', Simulated: 'सिम्युलेटेड', 'Demo Data': 'डेमो डेटा', Error: 'त्रुटि', Stale: 'पुराना', Loading: 'लोड हो रहा है',
  '24 Hours': '24 घंटे', '7 Days': '7 दिन', '30 Days': '30 दिन', '6 Months': '6 महीने', '1 Year': '1 साल', '6 Hours': '6 घंटे', '12 Hours': '12 घंटे', '48 Hours': '48 घंटे', '72 Hours': '72 घंटे',
  Good: 'अच्छा', Moderate: 'मध्यम', 'Unhealthy (Sensitive)': 'अस्वस्थ (संवेदनशील)', Unhealthy: 'अस्वस्थ', 'Very Unhealthy': 'बहुत अस्वस्थ', Hazardous: 'ख़तरनाक',
  Traffic: 'ट्रैफ़िक', Industrial: 'औद्योगिक', Dust: 'धूल', 'Biomass Burning': 'बायोमास जलाना', Other: 'अन्य',
  Citizens: 'नागरिक', 'Traffic Authorities': 'ट्रैफ़िक प्राधिकरण', 'Industrial Authorities': 'औद्योगिक प्राधिकरण', 'City Administration': 'नगर प्रशासन',
  Temperature: 'तापमान', 'Precipitation %': 'वर्षा %', 'Wind Speed': 'हवा की गति',
  Increasing: 'बढ़ रहा है', Decreasing: 'घट रहा है', Stable: 'स्थिर', Low: 'कम', High: 'उच्च', Severe: 'गंभीर',
  'North Grid Point': 'उत्तरी ग्रिड पॉइंट', 'South Grid Point': 'दक्षिणी ग्रिड पॉइंट', 'East Grid Point': 'पूर्वी ग्रिड पॉइंट', 'West Grid Point': 'पश्चिमी ग्रिड पॉइंट',
  'Selected Location': 'चुना हुआ स्थान',
  All: 'सभी', Active: 'सक्रिय', Acknowledged: 'स्वीकृत', Resolved: 'हल हुआ',
};
export const ph = (en: string): string => (current === 'hi' ? PH_HI[en] ?? en : en);
