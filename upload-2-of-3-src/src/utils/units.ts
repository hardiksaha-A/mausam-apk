import type { UnitSystem } from '../types';

export function formatTemp(celsius: number, units: UnitSystem): string {
  if (units === 'imperial') return `${Math.round((celsius * 9) / 5 + 32)}°F`;
  return `${Math.round(celsius)}°C`;
}

export function formatWind(kph: number, units: UnitSystem): string {
  if (units === 'imperial') return `${Math.round(kph * 0.621371)} mph`;
  return `${Math.round(kph)} km/h`;
}

export function formatPressure(hpa: number, units: UnitSystem): string {
  if (units === 'imperial') return `${(hpa * 0.02953).toFixed(2)} inHg`;
  return `${Math.round(hpa)} hPa`;
}

export function formatVisibility(km: number, units: UnitSystem): string {
  if (units === 'imperial') return `${(km * 0.621371).toFixed(1)} mi`;
  return `${km.toFixed(1)} km`;
}

export function timeAgo(timestamp: number | null): string {
  if (!timestamp) return 'Never';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
