import { fetchJson, ApiError } from '../lib/http';
import type { GeoLocation } from '../types';

/**
 * Geocoding provider abstraction.
 *
 * Live implementation: Open-Meteo Geocoding API (forward search) +
 * BigDataCloud reverse-geocode-client (reverse lookup). Both are free,
 * keyless, CORS-enabled endpoints, so no secret credential or backend
 * proxy is required for this provider. A future provider (e.g. Google
 * Places, Mapbox) can implement the same GeocodingProvider interface
 * without touching any UI code.
 */
export interface GeocodingProvider {
  search(query: string, signal?: AbortSignal): Promise<GeoLocation[]>;
  reverse(lat: number, lon: number, signal?: AbortSignal): Promise<GeoLocation>;
}

interface OpenMeteoGeoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  country_code?: string;
  admin1?: string;
  timezone: string;
}

interface OpenMeteoGeoResponse {
  results?: OpenMeteoGeoResult[];
}

interface BigDataCloudReverseResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
  countryCode?: string;
}

function buildDisplayName(city: string, state?: string, country?: string) {
  return [city, state, country].filter(Boolean).join(', ');
}

class OpenMeteoGeocodingProvider implements GeocodingProvider {
  private readonly baseUrl = 'https://geocoding-api.open-meteo.com/v1/search';
  private readonly reverseUrl = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

  async search(query: string, signal?: AbortSignal): Promise<GeoLocation[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const url = `${this.baseUrl}?name=${encodeURIComponent(trimmed)}&count=8&language=en&format=json`;
    const data = await fetchJson<OpenMeteoGeoResponse>(url, { signal });

    if (!data.results || data.results.length === 0) return [];

    return data.results.map((r) => ({
      city: r.name,
      state: r.admin1,
      country: r.country,
      countryCode: r.country_code,
      latitude: r.latitude,
      longitude: r.longitude,
      timezone: r.timezone,
      displayName: buildDisplayName(r.name, r.admin1, r.country),
    }));
  }

  async reverse(lat: number, lon: number, signal?: AbortSignal): Promise<GeoLocation> {
    const url = `${this.reverseUrl}?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    try {
      const data = await fetchJson<BigDataCloudReverseResponse>(url, { signal });
      const city = data.city || data.locality || 'Unknown location';
      const state = data.principalSubdivision;
      const country = data.countryName || 'Unknown';
      return {
        city,
        state,
        country,
        countryCode: data.countryCode,
        latitude: lat,
        longitude: lon,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        displayName: buildDisplayName(city, state, country),
      };
    } catch (err) {
      throw new ApiError(
        err instanceof Error ? `Reverse geocoding failed: ${err.message}` : 'Reverse geocoding failed'
      );
    }
  }
}

export const geocodingService: GeocodingProvider = new OpenMeteoGeocodingProvider();
