import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { weatherService } from '../services/weatherService';
import { airQualityService, fetchLiveGrid, type GridPoint } from '../services/airQualityService';
import { generateAlerts } from '../services/alertService';
import { buildDemoWeather, buildDemoAirQuality, buildDemoStations } from '../data/demoData';
import { useAppLocation } from './LocationContext';
import { usePreferences } from './PreferencesContext';
import { useToast } from './ToastContext';
import type { AirQualityResult, WeatherResult, EnvAlert, MonitoringStation, DataState } from '../types';
import { AUTO_REFRESH_INTERVAL_MS } from '../utils/constants';

interface CacheEntry {
  weather: WeatherResult;
  airQuality: AirQualityResult;
  timestamp: number;
}

interface EnvironmentDataContextValue {
  weather: WeatherResult | null;
  airQuality: AirQualityResult | null;
  alerts: EnvAlert[];
  stations: MonitoringStation[];
  status: DataState;
  errorMessage: string | null;
  isRefreshing: boolean;
  lastUpdated: number | null;
  refresh: () => void;
}

const EnvironmentDataContext = createContext<EnvironmentDataContextValue | undefined>(undefined);

function locationKey(lat: number, lon: number) {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

/** How often to silently re-fetch live data in the background. */
const CACHE_STORAGE_KEY = 'mausam:data-cache';
const MAX_PERSISTED_ENTRIES = 10;

/**
 * Loads the on-disk cache of last-known-good weather/AQI readings, so a
 * cold app start (or a fetch failure right after opening) can show real,
 * recently-seen data immediately instead of a blank loading screen —
 * clearly labeled as cached via the existing 'CACHED' status, never
 * presented as if it were live.
 */
function loadPersistedCache(): Map<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return new Map();
    const entries = JSON.parse(raw) as [string, CacheEntry][];
    return new Map(entries);
  } catch {
    return new Map();
  }
}

function persistCache(cache: Map<string, CacheEntry>) {
  try {
    // Keep only the most recently-updated entries so this can't grow
    // unbounded as someone checks more and more locations over time.
    const trimmed = [...cache.entries()]
      .sort((a, b) => b[1].timestamp - a[1].timestamp)
      .slice(0, MAX_PERSISTED_ENTRIES);
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full or unavailable (private browsing) — cache just won't
    // survive a restart this time; not worth surfacing to the user.
  }
}

