import { fetchJson, ApiError } from '../lib/http';

export type AnalyticsRange = '24h' | '7d' | '30d' | '6m' | '1y';

export const RANGE_DAYS: Record<AnalyticsRange, number> = {
  '24h': 1,
  '7d': 7,
  '30d': 30,
  '6m': 182,
  '1y': 365,
};

// Open-Meteo's keyless Air Quality API only exposes a limited rolling
// history window (no long-term archive) without a paid tier. Requests
// beyond this are honestly capped rather than silently truncated/faked.
const AQ_HISTORY_LIMIT_DAYS = 92;

export interface AnalyticsPoint {
  /** ISO timestamp — an hour for the 24h range, a calendar date otherwise. */
  date: string;
  tempMax: number | null;
  tempMin: number | null;
  wind: number | null;
  precipitation: number | null;
  aqi: number | null;
  pm2_5: number | null;
  pm10: number | null;
}

// Kept as an alias so any external references keep working after the
// hourly-granularity refactor.
export type DailyAnalyticsPoint = AnalyticsPoint;

export interface AnalyticsResult {
  points: AnalyticsPoint[];
  granularity: 'hourly' | 'daily';
  weatherState: 'LIVE' | 'ERROR';
  aqState: 'LIVE' | 'ESTIMATED' | 'ERROR';
  aqCappedDays: number | null; // set when the requested range exceeded provider history limits
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function average(nums: (number | null | undefined)[]): number | null {
  const valid = nums.filter((n): n is number => n !== null && n !== undefined && !Number.isNaN(n));
  if (valid.length === 0) return null;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
}

interface HourlyForecastResponse {
  hourly: {
    time: string[];
    temperature_2m: number[];
    wind_speed_10m: number[];
    precipitation: number[];
  };
}

interface HourlyAqResponse {
  hourly: {
    time: string[];
    us_aqi: (number | null)[];
    pm2_5: (number | null)[];
    pm10: (number | null)[];
  };
}

/**
 * 24-hour range: uses the live Forecast API (with past_days=1) rather
 * than the historical Archive API, because Archive data has a multi-day
 * reporting lag and would show as empty/missing for "the last 24 hours".
 * Air quality is already hourly-native, so no aggregation is needed.
 */
async function fetchLast24Hours(lat: number, lon: number, signal?: AbortSignal): Promise<AnalyticsResult> {
  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,wind_speed_10m,precipitation&past_days=1&forecast_days=1&timezone=auto`;
  const aqUrl =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
    `&hourly=us_aqi,pm2_5,pm10&past_days=1&forecast_days=1&timezone=auto`;

  let weatherState: AnalyticsResult['weatherState'] = 'LIVE';
  let weather: HourlyForecastResponse['hourly'] | null = null;
  try {
    weather = (await fetchJson<HourlyForecastResponse>(weatherUrl, { signal })).hourly;
  } catch (err) {
    weatherState = 'ERROR';
    if (!(err instanceof ApiError)) throw err;
  }

  let aqState: AnalyticsResult['aqState'] = 'LIVE';
  let aq: HourlyAqResponse['hourly'] | null = null;
  try {
    aq = (await fetchJson<HourlyAqResponse>(aqUrl, { signal })).hourly;
  } catch (err) {
    aqState = 'ERROR';
    if (!(err instanceof ApiError)) throw err;
  }

  const aqByTime = new Map<string, { aqi: number | null; pm2_5: number | null; pm10: number | null }>();
  aq?.time.forEach((t, i) => aqByTime.set(t, { aqi: aq!.us_aqi[i], pm2_5: aq!.pm2_5[i], pm10: aq!.pm10[i] }));

  const nowMs = Date.now();
  const cutoffMs = nowMs - 24 * 3600 * 1000;
  const times = weather?.time ?? aq?.time ?? [];

  const points: AnalyticsPoint[] = times
    .map((time, i) => {
      const aqEntry = aqByTime.get(time);
      return {
        date: time,
        tempMax: weather ? weather.temperature_2m[i] ?? null : null,
        tempMin: weather ? weather.temperature_2m[i] ?? null : null,
        wind: weather ? weather.wind_speed_10m[i] ?? null : null,
        precipitation: weather ? weather.precipitation[i] ?? null : null,
        aqi: aqEntry?.aqi ?? null,
        pm2_5: aqEntry?.pm2_5 ?? null,
        pm10: aqEntry?.pm10 ?? null,
      };
    })
    .filter((p) => {
      const t = new Date(p.date).getTime();
      return t >= cutoffMs && t <= nowMs;
    });

  return { points, granularity: 'hourly', weatherState, aqState, aqCappedDays: null };
}

interface ArchiveResponse {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    wind_speed_10m_max: number[];
    precipitation_sum: number[];
  };
}

interface AqHistoryResponse {
  hourly: {
    time: string[];
    us_aqi: (number | null)[];
    pm2_5: (number | null)[];
    pm10: (number | null)[];
  };
}

async function fetchDailyRange(lat: number, lon: number, requestedDays: number, signal?: AbortSignal): Promise<AnalyticsResult> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - requestedDays);

  const weatherUrl =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
    `&start_date=${toDateStr(start)}&end_date=${toDateStr(end)}` +
    `&daily=temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_sum&timezone=auto`;

  let weatherState: AnalyticsResult['weatherState'] = 'LIVE';
  let weatherDaily: ArchiveResponse['daily'] | null = null;
  try {
    weatherDaily = (await fetchJson<ArchiveResponse>(weatherUrl, { signal })).daily;
  } catch (err) {
    weatherState = 'ERROR';
    if (!(err instanceof ApiError)) throw err;
  }

  const aqDays = Math.min(requestedDays, AQ_HISTORY_LIMIT_DAYS);
  const aqCappedDays = requestedDays > AQ_HISTORY_LIMIT_DAYS ? AQ_HISTORY_LIMIT_DAYS : null;
  const aqUrl =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
    `&hourly=us_aqi,pm2_5,pm10&past_days=${aqDays}&forecast_days=1&timezone=auto`;

  let aqState: AnalyticsResult['aqState'] = 'LIVE';
  let aqHourly: AqHistoryResponse['hourly'] | null = null;
  try {
    aqHourly = (await fetchJson<AqHistoryResponse>(aqUrl, { signal })).hourly;
    if (aqCappedDays) aqState = 'ESTIMATED';
  } catch (err) {
    aqState = 'ERROR';
    if (!(err instanceof ApiError)) throw err;
  }

  // Aggregate AQ hourly data into daily buckets.
  const aqByDate = new Map<string, { aqi: number[]; pm2_5: number[]; pm10: number[] }>();
  if (aqHourly) {
    aqHourly.time.forEach((t, i) => {
      const date = t.slice(0, 10);
      if (!aqByDate.has(date)) aqByDate.set(date, { aqi: [], pm2_5: [], pm10: [] });
      const bucket = aqByDate.get(date)!;
      if (aqHourly!.us_aqi[i] !== null) bucket.aqi.push(aqHourly!.us_aqi[i] as number);
      if (aqHourly!.pm2_5[i] !== null) bucket.pm2_5.push(aqHourly!.pm2_5[i] as number);
      if (aqHourly!.pm10[i] !== null) bucket.pm10.push(aqHourly!.pm10[i] as number);
    });
  }

  const dates = weatherDaily?.time ?? Array.from(aqByDate.keys()).sort();

  const points: AnalyticsPoint[] = dates.map((date, i) => {
    const aqBucket = aqByDate.get(date);
    return {
      date,
      tempMax: weatherDaily ? weatherDaily.temperature_2m_max[i] ?? null : null,
      tempMin: weatherDaily ? weatherDaily.temperature_2m_min[i] ?? null : null,
      wind: weatherDaily ? weatherDaily.wind_speed_10m_max[i] ?? null : null,
      precipitation: weatherDaily ? weatherDaily.precipitation_sum[i] ?? null : null,
      aqi: aqBucket ? average(aqBucket.aqi) : null,
      pm2_5: aqBucket ? average(aqBucket.pm2_5) : null,
      pm10: aqBucket ? average(aqBucket.pm10) : null,
    };
  });

  return { points, granularity: 'daily', weatherState, aqState, aqCappedDays };
}

export async function fetchAnalytics(lat: number, lon: number, range: AnalyticsRange, signal?: AbortSignal): Promise<AnalyticsResult> {
  if (range === '24h') return fetchLast24Hours(lat, lon, signal);
  return fetchDailyRange(lat, lon, RANGE_DAYS[range], signal);
}
