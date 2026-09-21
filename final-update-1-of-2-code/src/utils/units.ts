import type { UnitSystem } from '../types';
import { tr } from '../i18n/dynamic';

export function formatTemp(celsius: number, units: UnitSystem): string {
  if (units === 'imperial') return `${Math.round((celsius * 9) / 5 + 32)}°F`;
  return `${Math.round(celsius)}°C`;
}

export function formatWind(kph: number, units: UnitSystem): string {
  if (units === 'imperial') return `${Math.round(kph * 0.621371)} ${tr('mph', 'मील/घं')}`;
  return `${Math.round(kph)} ${tr('km/h', 'किमी/घं')}`;
}

export function formatPressure(hpa: number, units: UnitSystem): string {
  if (units === 'imperial') return `${(hpa * 0.02953).toFixed(2)} inHg`;
  return `${Math.round(hpa)} hPa`;
}

export function formatVisibility(km: number, units: UnitSystem): string {
  if (units === 'imperial') return `${(km * 0.621371).toFixed(1)} ${tr('mi', 'मील')}`;
  return `${km.toFixed(1)} ${tr('km', 'किमी')}`;
}

export function timeAgo(timestamp: number | null): string {
  if (!timestamp) return tr('Never', 'कभी नहीं');
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return tr('Just now', 'अभी-अभी');
  if (seconds < 60) return tr(`${seconds}s ago`, `${seconds} सेकंड पहले`);
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return tr(`${minutes} min${minutes === 1 ? '' : 's'} ago`, `${minutes} मिनट पहले`);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return tr(`${hours} hour${hours === 1 ? '' : 's'} ago`, `${hours} घंटे पहले`);
  const days = Math.floor(hours / 24);
  return tr(`${days} day${days === 1 ? '' : 's'} ago`, `${days} दिन पहले`);
}