export const EnvironmentDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { location } = useAppLocation();
  const { preferences } = usePreferences();
  const { showToast } = useToast();

  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [airQuality, setAirQuality] = useState<AirQualityResult | null>(null);
  const [gridPoints, setGridPoints] = useState<GridPoint[]>([]);
  const [status, setStatus] = useState<DataState>('LOADING');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const cacheRef = useRef<Map<string, CacheEntry> | null>(null);
  if (cacheRef.current === null) {
    cacheRef.current = loadPersistedCache();
  }
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (mode: 'initial' | 'manual' | 'background' = 'initial') => {
      // Cancel any in-flight request so a fast location switch can't let a
      // stale response overwrite the newer one.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = ++requestIdRef.current;

      if (mode === 'manual') setIsRefreshing(true);
      else if (mode === 'initial') {
        // Cold start: if we have a real, previously-fetched reading for
        // this exact location on disk, show it immediately (clearly
        // labeled CACHED with its real timestamp) instead of a blank
        // loading screen — then still fetch fresh data below regardless.
        const key = locationKey(location.latitude, location.longitude);
        const onDisk = cacheRef.current!.get(key);
        if (onDisk) {
          setWeather(onDisk.weather);
          setAirQuality(onDisk.airQuality);
          setStatus('CACHED');
          setErrorMessage(null);
          setLastUpdated(onDisk.timestamp);
        } else {
          setStatus('LOADING');
        }
        // A location or mode change invalidates the previous pollution-map
        // grid points immediately — otherwise stale markers from the old
        // location would linger on the map until the new grid fetch
        // resolves several seconds later.
        setGridPoints([]);
      }
      // 'background' mode intentionally touches no loading-state UI at all —
      // it should be invisible unless it actually has new data to show.

      if (preferences.dataMode === 'demo') {
        const demoWeather = buildDemoWeather();
        const demoAq = buildDemoAirQuality();
        if (requestId !== requestIdRef.current) return;
        setWeather(demoWeather);
        setAirQuality(demoAq);
        setStatus('DEMO');
        setErrorMessage(null);
        setLastUpdated(Date.now());
        setGridPoints([]);
        setIsRefreshing(false);
        return;
      }

      const key = locationKey(location.latitude, location.longitude);

      try {
        const [w, aq] = await Promise.all([
          weatherService.getForecast(location.latitude, location.longitude, controller.signal),
          airQualityService.getAirQuality(location.latitude, location.longitude, controller.signal),
        ]);

        if (requestId !== requestIdRef.current) return; // superseded by a newer request

        cacheRef.current!.set(key, { weather: w, airQuality: aq, timestamp: Date.now() });
        persistCache(cacheRef.current!);
        setWeather(w);
        setAirQuality(aq);
        setStatus('LIVE');
        setErrorMessage(null);
        setLastUpdated(Date.now());
        if (mode === 'manual') showToast('Data refreshed', 'success');

        // Fire-and-forget: live grid points for the pollution map, non-blocking.
        fetchLiveGrid(location.latitude, location.longitude, controller.signal)
          .then((pts) => {
            if (requestId === requestIdRef.current) setGridPoints(pts);
          })
          .catch(() => {
            /* grid points are supplementary; ignore failures */
          });
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        // A silent background refresh that fails should never disturb a
        // screen that's already showing good data — just skip it and try
        // again on the next interval tick.
        if (mode === 'background' && status === 'LIVE') return;
        const message = err instanceof Error ? err.message : 'Unknown error';
        const cached = cacheRef.current!.get(key);
        if (cached) {
          setWeather(cached.weather);
          setAirQuality(cached.airQuality);
          setStatus('CACHED');
          setErrorMessage(message);
          setLastUpdated(cached.timestamp);
        } else {
          setStatus('ERROR');
          setErrorMessage(message);
        }
        if (mode === 'manual') showToast('Live data unavailable — check your connection', 'error');
      } finally {
        if (requestId === requestIdRef.current) setIsRefreshing(false);
      }
    },
    [location.latitude, location.longitude, preferences.dataMode, showToast, status]
  );

  useEffect(() => {
    load('initial');
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.latitude, location.longitude, preferences.dataMode]);

  // Auto-refresh: silently re-fetch every AUTO_REFRESH_INTERVAL while the
  // app is visible/focused. Paused entirely when the window is hidden or
  // minimized (no point burning API calls nobody's looking at) — and on
  // returning to the app, refreshes immediately if the data has gone stale
  // in the meantime rather than waiting for the next tick.
  useEffect(() => {
    if (preferences.dataMode === 'demo') return;

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') load('background');
    }, AUTO_REFRESH_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      const staleFor = lastUpdated ? Date.now() - lastUpdated : Infinity;
      if (staleFor >= AUTO_REFRESH_INTERVAL_MS) load('background');
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.latitude, location.longitude, preferences.dataMode, lastUpdated]);

  const refresh = useCallback(() => {
    load('manual');
  }, [load]);

  const alerts = useMemo(
    () => generateAlerts(location.displayName, airQuality, weather),
    [location.displayName, airQuality, weather]
  );

  const stations: MonitoringStation[] = useMemo(() => {
    if (preferences.dataMode === 'demo') return buildDemoStations(location);
    return gridPoints.map((p) => ({
      id: p.id,
      name: p.label,
      lat: p.lat,
      lng: p.lng,
      aqi: p.aqi,
      pm25: p.pm2_5,
      pm10: p.pm10,
      temp: weather?.current.temperature ?? null,
      humidity: weather?.current.humidity ?? null,
      lastUpdated: lastUpdated ? new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
      isDemo: false,
    }));
  }, [preferences.dataMode, gridPoints, location, weather, lastUpdated]);

  return (
    <EnvironmentDataContext.Provider
      value={{ weather, airQuality, alerts, stations, status, errorMessage, isRefreshing, lastUpdated, refresh }}
    >
      {children}
    </EnvironmentDataContext.Provider>
  );
};

export function useEnvironmentData(): EnvironmentDataContextValue {
  const ctx = useContext(EnvironmentDataContext);
  if (!ctx) throw new Error('useEnvironmentData must be used within an EnvironmentDataProvider');
  return ctx;
}
