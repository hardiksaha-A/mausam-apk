import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AppPreferences, CommuteWindows, DataMode, NotificationPrefs, Persona, UnitSystem, UserProfile } from '../types';

const STORAGE_KEY = 'mausam:preferences';

const DEFAULT_PREFS: AppPreferences = {
  units: 'metric',
  dataMode: 'live',
  notifications: {
    severeAqi: true,
    weatherAlerts: true,
    pollutionSpikes: true,
    dailySummary: false,
  },
  personas: [],
  profile: { name: '', age: null, profession: '' },
  onboardingCompleted: false,
  commuteWindows: { morningStart: 7, morningEnd: 9, eveningStart: 15, eveningEnd: 17 },
};

function loadPrefs(): AppPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppPreferences>;
      return {
        ...DEFAULT_PREFS,
        ...parsed,
        profile: { ...DEFAULT_PREFS.profile, ...parsed.profile },
        commuteWindows: { ...DEFAULT_PREFS.commuteWindows, ...parsed.commuteWindows },
      };
    }
  } catch {
    // ignore malformed storage
  }
  return DEFAULT_PREFS;
}

interface PreferencesContextValue {
  preferences: AppPreferences;
  setUnits: (units: UnitSystem) => void;
  setDataMode: (mode: DataMode) => void;
  setNotificationPref: (key: keyof NotificationPrefs, value: boolean) => void;
  togglePersona: (persona: Persona) => void;
  setPersonas: (personas: Persona[]) => void;
  setProfile: (profile: UserProfile) => void;
  completeOnboarding: (profile: UserProfile, personas: Persona[]) => void;
  setCommuteWindows: (windows: CommuteWindows) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<AppPreferences>(loadPrefs);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const setUnits = useCallback((units: UnitSystem) => {
    setPreferences((prev) => ({ ...prev, units }));
  }, []);

  const setDataMode = useCallback((dataMode: DataMode) => {
    setPreferences((prev) => ({ ...prev, dataMode }));
  }, []);

  const setNotificationPref = useCallback((key: keyof NotificationPrefs, value: boolean) => {
    setPreferences((prev) => ({ ...prev, notifications: { ...prev.notifications, [key]: value } }));
  }, []);

  const togglePersona = useCallback((persona: Persona) => {
    setPreferences((prev) => ({
      ...prev,
      personas: prev.personas.includes(persona)
        ? prev.personas.filter((p) => p !== persona)
        : [...prev.personas, persona],
    }));
  }, []);

  const setPersonas = useCallback((personas: Persona[]) => {
    setPreferences((prev) => ({ ...prev, personas }));
  }, []);

  const setProfile = useCallback((profile: UserProfile) => {
    setPreferences((prev) => ({ ...prev, profile }));
  }, []);

  const completeOnboarding = useCallback((profile: UserProfile, personas: Persona[]) => {
    setPreferences((prev) => ({ ...prev, profile, personas, onboardingCompleted: true }));
  }, []);

  const setCommuteWindows = useCallback((commuteWindows: CommuteWindows) => {
    setPreferences((prev) => ({ ...prev, commuteWindows }));
  }, []);

  return (
    <PreferencesContext.Provider
      value={{
        preferences, setUnits, setDataMode, setNotificationPref, togglePersona, setPersonas,
        setProfile, completeOnboarding, setCommuteWindows,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within a PreferencesProvider');
  return ctx;
}
