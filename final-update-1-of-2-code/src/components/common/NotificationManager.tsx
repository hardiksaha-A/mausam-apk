import { useEffect, useRef, useState } from 'react';
import { useEnvironmentData } from '../../context/EnvironmentDataContext';
import { usePreferences } from '../../context/PreferencesContext';
import { useAppLocation } from '../../context/LocationContext';
import { useLanguage } from '../../context/LanguageContext';
import { cancelDailySummaries, getPermission, notifyNow, scheduleDailySummaries, type PermissionState } from '../../native/notifications';
import { aqiCat, cond, severity, tr } from '../../i18n/dynamic';
import { formatTemp } from '../../utils/units';
import type { AlertCategory, NotificationPrefs } from '../../types';

const SEEN_KEY = 'mausam:notified-alerts';
const COOLDOWN_MS = 6 * 60 * 60 * 1000; // don't repeat the same alert more than every 6 hours
const SUMMARY_HOUR = 7;
const SUMMARY_MINUTE = 30;

const PREF_FOR_CATEGORY: Record<AlertCategory, keyof NotificationPrefs> = {
  'Air Quality': 'severeAqi',
  Pollution: 'pollutionSpikes',
  Weather: 'weatherAlerts',
  Visibility: 'weatherAlerts',
};

function loadSeen(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}');
  } catch {
    return {};
  }
}

/**
 * Renders nothing. Watches real, freshly-fetched data and:
 *  1. raises a notification when a NEW alert appears (respecting the Profile toggles), and
 *  2. keeps the next 7 morning summaries scheduled from the real 7-day forecast.
 */
export const NotificationManager: React.FC = () => {
  const { alerts, weather, airQuality } = useEnvironmentData();
  const { preferences } = usePreferences();
  const { location } = useAppLocation();
  const { language } = useLanguage();
  const [permission, setPermission] = useState<PermissionState>('prompt');
  const lastSummaryKey = useRef('');

  // Re-check permission whenever the user changes a toggle (they may have just granted it).
  useEffect(() => {
    getPermission().then(setPermission);
  }, [preferences.notifications]);

  // 1) New alerts
  useEffect(() => {
    if (permission !== 'granted' || !weather) return;
    const seen = loadSeen();
    const now = Date.now();
    let changed = false;
    for (const a of alerts) {
      if (a.status !== 'Active') continue;
      if (!preferences.notifications[PREF_FOR_CATEGORY[a.category]]) continue;
      if (seen[a.id] && now - seen[a.id] < COOLDOWN_MS) continue;
      seen[a.id] = now;
      changed = true;
      void notifyNow(`${severity(a.severity)} · ${a.type}`, `${location.city}: ${a.description} ${a.action}`, 'alerts', a.id);
    }
    if (changed) {
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
      } catch {
        // ignore
      }
    }
  }, [alerts, weather, permission, preferences.notifications, location.city]);

  // 2) Daily morning summaries (installed app only — needs OS scheduling)
  useEffect(() => {
    if (!weather) return;
    if (permission !== 'granted' || !preferences.notifications.dailySummary) {
      if (lastSummaryKey.current !== 'off') {
        lastSummaryKey.current = 'off';
        void cancelDailySummaries();
      }
      return;
    }
    const key = [location.latitude, location.longitude, language, preferences.units, weather.daily[0]?.date, weather.daily[0]?.max].join('|');
    if (key === lastSummaryKey.current) return;
    lastSummaryKey.current = key;

    const aqiNow = airQuality?.current.aqi;
    const items = weather.daily.slice(0, 7).map((d, i) => {
      const at = new Date(`${d.date}T00:00:00`);
      at.setHours(SUMMARY_HOUR, SUMMARY_MINUTE, 0, 0);
      const parts = [
        `${cond(d.condition)}, ${formatTemp(d.min, preferences.units)}–${formatTemp(d.max, preferences.units)}`,
        tr(`rain ${Math.round(d.precipitationProbability)}%`, `बारिश ${Math.round(d.precipitationProbability)}%`),
      ];
      if (i === 0 && aqiNow != null) parts.push(`AQI ${Math.round(aqiNow)} (${aqiCat(airQuality!.current.aqiCategory)})`);
      return { at, title: tr(`Mausam · ${location.city}`, `मौसम · ${location.city}`), body: parts.join(' · ') };
    });
    void scheduleDailySummaries(items);
  }, [weather, airQuality, permission, preferences.notifications.dailySummary, preferences.units, language, location.city, location.latitude, location.longitude]);

  return null;
};
