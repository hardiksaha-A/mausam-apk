import { fetchJson, ApiError } from '../lib/http';
import { classifyUsAqi } from '../utils/aqi';
import type { AirQualityResult, CurrentAirQuality, HourlyAqiPoint } from '../types';

/**
 * AirQualityProvider abstraction. Live implementation uses the
 * Open-Meteo Air Quality API (free, keyless, CORS-enabled).
 * `hourly` includes both past (measured) and future (forecast) hours —
 * consumers should compare each point's time against "now" to label it
 * correctly rather than treating the whole series as one kind of data.
 */
export interface AirQualityProvider {
  getAirQuality(lat: number, lon: number, signal?: AbortSignal): Promise<AirQualityResult>;
}

export interface GridPoint {
  id: string;
  label: string;
  lat: number;
  lng: number;
  aqi: number | null;
  pm2_5: number | null;
  pm10: number | null;
}

/**
 * Fetches live air-quality data at a small set of coordinates around a
 * center point, to visualize spatial variation on the pollution map.
 * These are genuine live readings from the CAMS atmospheric model at
 * each coordinate — NOT physical ground-sensor "stations". The map UI
 * must label them as modeled grid points, not real monitoring stations,
 * to stay honest per the brief's "never invent a real station" rule.
 */
export async function fetchLiveGrid(centerLat: number, centerLon: number, signal?: AbortSignal): Promise<GridPoint[]> {
  const offsets: { id: string; label: string; dLat: number; dLon: number }[] = [
    { id: 'center', label: 'Selected Location', dLat: 0, dLon: 0 },
    { id: 'n', label: 'North Grid Point', dLat: 0.08, dLon: 0 },
    { id: 's', label: 'South Grid Point', dLat: -0.08, dLon: 0 },
    { id: 'e', label: 'East Grid Point', dLat: 0, dLon: 0.08 },
    { id: 'w', label: 'West Grid Point', dLat: 0, dLon: -0.08 },
  ];

  const provider = airQualityService;
  const results = await Promise.allSettled(
    offsets.map(async (o) => {
      const res = await provider.getAirQuality(centerLat + o.dLat, centerLon + o.dLon, signal);
      return {
        id: o.id,
        label: o.label,
        lat: centerLat + o.dLat,
        lng: centerLon + o.dLon,
        aqi: res.current.aqi,
        pm2_5: res.current.pm2_5,
        pm10: res.current.pm10,
      } as GridPoint;
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<GridPoint> => r.status === 'fulfilled')
    .map((r) => r.value);
}

interface OpenMeteoAqResponse {
  current: {
    time: string;
    us_aqi: number | null;
    pm2_5: number | null;
    pm10: number | null;
    carbon_monoxide: number | null;
    nitrogen_dioxide: number | null;
    sulphur_dioxide: number | null;
    ozone: number | null;
  };
  hourly: {
    time: string[];
    us_aqi: (number | null)[];
    pm2_5: (number | null)[];
    pm10: (number | null)[];
  };
}

const CURRENT_PARAMS = ['us_aqi', 'pm2_5', 'pm10', 'carbon_monoxide', 'nitrogen_dioxide', 'sulphur_dioxide', 'ozone'].join(',');
const HOURLY_PARAMS = ['us_aqi', 'pm2_5', 'pm10'].join(',');

class OpenMeteoAirQualityProvider implements AirQualityProvider {
  private readonly baseUrl = 'https://air-quality-api.open-meteo.com/v1/air-quality';

  async getAirQuality(lat: number, lon: number, signal?: AbortSignal): Promise<AirQualityResult> {
    const url =
      `${this.baseUrl}?latitude=${lat}&longitude=${lon}` +
      `&current=${CURRENT_PARAMS}&hourly=${HOURLY_PARAMS}` +
      `&forecast_days=3&past_days=1&timezone=auto`;

    let data: OpenMeteoAqResponse;
    try {
      data = await fetchJson<OpenMeteoAqResponse>(url, { signal });
    } catch (err) {
      throw new ApiError(err instanceof Error ? `Air quality provider error: ${err.message}` : 'Air quality provider error');
    }

    const aqi = data.current.us_aqi;
    const current: CurrentAirQuality = {
      aqi,
      aqiCategory: classifyUsAqi(aqi),
      pm2_5: data.current.pm2_5,
      pm10: data.current.pm10,
      co: data.current.carbon_monoxide,
      no2: data.current.nitrogen_dioxide,
      so2: data.current.sulphur_dioxide,
      o3: data.current.ozone,
    };

    const hourly: HourlyAqiPoint[] = data.hourly.time.map((time, i) => ({
      time,
      aqi: data.hourly.us_aqi[i],
      pm2_5: data.hourly.pm2_5[i],
      pm10: data.hourly.pm10[i],
    }));

    return {
      current,
      hourly,
      meta: { state: 'LIVE', fetchedAt: Date.now(), source: 'Open-Meteo Air Quality API' },
    };
  }
}

export const airQualityService: AirQualityProvider = new OpenMeteoAirQualityProvider();
