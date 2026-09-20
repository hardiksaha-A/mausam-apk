import type { WeatherResult, AirQualityResult, GeoLocation, MonitoringStation } from '../types';

// Static, clearly-labeled sample data for Demo Mode. Never mixed with
// live results — DataStatus badges always show DEMO when this is active.

export const DEMO_LOCATION: GeoLocation = {
  city: 'Patna',
  state: 'Bihar',
  country: 'India',
  countryCode: 'IN',
  latitude: 25.5941,
  longitude: 85.1376,
  timezone: 'Asia/Kolkata',
  displayName: 'Patna, Bihar, India',
};

function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 3600 * 1000).toISOString();
}

export function buildDemoWeather(): WeatherResult {
  const hourly = Array.from({ length: 48 }, (_, i) => ({
    time: hoursFromNow(i - 6),
    temperature: 26 + Math.round(6 * Math.sin(i / 4)),
    precipitationProbability: Math.max(0, Math.round(30 + 40 * Math.sin(i / 6))),
    windSpeed: 10 + Math.round(6 * Math.sin(i / 5)),
    humidity: 55 + Math.round(15 * Math.sin(i / 7)),
    weatherCode: [0, 1, 2, 3, 61][i % 5],
    condition: ['Clear Sky', 'Mainly Clear', 'Partly Cloudy', 'Overcast', 'Light Rain'][i % 5],
    isDay: (i % 24) > 5 && (i % 24) < 19,
  }));

  const daily = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.now() + i * 86400 * 1000);
    return {
      date: date.toISOString(),
      min: 22 + (i % 3),
      max: 31 + (i % 4),
      precipitationProbability: [10, 70, 90, 50, 10, 0, 0][i],
      weatherCode: [1, 61, 95, 61, 0, 0, 1][i],
      condition: ['Mainly Clear', 'Light Rain', 'Thunderstorm', 'Light Rain', 'Clear Sky', 'Clear Sky', 'Mainly Clear'][i],
      windSpeed: 12 + (i % 5),
      sunrise: '05:42 AM',
      sunset: '06:18 PM',
    };
  });

  return {
    current: {
      temperature: 28,
      feelsLike: 31,
      humidity: 65,
      windSpeed: 14,
      windDirection: 45,
      windDirectionLabel: 'NE',
      pressure: 1012,
      visibility: 8,
      uvIndex: 6,
      precipitationProbability: 15,
      weatherCode: 2,
      condition: 'Partly Cloudy',
      isDay: true,
      sunrise: '05:42 AM',
      sunset: '06:18 PM',
      soilMoisture: 0.24,
      soilTemperature: 26,
    },
    hourly,
    daily,
    timezone: 'Asia/Kolkata',
    meta: { state: 'DEMO', fetchedAt: Date.now(), source: 'Sample dataset (Demo Mode)' },
  };
}

export function buildDemoAirQuality(): AirQualityResult {
  const hourly = Array.from({ length: 48 }, (_, i) => ({
    time: hoursFromNow(i - 24),
    aqi: 90 + Math.round(60 * Math.sin(i / 8) + 30),
    pm2_5: 30 + Math.round(25 * Math.sin(i / 8) + 12),
    pm10: 60 + Math.round(40 * Math.sin(i / 8) + 20),
  }));

  return {
    current: {
      aqi: 142,
      aqiCategory: 'Unhealthy for Sensitive Groups',
      pm2_5: 55.4,
      pm10: 110.2,
      co: 0.8,
      no2: 24.0,
      so2: 12.5,
      o3: 45.0,
    },
    hourly,
    meta: { state: 'DEMO', fetchedAt: Date.now(), source: 'Sample dataset (Demo Mode)' },
  };
}

export function buildDemoStations(center: GeoLocation): MonitoringStation[] {
  return [
    { id: 'demo-01', name: 'Alpha Node (Downtown)', lat: center.latitude + 0.01, lng: center.longitude, aqi: 142, pm25: 55.4, pm10: 110.2, temp: 28, humidity: 65, lastUpdated: '10 min ago', isDemo: true },
    { id: 'demo-02', name: 'Beta Node (Park)', lat: center.latitude + 0.025, lng: center.longitude + 0.01, aqi: 85, pm25: 25.1, pm10: 60.5, temp: 27, humidity: 66, lastUpdated: '5 min ago', isDemo: true },
    { id: 'demo-03', name: 'Gamma Node (Industrial)', lat: center.latitude + 0.035, lng: center.longitude - 0.09, aqi: 215, pm25: 120.3, pm10: 180.1, temp: 29, humidity: 62, lastUpdated: '2 min ago', isDemo: true },
    { id: 'demo-04', name: 'Delta Node (Suburban)', lat: center.latitude + 0.03, lng: center.longitude - 0.03, aqi: 45, pm25: 12.0, pm10: 30.0, temp: 26, humidity: 68, lastUpdated: '15 min ago', isDemo: true },
    { id: 'demo-05', name: 'Epsilon Node (Transit)', lat: center.latitude - 0.005, lng: center.longitude + 0.015, aqi: 165, pm25: 75.2, pm10: 135.4, temp: 28, humidity: 64, lastUpdated: 'Just now', isDemo: true },
  ];
}
