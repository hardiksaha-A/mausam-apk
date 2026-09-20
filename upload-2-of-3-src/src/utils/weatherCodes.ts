// WMO Weather interpretation codes (used by Open-Meteo)
// https://open-meteo.com/en/docs
import {
  Sun, Moon, CloudSun, CloudMoon, Cloud, CloudFog, CloudDrizzle,
  CloudRain, CloudSnow, CloudLightning, type LucideIcon,
} from 'lucide-react';

interface WeatherCodeInfo {
  label: string;
  icon: LucideIcon;
  nightIcon?: LucideIcon;
}

const WEATHER_CODE_MAP: Record<number, WeatherCodeInfo> = {
  0: { label: 'Clear Sky', icon: Sun, nightIcon: Moon },
  1: { label: 'Mainly Clear', icon: Sun, nightIcon: Moon },
  2: { label: 'Partly Cloudy', icon: CloudSun, nightIcon: CloudMoon },
  3: { label: 'Overcast', icon: Cloud },
  45: { label: 'Fog', icon: CloudFog },
  48: { label: 'Rime Fog', icon: CloudFog },
  51: { label: 'Light Drizzle', icon: CloudDrizzle },
  53: { label: 'Drizzle', icon: CloudDrizzle },
  55: { label: 'Dense Drizzle', icon: CloudDrizzle },
  56: { label: 'Freezing Drizzle', icon: CloudDrizzle },
  57: { label: 'Freezing Drizzle', icon: CloudDrizzle },
  61: { label: 'Light Rain', icon: CloudRain },
  63: { label: 'Rain', icon: CloudRain },
  65: { label: 'Heavy Rain', icon: CloudRain },
  66: { label: 'Freezing Rain', icon: CloudRain },
  67: { label: 'Freezing Rain', icon: CloudRain },
  71: { label: 'Light Snow', icon: CloudSnow },
  73: { label: 'Snow', icon: CloudSnow },
  75: { label: 'Heavy Snow', icon: CloudSnow },
  77: { label: 'Snow Grains', icon: CloudSnow },
  80: { label: 'Light Showers', icon: CloudRain },
  81: { label: 'Showers', icon: CloudRain },
  82: { label: 'Violent Showers', icon: CloudRain },
  85: { label: 'Snow Showers', icon: CloudSnow },
  86: { label: 'Heavy Snow Showers', icon: CloudSnow },
  95: { label: 'Thunderstorm', icon: CloudLightning },
  96: { label: 'Thunderstorm w/ Hail', icon: CloudLightning },
  99: { label: 'Severe Thunderstorm', icon: CloudLightning },
};

export function getWeatherCondition(code: number): string {
  return WEATHER_CODE_MAP[code]?.label ?? 'Unknown';
}

export function getWeatherIcon(code: number, isDay = true): LucideIcon {
  const info = WEATHER_CODE_MAP[code];
  if (!info) return Cloud;
  if (!isDay && info.nightIcon) return info.nightIcon;
  return info.icon;
}

export type WeatherAnimationCategory = 'clear' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'thunderstorm';

export function getWeatherAnimationCategory(code: number): WeatherAnimationCategory {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2 || code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([95, 96, 99].includes(code)) return 'thunderstorm';
  return 'cloudy';
}

export function degreesToCompass(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}
