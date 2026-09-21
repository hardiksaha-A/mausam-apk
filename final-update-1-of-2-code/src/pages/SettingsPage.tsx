import { tr } from '../i18n/dynamic';
import React, { useState } from 'react';
import {
  MapPin, Ruler, Database, Bell, Palette, Activity, Info, CheckCircle2, XCircle, Loader2, Trash2, Sun, Moon, Monitor,
  User, X, Clock,
} from 'lucide-react';
import { useAppLocation } from '../context/LocationContext';
import { usePreferences } from '../context/PreferencesContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { weatherService } from '../services/weatherService';
import { airQualityService } from '../services/airQualityService';
import { geocodingService } from '../services/geocodingService';
import { predictionService } from '../services/predictionService';
import { Card, CardHeader } from '../components/common/Card';
import { ALERT_THRESHOLDS } from '../services/alertService';
import type { NotificationPrefs } from '../types';

type ProviderKey = 'weather' | 'airQuality' | 'geocoding' | 'prediction';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);
function formatHourLabel(h: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:00 ${period}`;
}

interface ProviderTestState {
  status: 'idle' | 'testing' | 'ok' | 'fail';
  message?: string;
  lastSuccess?: number;
}

const SettingsPage: React.FC = () => {
  const { location, recentLocations, clearRecents, savedLocations, removeSavedLocation } = useAppLocation();
  const { preferences, setUnits, setDataMode, setNotificationPref, setProfile, setCommuteWindows } = usePreferences();
  const { themePreference, theme, setThemePreference } = useTheme();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [name, setName] = useState(preferences.profile.name);
  const [age, setAge] = useState(preferences.profile.age?.toString() ?? '');
  const [profession, setProfession] = useState(preferences.profile.profession);

  const [providerTests, setProviderTests] = useState<Record<ProviderKey, ProviderTestState>>({
    weather: { status: 'idle' },
    airQuality: { status: 'idle' },
    geocoding: { status: 'idle' },
    prediction: { status: 'ok', message: tr('Prototype heuristic — always available, never fails.', 'प्रोटोटाइप अनुमान — हमेशा उपलब्ध, कभी विफल नहीं।') },
  });

  const testProvider = async (key: ProviderKey) => {
    setProviderTests((prev) => ({ ...prev, [key]: { status: 'testing' } }));
    try {
      if (key === 'weather') await weatherService.getForecast(location.latitude, location.longitude);
      if (key === 'airQuality') await airQualityService.getAirQuality(location.latitude, location.longitude);
      if (key === 'geocoding') await geocodingService.search('London');
      setProviderTests((prev) => ({ ...prev, [key]: { status: 'ok', lastSuccess: Date.now() } }));
      showToast(`${key} connection OK`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : tr('Connection failed', 'कनेक्शन विफल');
      setProviderTests((prev) => ({ ...prev, [key]: { status: 'fail', message } }));
      showToast(`${key} connection failed`, 'error');
    }
  };

  const providers: { key: ProviderKey; name: string; kind: string; requiresKey: boolean; note: string }[] = [
    { key: 'weather', name: 'Open-Meteo Forecast API', kind: tr('Weather','मौसम'), requiresKey: false, note: tr('Free, keyless, CORS-enabled.', 'मुफ़्त, बिना कुंजी, CORS-सक्षम।') },
    { key: 'airQuality', name: 'Open-Meteo Air Quality API', kind: tr('Air Quality','वायु गुणवत्ता'), requiresKey: false, note: tr('Free, keyless, CAMS atmospheric model.', 'मुफ़्त, बिना कुंजी, CAMS वायुमंडलीय मॉडल।') },
    { key: 'geocoding', name: 'Open-Meteo Geocoding + BigDataCloud', kind: tr('Geocoding','स्थान खोज'), requiresKey: false, note: tr('Forward search + reverse lookup, both keyless.', 'नाम से खोज + निर्देशांक से स्थान, दोनों बिना कुंजी।') },
    { key: 'prediction', name: 'MockPredictionService (prototype)', kind: tr('Prediction','पूर्वानुमान'), requiresKey: false, note: tr('No ML backend yet — see AI Predictions page.', 'अभी कोई ML बैकएंड नहीं — AI पूर्वानुमान पेज देखें।') },
  ];

  const notificationLabels: { key: keyof NotificationPrefs; label: string }[] = [
    { key: 'severeAqi', label: tr('Severe AQI alerts', 'गंभीर AQI चेतावनियाँ') },
    { key: 'weatherAlerts', label: tr('Weather alerts', 'मौसम चेतावनियाँ') },
    { key: 'pollutionSpikes', label: tr('Pollution spikes', 'प्रदूषण में उछाल') },
    { key: 'dailySummary', label: tr('Daily summary', 'दैनिक सारांश') },
  ];

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-lg font-bold text-[var(--color-text-primary)]">{t('settings.title')}</h1>

      {/* Your Profile */}
      <Card>
        <CardHeader title={t('settings.profileTitle')} icon={User} subtitle={t('settings.profileSubtitle')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">{t('onboarding.nameLabel')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('onboarding.namePlaceholder')}
              className="w-full rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">{t('onboarding.ageLabel')}</label>
            <input
              type="number"
              min={1}
              max={120}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder={tr('Your age', 'आपकी आयु')}
              className="w-full rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]/50"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">{t('onboarding.professionLabel')}</label>
            <input
              type="text"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              placeholder={tr('e.g. Farmer, Student, Teacher', 'जैसे: किसान, छात्र, शिक्षक')}
              className="w-full rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]/50"
            />
          </div>
        </div>
        <button
          onClick={() => {
            setProfile({ name: name.trim(), age: age ? Number(age) : null, profession: profession.trim() });
            showToast(t('settings.profileSaved'), 'success');
          }}
          className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity"
        >
          {t('settings.saveProfile')}
        </button>
      </Card>

      {/* General / Location */}
      <Card>
        <CardHeader title={t('settings.locationTitle')} icon={MapPin} />
        <div className="flex items-center justify-between rounded-lg border border-[var(--color-panel-border)] p-3 mb-3">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{location.displayName}</p>
            <p className="text-sm text-[var(--color-text-muted)]">{location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°</p>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">{tr('Saved places', 'सहेजे गए स्थान')}</p>
          {savedLocations.length > 0 ? (
            <ul className="space-y-1.5">
              {savedLocations.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-lg border border-[var(--color-panel-border)] px-3 py-2">
                  <span className="text-sm text-[var(--color-text-primary)]">
                    <span className="font-medium">{s.label === 'Custom' ? s.customLabel || s.city : s.label}</span>
                    <span className="text-[var(--color-text-muted)]"> — {s.city}</span>
                  </span>
                  <button
                    onClick={() => { removeSavedLocation(s.id); showToast(`${s.city} removed`, 'info'); }}
                    aria-label={tr(`Remove ${s.label}`, `${s.label} हटाएँ`)}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-critical)] transition-colors"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)] rounded-lg border border-dashed border-[var(--color-panel-border)] px-3 py-3">
              {tr('No saved places yet — tap the bookmark icon next to your location on the Dashboard to save one (Home, Work, etc).', 'अभी कोई स्थान सहेजा नहीं — किसी स्थान को सहेजने के लिए डैशबोर्ड पर अपने स्थान के पास बुकमार्क आइकन दबाएँ (घर, कार्यस्थल आदि)।')}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--color-text-muted)]">{recentLocations.length} {recentLocations.length === 1 ? t('settings.recentLocation') : t('settings.recentLocations')}</p>
          <button
            onClick={() => { clearRecents(); showToast(t('settings.recentsCleared'), 'info'); }}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-critical)] hover:underline"
          >
            <Trash2 size={12} /> {t('settings.clearRecents')}
          </button>
        </div>
      </Card>

      {/* Units */}
      <Card>
        <CardHeader title={t('settings.unitsTitle')} icon={Ruler} />
        <div className="flex gap-2">
          {(['metric', 'imperial'] as const).map((u) => (
            <button
              key={u}
              onClick={() => setUnits(u)}
              className={`flex-1 rounded-lg border py-2.5 text-sm font-medium capitalize transition-colors ${
                preferences.units === u
                  ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/12 text-[var(--color-accent)]'
                  : 'border-[var(--color-panel-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-panel-hover)]'
              }`}
            >
              {u === 'metric' ? tr('Metric (°C, km/h)', 'मेट्रिक (°C, किमी/घं)') : tr('Imperial (°F, mph)', 'इंपीरियल (°F, मील/घं)')}
            </button>
          ))}
        </div>
      </Card>

      {/* Data mode */}
      <Card>
        <CardHeader title={t('settings.dataModeTitle')} icon={Database} />
        <div className="flex gap-2 mb-2">
          {(['live', 'demo'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setDataMode(m); showToast(`Switched to ${m === 'live' ? 'Live Data' : 'Demo Data'} mode`, 'info'); }}
              className={`flex-1 rounded-lg border py-2.5 text-sm font-medium capitalize transition-colors ${
                preferences.dataMode === m
                  ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/12 text-[var(--color-accent)]'
                  : 'border-[var(--color-panel-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-panel-hover)]'
              }`}
            >
              {m === 'live' ? 'Live Data' : 'Demo Data'}
            </button>
          ))}
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          {tr('Demo Mode uses a fixed, clearly-labeled sample dataset — never mixed with live provider responses.', 'डेमो मोड एक तय, साफ़-साफ़ लेबल किया नमूना डेटा इस्तेमाल करता है — यह कभी लाइव प्रदाता के जवाबों में नहीं मिलाया जाता।')}
        </p>
      </Card>

      {/* Data sources */}
      <Card>
        <CardHeader title={t('settings.dataSourcesTitle')} icon={Activity} />
        <div className="space-y-3">
          {providers.map((p) => {
            const test = providerTests[p.key];
            return (
              <div key={p.key} className="rounded-lg border border-[var(--color-panel-border)] p-3">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{p.name}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">{p.kind} · {p.note}</p>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      p.requiresKey ? 'text-[var(--color-warning)] bg-[var(--color-warning)]/10' : 'text-[var(--color-accent)] bg-[var(--color-accent)]/10'
                    }`}
                  >
                    {p.requiresKey ? tr('Requires Key', 'कुंजी ज़रूरी') : tr('Configured', 'कॉन्फ़िगर किया हुआ')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm">
                    {test.status === 'ok' && <><CheckCircle2 size={13} className="text-[var(--color-accent)]" /> <span className="text-[var(--color-text-secondary)]">{tr('Connected', 'जुड़ा हुआ')}{test.lastSuccess ? ` · ${new Date(test.lastSuccess).toLocaleTimeString()}` : ''}</span></>}
                    {test.status === 'fail' && <><XCircle size={13} className="text-[var(--color-critical)]" /> <span className="text-[var(--color-critical)]">{test.message}</span></>}
                    {test.status === 'idle' && <span className="text-[var(--color-text-muted)]">{tr('Not tested yet', 'अभी जाँचा नहीं गया')}</span>}
                    {test.status === 'testing' && <><Loader2 size={13} className="animate-spin text-[var(--color-text-muted)]" /> <span className="text-[var(--color-text-muted)]">{tr('Testing…', 'जाँच हो रही है…')}</span></>}
                  </div>
                  <button
                    onClick={() => testProvider(p.key)}
                    disabled={test.status === 'testing'}
                    className="text-sm font-medium text-[var(--color-accent-teal)] hover:underline disabled:opacity-50"
                  >
                    {tr('Test Connection', 'कनेक्शन जाँचें')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Alert thresholds (read-only, documented) */}
      <Card>
        <CardHeader title={t('settings.alertThresholdsTitle')} icon={Bell} subtitle={t('settings.alertThresholdsSubtitle')} />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg border border-[var(--color-panel-border)] p-2.5"><p className="text-[var(--color-text-muted)]">{tr('AQI High', 'AQI ऊँचा')}</p><p className="font-semibold text-[var(--color-text-primary)]">{ALERT_THRESHOLDS.aqiHigh}</p></div>
          <div className="rounded-lg border border-[var(--color-panel-border)] p-2.5"><p className="text-[var(--color-text-muted)]">{tr('AQI Critical', 'AQI गंभीर')}</p><p className="font-semibold text-[var(--color-text-primary)]">{ALERT_THRESHOLDS.aqiCritical}</p></div>
          <div className="rounded-lg border border-[var(--color-panel-border)] p-2.5"><p className="text-[var(--color-text-muted)]">{tr('PM2.5 Spike', 'PM2.5 उछाल')}</p><p className="font-semibold text-[var(--color-text-primary)]">{ALERT_THRESHOLDS.pm25Spike} µg/m³</p></div>
          <div className="rounded-lg border border-[var(--color-panel-border)] p-2.5"><p className="text-[var(--color-text-muted)]">{tr('Extreme Heat', 'भीषण गर्मी')}</p><p className="font-semibold text-[var(--color-text-primary)]">{ALERT_THRESHOLDS.extremeHeatC}°C</p></div>
          <div className="rounded-lg border border-[var(--color-panel-border)] p-2.5"><p className="text-[var(--color-text-muted)]">{tr('Heavy Rain', 'भारी बारिश')}</p><p className="font-semibold text-[var(--color-text-primary)]">{ALERT_THRESHOLDS.heavyRainProbability}%</p></div>
          <div className="rounded-lg border border-[var(--color-panel-border)] p-2.5"><p className="text-[var(--color-text-muted)]">{tr('Strong Wind', 'तेज़ हवा')}</p><p className="font-semibold text-[var(--color-text-primary)]">{ALERT_THRESHOLDS.strongWindKph} km/h</p></div>
        </div>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader title={t('settings.notificationsTitle')} icon={Bell} subtitle={t('settings.notificationsSubtitle')} />
        <div className="space-y-2.5">
          {notificationLabels.map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between rounded-lg border border-[var(--color-panel-border)] p-3 cursor-pointer">
              <span className="text-sm text-[var(--color-text-primary)]">{label}</span>
              <input
                type="checkbox"
                checked={preferences.notifications[key]}
                onChange={(e) => { setNotificationPref(key, e.target.checked); showToast(`${label} ${e.target.checked ? 'enabled' : 'disabled'}`, 'info'); }}
                className="size-4 accent-[var(--color-accent)]"
              />
            </label>
          ))}
        </div>
        <p className="text-sm text-[var(--color-text-muted)] mt-2">{t('settings.notificationsNotWired')}</p>
      </Card>

      {/* Family commute windows */}
      <Card>
        <CardHeader title={t('settings.commuteTitle')} icon={Clock} subtitle={t('settings.commuteSubtitle')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">{t('settings.morningCommute')}</p>
            <div className="flex items-center gap-2">
              <select
                value={preferences.commuteWindows.morningStart}
                onChange={(e) => setCommuteWindows({ ...preferences.commuteWindows, morningStart: Number(e.target.value) })}
                className="flex-1 rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
              >
                {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{formatHourLabel(h)}</option>)}
              </select>
              <span className="text-sm text-[var(--color-text-muted)]">{t('settings.to')}</span>
              <select
                value={preferences.commuteWindows.morningEnd}
                onChange={(e) => setCommuteWindows({ ...preferences.commuteWindows, morningEnd: Number(e.target.value) })}
                className="flex-1 rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
              >
                {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{formatHourLabel(h)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">{t('settings.eveningCommute')}</p>
            <div className="flex items-center gap-2">
              <select
                value={preferences.commuteWindows.eveningStart}
                onChange={(e) => setCommuteWindows({ ...preferences.commuteWindows, eveningStart: Number(e.target.value) })}
                className="flex-1 rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
              >
                {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{formatHourLabel(h)}</option>)}
              </select>
              <span className="text-sm text-[var(--color-text-muted)]">{t('settings.to')}</span>
              <select
                value={preferences.commuteWindows.eveningEnd}
                onChange={(e) => setCommuteWindows({ ...preferences.commuteWindows, eveningEnd: Number(e.target.value) })}
                className="flex-1 rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
              >
                {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{formatHourLabel(h)}</option>)}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader title={t('settings.appearanceTitle')} icon={Palette} />
        <div className="grid grid-cols-3 gap-2">
          {(['light', 'dark', 'system'] as const).map((option) => {
            const Icon = option === 'light' ? Sun : option === 'dark' ? Moon : Monitor;
            const isActive = themePreference === option;
            return (
              <button
                key={option}
                onClick={() => setThemePreference(option)}
                aria-pressed={isActive}
                className={`flex flex-col items-center gap-1.5 rounded-lg border py-3 text-xs font-medium capitalize transition-colors ${
                  isActive
                    ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                    : 'border-[var(--color-panel-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-panel-hover)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <Icon size={18} />
                {option === 'light' ? tr('light', 'लाइट') : option === 'dark' ? tr('dark', 'डार्क') : tr('system', 'सिस्टम')}
              </button>
            );
          })}
        </div>
        <p className="text-sm text-[var(--color-text-muted)] mt-3">
          {themePreference === 'system'
            ? tr(tr(`Following your device's setting — currently ${theme}.`, `आपके डिवाइस की सेटिंग के अनुसार — अभी ${theme === 'dark' ? 'डार्क' : 'लाइट'}।`), `आपके डिवाइस की सेटिंग के अनुसार — अभी ${theme === 'dark' ? 'डार्क' : 'लाइट'}।`)
            : tr(`Currently locked to ${theme} mode regardless of device setting.`, `डिवाइस की सेटिंग से अलग, अभी ${theme === 'dark' ? 'डार्क' : 'लाइट'} मोड पर तय है।`)}
        </p>
      </Card>

      {/* About / System info */}
      <Card>
        <CardHeader title={t('settings.aboutTitle')} icon={Info} />
        <ul className="text-sm text-[var(--color-text-secondary)] space-y-2 leading-relaxed">
          <li><strong className="text-[var(--color-text-primary)]">{tr('AQI standard:', 'AQI मानक:')}</strong> {tr('US EPA Air Quality Index, as computed by the Open-Meteo Air Quality API.', 'US EPA वायु गुणवत्ता सूचकांक, जैसा Open-Meteo Air Quality API गणना करती है।')}</li>
          <li><strong className="text-[var(--color-text-primary)]">{tr('Update behavior:', 'अपडेट का तरीका:')}</strong> {tr('Data refreshes on location change and manual refresh; there is no background polling yet.', 'स्थान बदलने और हाथ से रीफ़्रेश करने पर डेटा ताज़ा होता है; अभी बैकग्राउंड पोलिंग नहीं है।')}</li>
          <li><strong className="text-[var(--color-text-primary)]">{tr('Prediction status:', 'पूर्वानुमान की स्थिति:')}</strong> {tr(predictionService.modelLabel, 'प्रोटोटाइप अनुमान (कोई प्रशिक्षित ML मॉडल नहीं)')}. {tr('No trained ML model is connected.', 'कोई प्रशिक्षित ML मॉडल जुड़ा नहीं है।')}</li>
          <li><strong className="text-[var(--color-text-primary)]">{tr('Known limitation:', 'ज्ञात सीमा:')}</strong> {tr('Air-quality historical analytics beyond ~92 days are capped by the free provider and labeled Estimated.', 'लगभग 92 दिनों से पुराना वायु-गुणवत्ता इतिहास मुफ़्त प्रदाता सीमित करता है और "अनुमानित" लेबल होता है।')}</li>
          <li><strong className="text-[var(--color-text-primary)]">{tr('Monitoring points:', 'निगरानी बिंदु:')}</strong> {tr('Pollution-map points are live modeled grid values, not physical ground sensors, unless Demo Mode is active.', 'प्रदूषण-मानचित्र के बिंदु लाइव मॉडल ग्रिड मान हैं, ज़मीनी सेंसर नहीं — जब तक डेमो मोड चालू न हो।')}</li>
        </ul>
      </Card>
    </div>
  );
};

export default SettingsPage;
