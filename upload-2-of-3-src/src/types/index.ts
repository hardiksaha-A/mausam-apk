// ---------- Location ----------
export interface GeoLocation {
  city: string;
  state?: string;
  country: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  displayName: string;
}

export type SavedLocationLabel = 'Home' | 'Work' | 'College' | 'Custom';

export interface SavedLocation extends GeoLocation {
  id: string;
  label: SavedLocationLabel;
  customLabel?: string; // used when label === 'Custom'
  savedAt: number;
}

// ---------- Data source status ----------
export type DataState = 'LIVE' | 'CACHED' | 'FORECAST' | 'ESTIMATED' | 'SIMULATED' | 'DEMO' | 'ERROR' | 'STALE' | 'LOADING';

export interface DataMeta {
  state: DataState;
  fetchedAt: number | null; // epoch ms
  error?: string;
  source: string;
}

// ---------- Weather ----------
export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number; // km/h base unit
  windDirection: number; // degrees
  windDirectionLabel: string;
  pressure: number; // hPa
  visibility: number; // km
  uvIndex: number;
  precipitationProbability: number;
  weatherCode: number;
  condition: string;
  isDay: boolean;
  sunrise: string;
  sunset: string;
  soilMoisture: number | null; // m3/m3, 0-1cm depth
  soilTemperature: number | null; // celsius, surface
}

export interface HourlyWeatherPoint {
  time: string; // ISO
  temperature: number;
  precipitationProbability: number;
  windSpeed: number;
  humidity: number;
  weatherCode: number;
  condition: string;
  isDay: boolean;
}

export interface DailyWeatherPoint {
  date: string; // ISO date
  min: number;
  max: number;
  precipitationProbability: number;
  weatherCode: number;
  condition: string;
  windSpeed: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherResult {
  current: CurrentWeather;
  hourly: HourlyWeatherPoint[];
  daily: DailyWeatherPoint[];
  timezone: string;
  meta: DataMeta;
}

// ---------- Air Quality ----------
export interface CurrentAirQuality {
  aqi: number | null; // US AQI if provided
  aqiCategory: AqiCategory;
  pm2_5: number | null;
  pm10: number | null;
  co: number | null;
  no2: number | null;
  so2: number | null;
  o3: number | null;
}

export type AqiCategory =
  | 'Good'
  | 'Moderate'
  | 'Unhealthy for Sensitive Groups'
  | 'Unhealthy'
  | 'Very Unhealthy'
  | 'Hazardous'
  | 'Unknown';

export interface HourlyAqiPoint {
  time: string;
  aqi: number | null;
  pm2_5: number | null;
  pm10: number | null;
}

export interface AirQualityResult {
  current: CurrentAirQuality;
  hourly: HourlyAqiPoint[]; // includes past (measured) + future (forecast) — see isForecast flag per point via time comparison
  meta: DataMeta;
}

// ---------- Monitoring stations (map) ----------
export interface MonitoringStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
  temp: number | null;
  humidity: number | null;
  lastUpdated: string;
  isDemo: boolean;
}

// ---------- Predictions (simulated) ----------
export interface PredictionPoint {
  horizonLabel: string; // '6 Hours' etc
  horizonHours: number;
  aqi: number;
  pm25: number;
  pm10: number;
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Severe';
}

export interface PredictionFactor {
  factor: string;
  weight: number;
  impact: string;
}

export type PredictionTrend = 'Increasing' | 'Decreasing' | 'Stable';

export interface PredictionExplanation {
  trend: PredictionTrend;
  confidenceLabel: 'Low' | 'Moderate' | 'High';
  confidenceNote: string;
  summary: string;
}

// ---------- Alerts ----------
export type AlertSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type AlertStatus = 'Active' | 'Acknowledged' | 'Resolved';
export type AlertCategory = 'Air Quality' | 'Pollution' | 'Weather' | 'Visibility';

export interface EnvAlert {
  id: string;
  type: string;
  category: AlertCategory;
  severity: AlertSeverity;
  location: string;
  timestamp: number;
  description: string;
  cause: string;
  action: string;
  status: AlertStatus;
  measurement?: string;
}

// ---------- Preferences ----------
export type UnitSystem = 'metric' | 'imperial';
export type DataMode = 'live' | 'demo';

export type Persona = 'health' | 'fitness' | 'travel' | 'family' | 'agriculture' | 'marine' | 'commuter' | 'eventPlanner';

export interface NotificationPrefs {
  severeAqi: boolean;
  weatherAlerts: boolean;
  pollutionSpikes: boolean;
  dailySummary: boolean;
}

export interface UserProfile {
  name: string;
  age: number | null;
  profession: string;
}

export interface CommuteWindows {
  morningStart: number; // hour, 0-23
  morningEnd: number;
  eveningStart: number;
  eveningEnd: number;
}

export interface AppPreferences {
  units: UnitSystem;
  dataMode: DataMode;
  notifications: NotificationPrefs;
  personas: Persona[];
  profile: UserProfile;
  onboardingCompleted: boolean;
  commuteWindows: CommuteWindows;
}

// ---------- Provider connection status (Settings > Data Sources) ----------
export interface ProviderStatus {
  id: string;
  name: string;
  kind: 'Weather' | 'Air Quality' | 'Geocoding' | 'Prediction';
  configured: boolean;
  connected: boolean;
  lastSuccess: number | null;
  lastError: string | null;
  requiresKey: boolean;
}
