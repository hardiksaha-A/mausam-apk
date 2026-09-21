import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { geocodingService } from '../services/geocodingService';
import { DEMO_LOCATION } from '../data/demoData';
import { getCurrentPositionCompat, geolocationSupported } from '../native/geo';
import { isNativeApp } from '../utils/platform';
import type { GeoLocation, SavedLocation, SavedLocationLabel } from '../types';

const STORAGE_KEY = 'mausam:location';
const FOLLOW_KEY = 'mausam:follow-location';

/** Follow the device location automatically: on by default in the installed app, opt-in on the web. */
function loadFollow(): boolean {
  try {
    const v = localStorage.getItem(FOLLOW_KEY);
    if (v === 'true') return true;
    if (v === 'false') return false;
  } catch {
    // ignore
  }
  return isNativeApp();
}
const RECENTS_KEY = 'mausam:recent-locations';
const SAVED_KEY = 'mausam:saved-locations';
const MAX_RECENTS = 5;
export const MAX_SAVED = 8;

export type GeoPermissionState = 'idle' | 'locating' | 'denied' | 'unavailable' | 'unsupported' | 'timeout' | 'error';

interface LocationContextValue {
  location: GeoLocation;
  recentLocations: GeoLocation[];
  isUsingMyLocation: boolean;
  geoState: GeoPermissionState;
  setLocation: (loc: GeoLocation) => void;
  useMyLocation: (opts?: { silent?: boolean }) => void;
  followMyLocation: boolean;
  clearRecents: () => void;
  savedLocations: SavedLocation[];
  saveLocation: (loc: GeoLocation, label: SavedLocationLabel, customLabel?: string) => void;
  removeSavedLocation: (id: string) => void;
  isLocationSaved: (loc: GeoLocation) => boolean;
}

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

function loadStoredLocation(): GeoLocation {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as GeoLocation;
  } catch {
    // ignore malformed storage
  }
  return DEMO_LOCATION;
}

function loadRecents(): GeoLocation[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (raw) return JSON.parse(raw) as GeoLocation[];
  } catch {
    // ignore
  }
  return [];
}

function loadSaved(): SavedLocation[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (raw) return JSON.parse(raw) as SavedLocation[];
  } catch {
    // ignore
  }
  return [];
}

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocationState] = useState<GeoLocation>(loadStoredLocation);
  const [recentLocations, setRecentLocations] = useState<GeoLocation[]>(loadRecents);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>(loadSaved);
  const [isUsingMyLocation, setIsUsingMyLocation] = useState(false);
  const [geoState, setGeoState] = useState<GeoPermissionState>('idle');
  const [followMyLocation, setFollowMyLocation] = useState<boolean>(loadFollow);

  useEffect(() => {
    try {
      localStorage.setItem(FOLLOW_KEY, String(followMyLocation));
    } catch {
      // ignore
    }
  }, [followMyLocation]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  }, [location]);

  useEffect(() => {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(recentLocations));
  }, [recentLocations]);

  useEffect(() => {
    localStorage.setItem(SAVED_KEY, JSON.stringify(savedLocations));
  }, [savedLocations]);

  const setLocation = useCallback((loc: GeoLocation) => {
    setFollowMyLocation(false); // the user picked a place — stop auto-following the device
    setIsUsingMyLocation(false);
    setLocationState(loc);
    setRecentLocations((prev) => {
      const withoutDup = prev.filter(
        (l) => !(l.latitude === loc.latitude && l.longitude === loc.longitude)
      );
      return [loc, ...withoutDup].slice(0, MAX_RECENTS);
    });
  }, []);

  const useMyLocation = useCallback((opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true; // silent = automatic attempt at launch: never nag with error toasts
    if (!geolocationSupported()) {
      if (!silent) setGeoState('unsupported');
      return;
    }
    setGeoState('locating');
    getCurrentPositionCompat(
      async (pos) => {
        try {
          const loc = await geocodingService.reverse(pos.coords.latitude, pos.coords.longitude);
          setIsUsingMyLocation(true);
          setFollowMyLocation(true);
          setLocationState(loc);
          setGeoState('idle');
        } catch {
          // Reverse geocoding failed but we still have raw coordinates — use them.
          const fallback: GeoLocation = {
            city: 'Current Location',
            country: '',
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            displayName: `${pos.coords.latitude.toFixed(4)}°, ${pos.coords.longitude.toFixed(4)}°`,
          };
          setIsUsingMyLocation(true);
          setFollowMyLocation(true);
          setLocationState(fallback);
          setGeoState(silent ? 'idle' : 'error');
        }
      },
      (err) => {
        if (silent) {
          setGeoState('idle');
          if (err.code === err.PERMISSION_DENIED) setFollowMyLocation(false); // don't re-prompt every launch
          return;
        }
        if (err.code === err.PERMISSION_DENIED) setGeoState('denied');
        else if (err.code === err.TIMEOUT) setGeoState('timeout');
        else setGeoState('unavailable');
      }
    );
  }, []);

  const clearRecents = useCallback(() => setRecentLocations([]), []);

  const isLocationSaved = useCallback(
    (loc: GeoLocation) =>
      savedLocations.some((s) => s.latitude === loc.latitude && s.longitude === loc.longitude),
    [savedLocations]
  );

  const saveLocation = useCallback((loc: GeoLocation, label: SavedLocationLabel, customLabel?: string) => {
    setSavedLocations((prev) => {
      const withoutDup = prev.filter(
        (s) => !(s.latitude === loc.latitude && s.longitude === loc.longitude)
      );
      const entry: SavedLocation = {
        ...loc,
        id: `${loc.latitude}-${loc.longitude}-${Date.now()}`,
        label,
        customLabel,
        savedAt: Date.now(),
      };
      return [...withoutDup, entry].slice(0, MAX_SAVED);
    });
  }, []);

  const removeSavedLocation = useCallback((id: string) => {
    setSavedLocations((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return (
    <LocationContext.Provider
      value={{
        location,
        recentLocations,
        isUsingMyLocation,
        followMyLocation,
        geoState,
        setLocation,
        useMyLocation,
        clearRecents,
        savedLocations,
        saveLocation,
        removeSavedLocation,
        isLocationSaved,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

// Named `useAppLocation` (not `useLocation`) to avoid clashing with
// react-router-dom's own `useLocation` hook (URL location) when both
// are imported in the same file.
export function useAppLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useAppLocation must be used within a LocationProvider');
  return ctx;
}
