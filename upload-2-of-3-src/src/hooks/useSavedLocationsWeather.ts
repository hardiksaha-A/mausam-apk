import { useEffect, useRef, useState } from 'react';
import { weatherService } from '../services/weatherService';
import { AUTO_REFRESH_INTERVAL_MS } from '../utils/constants';
import type { SavedLocation } from '../types';

export interface QuickWeather {
  temperature: number;
  weatherCode: number;
  isDay: boolean;
  condition: string;
  min: number;
  max: number;
}

// Shared across screens so switching tabs doesn't refetch everything.
const cache = new Map<string, { at: number; data: QuickWeather }>();

/**
 * Live temperature/condition for each saved place — one real Open-Meteo
 * forecast call per place (max 8), cached for the standard refresh interval.
 * A place whose fetch fails simply has no entry (UI shows "—"), never a guess.
 */
export function useSavedLocationsWeather(places: SavedLocation[]): { data: Record<string, QuickWeather>; loading: boolean } {
  const [data, setData] = useState<Record<string, QuickWeather>>({});
  const [loading, setLoading] = useState(false);
  const key = places.map((p) => `${p.id}:${p.latitude},${p.longitude}`).join('|');
  const placesRef = useRef(places);
  placesRef.current = places;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      const list = placesRef.current;
      const now = Date.now();
      const next: Record<string, QuickWeather> = {};
      const todo: SavedLocation[] = [];
      for (const p of list) {
        const c = cache.get(p.id + p.latitude + p.longitude);
        if (c && now - c.at < AUTO_REFRESH_INTERVAL_MS) next[p.id] = c.data;
        else todo.push(p);
      }
      if (!cancelled) setData((prev) => ({ ...prev, ...next }));
      if (todo.length === 0) return;
      setLoading(true);
      await Promise.allSettled(
        todo.map(async (p) => {
          try {
            const w = await weatherService.getForecast(p.latitude, p.longitude, controller.signal);
            const q: QuickWeather = {
              temperature: w.current.temperature,
              weatherCode: w.current.weatherCode,
              isDay: w.current.isDay,
              condition: w.current.condition,
              min: w.daily[0]?.min ?? w.current.temperature,
              max: w.daily[0]?.max ?? w.current.temperature,
            };
            cache.set(p.id + p.latitude + p.longitude, { at: Date.now(), data: q });
            if (!cancelled) setData((prev) => ({ ...prev, [p.id]: q }));
          } catch {
            // leave this place without data
          }
        })
      );
      if (!cancelled) setLoading(false);
    }

    load();
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, AUTO_REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(id);
    };
  }, [key]);

  return { data, loading };
}
