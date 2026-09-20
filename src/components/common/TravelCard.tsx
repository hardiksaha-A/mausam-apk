import { cond } from '../../i18n/dynamic';
import React, { useEffect, useState } from 'react';
import { Plane, MapPin, ShieldAlert, RefreshCw } from 'lucide-react';
import type { SavedLocation } from '../../types';
import { useDestinationWeather } from '../../hooks/useDestinationWeather';
import { travelInsight } from '../../utils/personaInsights';
import { WeatherIcon } from '../weather/WeatherIcon';
import { formatTemp } from '../../utils/units';
import { usePreferences } from '../../context/PreferencesContext';
import { useLanguage } from '../../context/LanguageContext';

const DESTINATION_STORAGE_KEY = 'mausam:travel-destination';

function savedLocationLabel(s: SavedLocation): string {
  return s.label === 'Custom' ? s.customLabel || s.city : s.label;
}

export const TravelCard: React.FC<{ savedLocations: SavedLocation[] }> = ({ savedLocations }) => {
  const { preferences } = usePreferences();
  const { t, language } = useLanguage();
  const [destinationId, setDestinationId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(DESTINATION_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  // If the previously-picked destination was later removed from Saved
  // Locations, fall back to no selection rather than a dangling reference.
  const destination = savedLocations.find((s) => s.id === destinationId) ?? null;

  useEffect(() => {
    try {
      if (destination) localStorage.setItem(DESTINATION_STORAGE_KEY, destination.id);
      else localStorage.removeItem(DESTINATION_STORAGE_KEY);
    } catch {
      // ignore storage failures — selection just won't survive a restart
    }
  }, [destination]);

  const { weather, alerts, isLoading, errorMessage, lastUpdated } = useDestinationWeather(destination);
  const insight = weather ? travelInsight(weather) : null;
  const today = weather?.daily[0];

  return (
    <div className="relative rounded-xl border border-[var(--color-panel-border)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="grid place-items-center size-8 rounded-lg bg-[var(--color-accent)]/15 text-[var(--color-accent)] shrink-0">
          <Plane size={16} />
        </span>
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t('persona.travel.name')}</p>
      </div>

      {savedLocations.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          {t('dashboard.travelSaveFirst')}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {savedLocations.map((s) => (
              <button
                key={s.id}
                onClick={() => setDestinationId(s.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  destination?.id === s.id
                    ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                    : 'border-[var(--color-panel-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-panel-hover)]'
                }`}
              >
                {savedLocationLabel(s)}
              </button>
            ))}
          </div>

          {!destination && (
            <p className="text-sm text-[var(--color-text-muted)]">{t('dashboard.travelPickDestination')}</p>
          )}

          {destination && isLoading && !weather && (
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] py-2">
              <RefreshCw size={13} className="animate-spin" /> {t('dashboard.travelFetching').replace('{city}', destination.city)}
            </div>
          )}

          {destination && errorMessage && !weather && (
            <p className="text-sm text-[var(--color-critical)]">{t('dashboard.travelFetchError').replace('{city}', destination.city)}</p>
          )}

          {destination && weather && today && (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <WeatherIcon code={weather.current.weatherCode} isDay={weather.current.isDay} size={28} className="text-[var(--color-accent-teal)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-1">
                    <MapPin size={11} className="text-[var(--color-text-muted)]" /> {destination.city}
                  </p>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {formatTemp(today.min, preferences.units)}–{formatTemp(today.max, preferences.units)} • {cond(weather.current.condition)}
                  </p>
                </div>
              </div>

              {insight && (
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-2">
                  <span className="font-medium text-[var(--color-text-primary)]">{t('dashboard.travelPack')} </span>
                  {insight.headline}
                </p>
              )}

              {alerts.filter((a) => a.status === 'Active').length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {alerts.filter((a) => a.status === 'Active').slice(0, 2).map((a) => (
                    <div key={a.id} className="flex items-start gap-1.5 text-sm text-[var(--color-warning)]">
                      <ShieldAlert size={13} className="shrink-0 mt-0.5" />
                      <span>{a.type} — {a.description}</span>
                    </div>
                  ))}
                </div>
              )}

              {lastUpdated && (
                <p className="text-xs text-[var(--color-text-muted)] mt-2">
                  {t('dashboard.travelUpdated')} {new Date(lastUpdated).toLocaleTimeString(language === 'hi' ? 'hi-IN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                  {isLoading ? ` • ${t('dashboard.refreshing')}` : ''}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
