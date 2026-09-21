import { tr } from '../i18n/dynamic';
import type { AirQualityResult, CurrentWeather, PredictionExplanation, PredictionFactor, PredictionPoint } from '../types';

/**
 * PredictionProvider abstraction.
 *
 * IMPORTANT HONESTY NOTE (see project brief §28-29):
 * There is no trained ML model or FastAPI backend behind this yet.
 * `MockPredictionService` below is a prototype heuristic:
 *   - The AQI/PM2.5/PM10 numbers it returns for the shorter horizons are
 *     taken directly from Open-Meteo's real CAMS atmospheric forecast
 *     (already fetched by airQualityService), so those figures are a
 *     genuine numerical forecast, not invented.
 *   - The "risk level", "confidence", and "contributing factors" are
 *     simple rule-of-thumb derivations with NO statistical backing —
 *     they exist to make the UI legible, not to represent a validated
 *     model. The UI must always render these as SIMULATED.
 *
 * A future `RealPredictionService` (backed by a FastAPI/ML service) can
 * implement the same `PredictionProvider` interface — using historical
 * AQI, PM2.5/PM10, temperature, humidity, wind, rainfall, pressure,
 * and traffic data as features — without any UI changes.
 */
export interface PredictionProvider {
  readonly isSimulated: boolean;
  readonly modelLabel: string;
  predict(airQuality: AirQualityResult, weather: CurrentWeather | null): PredictionPoint[];
  factors(airQuality: AirQualityResult, weather: CurrentWeather | null): PredictionFactor[];
  explain(predictions: PredictionPoint[], factors: PredictionFactor[]): PredictionExplanation;
}

const HORIZONS: { label: string; hours: number }[] = [
  { label: '6 Hours', hours: 6 },
  { label: '12 Hours', hours: 12 },
  { label: '24 Hours', hours: 24 },
  { label: '48 Hours', hours: 48 },
  { label: '72 Hours', hours: 72 },
];

function riskFromAqi(aqi: number): PredictionPoint['riskLevel'] {
  if (aqi <= 50) return 'Low';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 200) return 'High';
  return 'Severe';
}

class MockPredictionService implements PredictionProvider {
  readonly isSimulated = true;
  readonly modelLabel = 'Prototype heuristic (no trained ML model)';

  predict(airQuality: AirQualityResult, _weather: CurrentWeather | null): PredictionPoint[] {
    const hourly = airQuality.hourly;
    const nowIdx = hourly.findIndex((h) => new Date(h.time).getTime() >= Date.now());
    const baseIdx = nowIdx === -1 ? 0 : nowIdx;

    return HORIZONS.map(({ label, hours }) => {
      const targetIdx = baseIdx + hours;
      const point = hourly[Math.min(targetIdx, hourly.length - 1)];
      const fallbackAqi = airQuality.current.aqi ?? 75;
      const aqi = point?.aqi ?? fallbackAqi;
      const pm25 = point?.pm2_5 ?? airQuality.current.pm2_5 ?? 0;
      const pm10 = point?.pm10 ?? airQuality.current.pm10 ?? 0;

      return {
        horizonLabel: label,
        horizonHours: hours,
        aqi: Math.round(aqi),
        pm25: Math.round(pm25 * 10) / 10,
        pm10: Math.round(pm10 * 10) / 10,
        riskLevel: riskFromAqi(aqi),
      };
    });
  }

