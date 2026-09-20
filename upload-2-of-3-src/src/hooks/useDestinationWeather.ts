import { useCallback, useEffect, useRef, useState } from 'react';
import { weatherService } from '../services/weatherService';
import { airQualityService } from '../services/airQualityService';
import { generateAlerts } from '../services/alertService';
import { AUTO_REFRESH_INTERVAL_MS } from '../utils/constants';
import type { AirQualityResult, EnvAlert, SavedLocation, WeatherResult } from '../types';

export interface DestinationWeatherState {
  weather: WeatherResult | null;
  airQuality: AirQualityResult | null;
  alerts: EnvAlert[];
  isLoading: boolean;
  errorMessage: string | null;
  lastUpdated: number | null;
}

const IDLE_STATE: DestinationWeatherState = {
  weather: null,
  airQuality: null,
  alerts: [],
  isLoading: false,
  errorMessage: null,
  lastUpdated: null,
};

/**
 * Fetches real, live weather/AQI for a chosen destination (Travel mode) —
 * a genuinely separate API call from the main dashboard location, not a
 * re-use of the same data. Self-updates on the same interval as the main
 * dashboard so it doesn't silently go stale while a destination is
 * selected, but only runs at all while a destination is actually chosen
 * (no wasted calls for people not using Travel mode).
 */
export function useDestinationWeather(destination: SavedLocation | null): DestinationWeatherState {
  const [state, setState] = useState<DestinationWeatherState>(IDLE_STATE);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (dest: SavedLocation, silent: boolean) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;

    if (!silent) setState((prev) => ({ ...prev, isLoading: true, errorMessage: null }));

    try {
      const [weather, airQuality] = await Promise.all([
        weatherService.getForecast(dest.latitude, dest.longitude, controller.signal),
        airQualityService.getAirQuality(dest.latitude, dest.longitude, controller.signal),
      ]);
      if (requestId !== requestIdRef.current) return;
      const alerts = generateAlerts(dest.displayName, airQuality, weather);
      setState({ weather, airQuality, alerts, isLoading: false, errorMessage: null, lastUpdated: Date.now() });
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      const message = err instanceof Error ? err.message : 'Unknown error';
      // A failed background refresh shouldn't wipe out a destination
      // forecast that's already showing — only surface the error if we
      // don't have anything to fall back on yet.
      setState((prev) =>
        prev.weather ? { ...prev, isLoading: false } : { ...IDLE_STATE, isLoading: false, errorMessage: message }
      );
    }
  }, []);

  useEffect(() => {
    if (!destination) {
      setState(IDLE_STATE);
      return;
    }
    setState(IDLE_STATE);
    load(destination, false);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') load(destination, true);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination?.id, load]);

  return state;
}
