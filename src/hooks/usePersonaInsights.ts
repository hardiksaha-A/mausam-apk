import { useEffect, useMemo, useState } from 'react';
import { useAppLocation } from '../context/LocationContext';
import { useEnvironmentData } from '../context/EnvironmentDataContext';
import { usePreferences } from '../context/PreferencesContext';
import { marineService, type MarineResult } from '../services/marineService';
import { pollenService, type PollenResult } from '../services/pollenService';
import { getPersonaInsight, type SmartInsight } from '../utils/personaInsights';
import { getGeneralGuide, getPersonaGuide, type GuideItem } from '../utils/personaGuides';
import type { Persona } from '../types';

/**
 * The real per-persona insights for the currently selected personas.
 * Marine and pollen data are only fetched when the matching persona is
 * actually selected (no wasted API calls) — same rule as the desktop
 * dashboard. Pollen honestly reports "unavailable" outside Europe.
 */
export function usePersonaInsights(): {
  insights: SmartInsight[];
  forPersona: (p: Persona) => SmartInsight | null;
  guideFor: (p: Persona | null) => GuideItem[];
} {
  const { location } = useAppLocation();
  const { weather, airQuality } = useEnvironmentData();
  const { preferences } = usePreferences();

  const [marine, setMarine] = useState<MarineResult | null>(null);
  useEffect(() => {
    if (!preferences.personas.includes('marine')) return;
    const c = new AbortController();
    marineService
      .getConditions(location.latitude, location.longitude, c.signal)
      .then(setMarine)
      .catch(() => setMarine(null));
    return () => c.abort();
  }, [preferences.personas, location.latitude, location.longitude]);

  const [pollen, setPollen] = useState<PollenResult | null>(null);
  useEffect(() => {
    if (!preferences.personas.includes('health')) return;
    const c = new AbortController();
    pollenService
      .getPollen(location.latitude, location.longitude, c.signal)
      .then(setPollen)
      .catch(() => setPollen(null));
    return () => c.abort();
  }, [preferences.personas, location.latitude, location.longitude]);

  return useMemo(() => {
    const forPersona = (p: Persona) =>
      getPersonaInsight(p, { weather, airQuality, marine, commuteWindows: preferences.commuteWindows, pollen, latitude: location.latitude });
    const insights = preferences.personas.map(forPersona).filter((x): x is SmartInsight => x !== null);
    const guideFor = (p: Persona | null): GuideItem[] => {
      if (!weather) return [];
      const ctx = { weather, airQuality, marine, pollen, commuteWindows: preferences.commuteWindows, units: preferences.units };
      return p ? getPersonaGuide(p, ctx) : getGeneralGuide(ctx);
    };
    return { insights, forPersona, guideFor };
  }, [preferences.personas, preferences.commuteWindows, preferences.units, weather, airQuality, marine, pollen, location.latitude]);
}
