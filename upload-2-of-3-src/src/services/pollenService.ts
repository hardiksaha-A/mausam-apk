import { fetchJson, ApiError } from '../lib/http';

/**
 * Pollen levels for Health mode. Uses Open-Meteo's free, keyless Air
 * Quality API's European CAMS regional pollen fields — real data, but
 * genuinely only available for Europe (the underlying model has no
 * global pollen coverage). Outside Europe this honestly reports
 * `available: false` rather than fabricating a number — same principle
 * as tide times in marineService.ts.
 */
export interface PollenResult {
  available: boolean;
  dominant: string | null; // e.g. "Grass", "Birch" — whichever pollen type is highest right now
  level: 'Low' | 'Moderate' | 'High' | 'Very High' | null;
  fetchedAt: number;
}

interface OpenMeteoPollenResponse {
  current?: Record<string, number | null>;
}

const POLLEN_TYPES = [
  { key: 'alder_pollen', label: 'Alder' },
  { key: 'birch_pollen', label: 'Birch' },
  { key: 'grass_pollen', label: 'Grass' },
  { key: 'mugwort_pollen', label: 'Mugwort' },
  { key: 'olive_pollen', label: 'Olive' },
  { key: 'ragweed_pollen', label: 'Ragweed' },
];

// Rough grains/m³ thresholds — common pollen-forecast convention, not an
// official medical standard, used only to turn a raw count into a
// plain-language level.
function levelFor(count: number): PollenResult['level'] {
  if (count < 10) return 'Low';
  if (count < 50) return 'Moderate';
  if (count < 150) return 'High';
  return 'Very High';
}

export const pollenService = {
  async getPollen(lat: number, lon: number, signal?: AbortSignal): Promise<PollenResult> {
    const params = POLLEN_TYPES.map((p) => p.key).join(',');
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=${params}&timezone=auto`;

    try {
      const data = await fetchJson<OpenMeteoPollenResponse>(url, { signal });
      const c = data.current;
      if (!c) return { available: false, dominant: null, level: null, fetchedAt: Date.now() };

      let dominant: string | null = null;
      let max = -1;
      for (const p of POLLEN_TYPES) {
        const val = c[p.key];
        if (val != null && val > max) {
          max = val;
          dominant = p.label;
        }
      }

      if (dominant === null) {
        // All fields null -> outside the CAMS Europe domain, not an error
        return { available: false, dominant: null, level: null, fetchedAt: Date.now() };
      }

      return { available: true, dominant, level: levelFor(max), fetchedAt: Date.now() };
    } catch (err) {
      if (err instanceof ApiError) {
        return { available: false, dominant: null, level: null, fetchedAt: Date.now() };
      }
      throw err;
    }
  },
};
