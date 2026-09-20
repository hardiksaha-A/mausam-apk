import { fetchJson, ApiError } from '../lib/http';
import { getWeatherCondition, degreesToCompass } from '../utils/weatherCodes';
import type { WeatherResult, CurrentWeather, HourlyWeatherPoint, DailyWeatherPoint } from '../types';

/**
 * WeatherProvider abstraction. The live implementation talks to the
 * Open-Meteo Forecast API (free, keyless, CORS-enabled — no secret to
 * manage and no backend proxy required). Swapping to a different
 * provider later means implementing this same interface.
 */
export interface WeatherProvider {
  getForecast(lat: number, lon: number, signal?: AbortSignal): Promise<WeatherResult>;
}

interface OpenMeteoForecastResponse {
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    precipitation_probability?: number;
    weather_code: number;
    is_day: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    pressure_msl: number;
    visibility?: number;
    uv_index?: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    wind_speed_10m: number[];
    relative_humidity_2m: number[];
    weather_code: number[];
    is_day: number[];
    visibility: number[];
    uv_index: number[];
    soil_moisture_0_to_1cm?: number[];
    soil_temperature_0cm?: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    sunrise: string[];
    sunset: string[];
  };
}

const CURRENT_PARAMS = [
  'temperature_2m', 'apparent_temperature', 'relative_humidity_2m', 'precipitation_probability',
  'weather_code', 'is_day', 'wind_speed_10m', 'wind_direction_10m', 'pressure_msl',
].join(',');

const HOURLY_PARAMS = [
  'temperature_2m', 'precipitation_probability', 'wind_speed_10m', 'relative_humidity_2m',
  'weather_code', 'is_day', 'visibility', 'uv_index', 'soil_moisture_0_to_1cm', 'soil_temperature_0cm',
].join(',');

const DAILY_PARAMS = [
  'weather_code', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_probability_max',
  'wind_speed_10m_max', 'sunrise', 'sunset',
].join(',');

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

class OpenMeteoWeatherProvider implements WeatherProvider {
  private readonly baseUrl = 'https://api.open-meteo.com/v1/forecast';

  async getForecast(lat: number, lon: number, signal?: AbortSignal): Promise<WeatherResult> {
    const url =
      `${this.baseUrl}?latitude=${lat}&longitude=${lon}` +
      `&current=${CURRENT_PARAMS}&hourly=${HOURLY_PARAMS}&daily=${DAILY_PARAMS}` +
      `&forecast_days=8&timezone=auto`;

    let data: OpenMeteoForecastResponse;
    try {
      data = await fetchJson<OpenMeteoForecastResponse>(url, { signal });
    } catch (err) {
      throw new ApiError(err instanceof Error ? `Weather provider error: ${err.message}` : 'Weather provider error');
    }

    const nowIso = data.current.time;
    const currentHourIndex = Math.max(0, data.hourly.time.findIndex((t) => t >= nowIso));
    const visibilityMeters = data.hourly.visibility?.[currentHourIndex] ?? 10000;
    const uv = data.hourly.uv_index?.[currentHourIndex] ?? 0;

    const current: CurrentWeather = {
      temperature: Math.round(data.current.temperature_2m),
      feelsLike: Math.round(data.current.apparent_temperature),
      humidity: Math.round(data.current.relative_humidity_2m),
      windSpeed: Math.round(data.current.wind_speed_10m),
      windDirection: data.current.wind_direction_10m,
      windDirectionLabel: degreesToCompass(data.current.wind_direction_10m),
      pressure: Math.round(data.current.pressure_msl),
      visibility: Math.round((visibilityMeters / 1000) * 10) / 10,
      uvIndex: Math.round(uv * 10) / 10,
      precipitationProbability: data.current.precipitation_probability ?? data.hourly.precipitation_probability?.[currentHourIndex] ?? 0,
      weatherCode: data.current.weather_code,
      condition: getWeatherCondition(data.current.weather_code),
      isDay: data.current.is_day === 1,
      sunrise: data.daily.sunrise[0] ? formatTime(data.daily.sunrise[0]) : '--',
      sunset: data.daily.sunset[0] ? formatTime(data.daily.sunset[0]) : '--',
      soilMoisture: data.hourly.soil_moisture_0_to_1cm?.[currentHourIndex] ?? null,
      soilTemperature: data.hourly.soil_temperature_0cm != null
        ? Math.round(data.hourly.soil_temperature_0cm[currentHourIndex])
        : null,
    };

    const hourly: HourlyWeatherPoint[] = data.hourly.time.map((time, i) => ({
      time,
      temperature: Math.round(data.hourly.temperature_2m[i]),
      precipitationProbability: data.hourly.precipitation_probability[i] ?? 0,
      windSpeed: Math.round(data.hourly.wind_speed_10m[i]),
      humidity: Math.round(data.hourly.relative_humidity_2m[i]),
      weatherCode: data.hourly.weather_code[i],
      condition: getWeatherCondition(data.hourly.weather_code[i]),
      isDay: data.hourly.is_day[i] === 1,
    }));

    const daily: DailyWeatherPoint[] = data.daily.time.map((date, i) => ({
      date,
      min: Math.round(data.daily.temperature_2m_min[i]),
      max: Math.round(data.daily.temperature_2m_max[i]),
      precipitationProbability: data.daily.precipitation_probability_max[i] ?? 0,
      weatherCode: data.daily.weather_code[i],
      condition: getWeatherCondition(data.daily.weather_code[i]),
      windSpeed: Math.round(data.daily.wind_speed_10m_max[i]),
      sunrise: formatTime(data.daily.sunrise[i]),
      sunset: formatTime(data.daily.sunset[i]),
    }));

    return {
      current,
      hourly,
      daily,
      timezone: data.timezone,
      meta: { state: 'LIVE', fetchedAt: Date.now(), source: 'Open-Meteo Forecast API' },
    };
  }
}

export const weatherService: WeatherProvider = new OpenMeteoWeatherProvider();
