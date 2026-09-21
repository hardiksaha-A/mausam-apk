import { tr } from '../../i18n/dynamic';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Check, Clock, Crosshair, GraduationCap, Home, Loader2, MapPin, Plane, Trash2 } from 'lucide-react';
import { MAX_SAVED, useAppLocation } from '../../context/LocationContext';
import { usePreferences } from '../../context/PreferencesContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useSavedLocationsWeather } from '../../hooks/useSavedLocationsWeather';
import { useTravelDestination } from '../../hooks/useTravelDestination';
import { LocationSearch } from '../../components/layout/LocationSearch';
import { WeatherIcon } from '../../components/weather/WeatherIcon';
import { GlassCard } from '../../components/mobile/ui';
import { formatTemp } from '../../utils/units';
import type { SavedLocation, SavedLocationLabel } from '../../types';

const LABEL_ICON: Record<SavedLocationLabel, React.ElementType> = { Home, Work: Briefcase, College: GraduationCap, Custom: MapPin };

const LocationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { location, savedLocations, recentLocations, setLocation, saveLocation, removeSavedLocation, isLocationSaved, useMyLocation: locateMe, geoState, followMyLocation } = useAppLocation();
  const { preferences } = usePreferences();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { data } = useSavedLocationsWeather(savedLocations);
  const { destination, setDestinationId } = useTravelDestination(savedLocations);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');

  const saved = isLocationSaved(location);
  const locating = geoState === 'locating';

  const save = (label: SavedLocationLabel, custom?: string) => {
    if (savedLocations.length >= MAX_SAVED && !saved) {
      showToast(t('m.locations.full'), 'error');
      return;
    }
    saveLocation(location, label, custom ?? (label === 'Custom' ? location.city : undefined));
    showToast(`${location.city} ${t('m.locations.saved')}`, 'success');
    setCustomOpen(false);
    setCustomName('');
  };

  const nameOf = (s: SavedLocation) =>
    s.label === 'Custom' ? s.customLabel || s.city : s.label === 'Home' ? t('m.locations.home') : s.label === 'Work' ? t('m.locations.work') : t('m.locations.college');

  const chip = 'h-11 px-4 rounded-full border border-[var(--color-panel-border)] bg-[var(--color-panel)] text-[15px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-2 active:bg-[var(--color-panel-hover)]';

  return (
    <div className="space-y-4">
      <h1 className="text-[26px] font-bold text-[var(--color-text-primary)]">{t('m.locations.title')}</h1>

      <GlassCard>
        <LocationSearch instanceId="locations-page" />
        <button onClick={() => locateMe()} disabled={locating} className="mt-3 w-full h-12 rounded-2xl bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99]">
          {locating ? <Loader2 size={18} className="animate-spin" /> : <Crosshair size={18} />} {t('m.locations.useMine')}
        </button>
        {followMyLocation && geoState !== 'denied' && (
          <p className="mt-2 text-xs text-[var(--color-text-muted)] leading-snug">
            {tr('Following your location automatically — pick another place to stop.', 'आपके स्थान का अपने आप अनुसरण हो रहा है — रोकने के लिए कोई दूसरा स्थान चुनें।')}
          </p>
        )}
        {(geoState === 'denied' || geoState === 'unavailable' || geoState === 'timeout' || geoState === 'error' || geoState === 'unsupported') && (
          <p className="mt-2 text-sm text-[var(--color-warning)] leading-snug">
            {geoState === 'denied' ? tr('Location permission is off. Enable it in Android Settings → Apps → Mausam → Permissions, or search for a place above.', 'लोकेशन की अनुमति बंद है। Android सेटिंग्स → ऐप्स → Mausam → अनुमतियाँ में चालू करें, या ऊपर किसी स्थान को खोजें।') : tr('Could not get your location. Turn on Location (GPS) in your phone settings and try again, or search for a place above.', 'आपका स्थान नहीं मिल सका। फ़ोन की सेटिंग में लोकेशन (GPS) चालू करके फिर कोशिश करें, या ऊपर किसी स्थान को खोजें।')}
          </p>
        )}
      </GlassCard>

      <GlassCard tint="blue">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{t('m.locations.current')}</p>
        <p className="text-xl font-bold text-[var(--color-text-primary)] mt-1 flex items-center gap-2"><MapPin size={20} className="text-[var(--color-brand)]" />{location.displayName}</p>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{location.latitude.toFixed(3)}°, {location.longitude.toFixed(3)}°</p>
        {saved ? (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-accent)] capitalize"><Check size={16} /> {t('m.locations.saved')}</p>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-[var(--color-text-secondary)] mb-2">{t('m.locations.saveAs')}</p>
            <div className="flex flex-wrap gap-2">
              <button className={chip} onClick={() => save('Home')}><Home size={16} /> {t('m.locations.home')}</button>
              <button className={chip} onClick={() => save('Work')}><Briefcase size={16} /> {t('m.locations.work')}</button>
              <button className={chip} onClick={() => save('College')}><GraduationCap size={16} /> {t('m.locations.college')}</button>
              <button className={chip} onClick={() => setCustomOpen((v) => !v)}><MapPin size={16} /> {t('m.locations.custom')}</button>
            </div>
            {customOpen && (
              <div className="mt-3 flex gap-2">
                <input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={t('m.locations.customPrompt')}
                  maxLength={24}
                  className="flex-1 min-w-0 h-12 rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 text-base text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]"
                />
                <button onClick={() => save('Custom', customName.trim() || location.city)} className="h-12 px-5 rounded-2xl bg-[var(--color-brand)] text-white font-semibold">OK</button>
              </div>
            )}
          </div>
        )}
      </GlassCard>

      <section>
        <div className="flex items-baseline justify-between mb-2 px-1">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{t('m.card.saved')}</h2>
          <span className="text-sm text-[var(--color-text-muted)]">{savedLocations.length}/{MAX_SAVED}</span>
        </div>
        {savedLocations.length === 0 ? (
          <GlassCard><p className="text-[15px] text-[var(--color-text-secondary)] leading-relaxed">{t('m.locations.empty')}</p></GlassCard>
        ) : (
          <ul className="space-y-2.5">
            {savedLocations.map((s) => {
              const Icon = LABEL_ICON[s.label];
              const w = data[s.id];
              const here = s.latitude === location.latitude && s.longitude === location.longitude;
              return (
                <li key={s.id} className={`rounded-3xl border bg-[var(--color-panel)] ${here ? 'border-[var(--color-brand)]' : 'border-[var(--color-panel-border)]'}`}>
                  <button onClick={() => { setLocation(s); navigate('/'); }} className="w-full flex items-center gap-3 p-3.5 text-left">
                    <span className="grid place-items-center size-11 rounded-full bg-[var(--color-brand)]/12 text-[var(--color-brand)] shrink-0"><Icon size={20} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-semibold text-[var(--color-text-primary)] truncate">{nameOf(s)}</span>
                      <span className="block text-sm text-[var(--color-text-muted)] truncate">{s.city}{s.state ? `, ${s.state}` : ''}</span>
                    </span>
                    {w ? (
                      <span className="flex items-center gap-2 shrink-0">
                        <WeatherIcon code={w.weatherCode} isDay={w.isDay} size={26} className="text-[var(--color-brand)]" />
                        <span className="text-xl font-bold text-[var(--color-text-primary)]">{formatTemp(w.temperature, preferences.units).replace(/[CF]$/, '')}</span>
                      </span>
                    ) : (
                      <span className="text-[var(--color-text-muted)]">{t('m.locations.dash')}</span>
                    )}
                  </button>
                  <div className="flex border-t border-[var(--color-panel-border)]">
                    <button
                      onClick={() => { setDestinationId(s.id); showToast(`${t('m.locations.travelSet')}: ${s.city}`, 'success'); }}
                      className={`flex-1 h-12 inline-flex items-center justify-center gap-2 text-sm font-semibold ${destination?.id === s.id ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-secondary)]'}`}
                    >
                      <Plane size={16} /> {destination?.id === s.id ? t('m.locations.travelSet') : t('m.locations.travelDest')}
                    </button>
                    <button onClick={() => removeSavedLocation(s.id)} aria-label={`${t('m.locations.remove')} ${nameOf(s)}`} className="w-14 h-12 grid place-items-center text-[var(--color-critical)] border-l border-[var(--color-panel-border)]">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {recentLocations.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-2 px-1">{t('m.locations.recent')}</h2>
          <div className="flex flex-wrap gap-2">
            {recentLocations.map((r) => (
              <button key={`${r.latitude},${r.longitude}`} className={chip} onClick={() => { setLocation(r); navigate('/'); }}>
                <Clock size={15} className="text-[var(--color-text-muted)]" /> {r.city}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default LocationsPage;
