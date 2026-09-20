import { fetchJson, ApiError } from '../lib/http';

/**
 * Marine conditions for Marine/Beach mode. Uses Open-Meteo's free, keyless
 * Marine Weather API — real data, but only meaningful for ocean/coastal
 * coordinates. Inland locations return null fields (the API itself
 * returns no marine grid there), which callers should treat as
 * "not applicable to this location" rather than an error.
 *
 * Note: real astronomical tide TIMES (high/low tide clock times) are not
 * available from any free, global, keyless source — deliberately not
 * faked here. Only wave/sea-temperature data, which is real, is exposed.
 */
export interface MarineResult {
  available: boolean; // false when this location has no marine grid data (inland)
  waveHeight: number | null; // meters
  waveDirection: number | null; // degrees
  wavePeriod: number | null; // seconds
  seaSurfaceTemperature: number | null; // celsius
  fetchedAt: number;
}

interface OpenMeteoMarineResponse {
  current?: {
    wave_height?: number | null;
    wave_direction?: number | null;
    wave_period?: number | null;
    sea_surface_temperature?: number | null;
  };
}

const CURRENT_PARAMS = ['wave_height', 'wave_direction', 'wave_period', 'sea_surface_temperature'].join(',');

export const marineService = {
  async getConditions(lat: number, lon: number, signal?: AbortSignal): Promise<MarineResult> {
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=${CURRENT_PARAMS}&timezone=auto`;

    try {
      const data = await fetchJson<OpenMeteoMarineResponse>(url, { signal });
      const c = data.current;
      const hasData = !!c && c.wave_height != null;
      return {
        available: hasData,
        waveHeight: c?.wave_height ?? null,
        waveDirection: c?.wave_direction ?? null,
        wavePeriod: c?.wave_period ?? null,
        seaSurfaceTemperature: c?.sea_surface_temperature ?? null,
        fetchedAt: Date.now(),
      };
    } catch (err) {
      // A failed/empty response for an inland location is expected, not
      // exceptional — surface it as "unavailable" rather than an error.
      if (err instanceof ApiError) {
        return {
          available: false,
          waveHeight: null,
          waveDirection: null,
          wavePeriod: null,
          seaSurfaceTemperature: null,
          fetchedAt: Date.now(),
        };
      }
      throw err;
    }
  },
};
