import type { AqiCategory } from '../types';

/**
 * US AQI category breakpoints (EPA standard). We use this standard
 * because Open-Meteo's `us_aqi` field is computed on the US EPA scale.
 * The standard in use is also surfaced in Settings > About for transparency.
 */
export function classifyUsAqi(aqi: number | null): AqiCategory {
  if (aqi === null || Number.isNaN(aqi)) return 'Unknown';
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

export const AQI_COLORS: Record<AqiCategory, string> = {
  Good: '#22c55e',
  Moderate: '#f59e0b',
  'Unhealthy for Sensitive Groups': '#fb923c',
  Unhealthy: '#ef4444',
  'Very Unhealthy': '#a855f7',
  Hazardous: '#7f1d1d',
  Unknown: '#6b8286',
};

export const AQI_GUIDANCE: Record<AqiCategory, string> = {
  Good: 'Air quality is satisfactory. Enjoy normal outdoor activities.',
  Moderate: 'Acceptable air quality. Unusually sensitive people should consider reducing prolonged outdoor exertion.',
  'Unhealthy for Sensitive Groups': 'Sensitive groups (children, elderly, respiratory/heart conditions) should reduce prolonged outdoor exertion.',
  Unhealthy: 'Everyone may begin to experience health effects. Sensitive groups should avoid outdoor exertion.',
  'Very Unhealthy': 'Health alert: everyone may experience more serious health effects. Avoid outdoor exertion.',
  Hazardous: 'Health warning of emergency conditions. Everyone should avoid all outdoor exertion.',
  Unknown: 'Air quality data is currently unavailable for this location.',
};