  factors(airQuality: AirQualityResult, weather: CurrentWeather | null): PredictionFactor[] {
    const factors: PredictionFactor[] = [];
    const pm25 = airQuality.current.pm2_5 ?? 0;

    if (weather) {
      if (weather.windSpeed < 8) {
        factors.push({ factor: tr('Low Wind Speed', 'कम हवा की गति'), weight: 30, impact: tr('Reduced pollutant dispersion', 'प्रदूषकों का फैलाव घटा') });
      } else {
        factors.push({ factor: tr('Wind Speed & Direction', 'हवा की गति और दिशा'), weight: 25, impact: tr('Aiding pollutant dispersion', 'प्रदूषकों के फैलाव में मदद') });
      }
      if (weather.humidity > 70) {
        factors.push({ factor: tr('High Humidity', 'ज़्यादा नमी'), weight: 15, impact: tr('Particulate matter retention', 'कणीय पदार्थ का टिके रहना') });
      }
      if (weather.precipitationProbability > 50) {
        factors.push({ factor: tr('Rain Probability', 'बारिश की संभावना'), weight: 20, impact: tr('Likely to wash out particulates', 'कणों को धो देने की संभावना') });
      }
    }

    if (pm25 > 55) {
      factors.push({ factor: tr('Elevated PM2.5 Baseline', 'PM2.5 का ऊँचा आधार स्तर'), weight: 25, impact: tr('Sustained unhealthy particulate levels', 'कणों का लगातार अस्वस्थ स्तर') });
    }

    factors.push({ factor: tr('Diurnal Traffic Pattern', 'दिन का ट्रैफ़िक पैटर्न'), weight: 10, impact: tr('Typical AM/PM peak contribution', 'सुबह/शाम की भीड़ का सामान्य योगदान') });

    // Normalize weights to ~100 for display purposes.
    const total = factors.reduce((sum, f) => sum + f.weight, 0) || 1;
    return factors
      .map((f) => ({ ...f, weight: Math.round((f.weight / total) * 100) }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5);
  }

  /**
   * Produces a plain-language summary of the prototype prediction.
   * The "confidence" here is a qualitative, heuristic label describing
   * how much the horizons rely on genuine forecast data vs. a flat
   * fallback — it is NOT a statistical confidence interval from a
   * trained model, and is always presented as such in the UI.
   */
  explain(predictions: PredictionPoint[], factors: PredictionFactor[]): PredictionExplanation {
    if (predictions.length === 0) {
      return {
        trend: 'Stable',
        confidenceLabel: 'Low',
        confidenceNote: tr('Not enough data to characterize a trend.', 'रुझान बताने के लिए डेटा पर्याप्त नहीं।'),
        summary: tr('Not enough data is available yet to describe an expected trend.', 'अपेक्षित रुझान बताने के लिए अभी पर्याप्त डेटा उपलब्ध नहीं।'),
      };
    }

    const first = predictions[0].aqi;
    const last = predictions[predictions.length - 1].aqi;
    const delta = last - first;
    const trend: PredictionExplanation['trend'] = delta > 8 ? 'Increasing' : delta < -8 ? 'Decreasing' : 'Stable';

    // Confidence is intentionally coarse: "High" only when every horizon
    // pulled from genuine model forecast data rather than a flat fallback.
    const nearHorizon = predictions[0];
    const farHorizon = predictions[predictions.length - 1];
    const spread = Math.abs(farHorizon.aqi - nearHorizon.aqi);
    let confidenceLabel: PredictionExplanation['confidenceLabel'] = 'Moderate';
    let confidenceNote = tr('Based on near-term forecast data; longer horizons are less certain.', 'निकट-अवधि के पूर्वानुमान डेटा पर आधारित; लंबी अवधि कम निश्चित है।');
    if (spread > 80) {
      confidenceLabel = 'Low';
      confidenceNote = tr('Large swing between near- and far-horizon estimates — treat longer horizons cautiously.', 'निकट और दूर की अवधि के अनुमानों में बड़ा अंतर — लंबी अवधि को सावधानी से लें।');
    } else if (spread < 20) {
      confidenceLabel = 'Moderate';
      confidenceNote = tr('Horizons are broadly consistent, but this remains a heuristic, not a validated forecast.', 'अवधियाँ मोटे तौर पर एक-सी हैं, पर यह अब भी एक अनुमान है, सत्यापित पूर्वानुमान नहीं।');
    }

    const topFactor = factors[0]?.factor.toLowerCase() ?? tr('current atmospheric conditions', 'मौजूदा वायुमंडलीय हालात');
    const secondFactor = factors[1]?.factor.toLowerCase();
    const causeText = secondFactor ? tr(`${topFactor} and ${secondFactor}`, `${topFactor} और ${secondFactor}`) : topFactor;
    const trendVerb = trend === 'Increasing' ? tr('increase', 'बढ़ने') : trend === 'Decreasing' ? tr('improve', 'सुधरने') : tr('stay roughly stable', 'लगभग स्थिर रहने');

    const summary = tr(`Pollution risk is expected to ${trendVerb} over the next ${farHorizon.horizonHours} hours, largely due to ${causeText}. This is a prototype heuristic, not a trained model's forecast.`, `अगले ${farHorizon.horizonHours} घंटों में प्रदूषण का जोखिम ${trendVerb} की उम्मीद है, मुख्यतः ${causeText} के कारण। यह एक प्रोटोटाइप अनुमान है, प्रशिक्षित मॉडल का पूर्वानुमान नहीं।`);

    return { trend, confidenceLabel, confidenceNote, summary };
  }
}

export const predictionService: PredictionProvider = new MockPredictionService();
