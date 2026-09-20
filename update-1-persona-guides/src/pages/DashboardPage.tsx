import React, { useMemo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Droplets, Wind as WindIcon, Gauge, Eye, Sunrise, Sunset, ArrowRight,
  ShieldAlert, Sparkles, Leaf, TrendingUp, TrendingDown, Minus, Cpu, Users2,
  Bookmark, BookmarkCheck, MapPin, X,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useAppLocation, MAX_SAVED } from '../context/LocationContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { useEnvironmentData } from '../context/EnvironmentDataContext';
import { usePreferences } from '../context/PreferencesContext';
import { predictionService } from '../services/predictionService';
import { marineService, type MarineResult } from '../services/marineService';
import { pollenService, type PollenResult } from '../services/pollenService';
import { getPersonaInsight } from '../utils/personaInsights';
import { getPersonaGuide } from '../utils/personaGuides';
import { PersonaGuide } from '../components/common/PersonaGuide';
import { Card, CardHeader } from '../components/common/Card';
import { StatCard } from '../components/common/StatCard';
import { DataStatusBadge } from '../components/common/DataStatusBadge';
import { CardSkeleton, ErrorState } from '../components/common/States';
import { WeatherIcon } from '../components/weather/WeatherIcon';
import { WeatherAnimation } from '../components/weather/WeatherAnimation';
import { AQIGauge } from '../components/aqi/AQIGauge';
import { PersonaSelector } from '../components/common/PersonaSelector';
import { SmartInsightCard } from '../components/common/SmartInsightCard';
import { TravelCard } from '../components/common/TravelCard';
import { InfoHint } from '../components/common/InfoHint';
import { AQI_GUIDANCE } from '../utils/aqi';
import { formatTemp } from '../utils/units';
import type { Persona } from '../types';
import { sortAlertsForPersonas } from '../services/alertService';

type DashboardBlockId = 'kpi' | 'sunTimes' | 'aiInsight' | 'aqiTrendAlerts' | 'forecastActions';

const DEFAULT_BLOCK_ORDER: DashboardBlockId[] = ['kpi', 'sunTimes', 'aiInsight', 'aqiTrendAlerts', 'forecastActions'];

// Which of the 5 independent Dashboard sections matter most for each
// persona, most-relevant first (index 0 = most relevant).
const PERSONA_BLOCK_ORDER: Record<Persona, DashboardBlockId[]> = {
  health: ['aqiTrendAlerts', 'aiInsight', 'kpi', 'sunTimes', 'forecastActions'],
  fitness: ['sunTimes', 'kpi', 'forecastActions', 'aiInsight', 'aqiTrendAlerts'],
  travel: ['forecastActions', 'aqiTrendAlerts', 'kpi', 'sunTimes', 'aiInsight'],
  family: ['aqiTrendAlerts', 'forecastActions', 'kpi', 'sunTimes', 'aiInsight'],
  agriculture: ['forecastActions', 'kpi', 'aqiTrendAlerts', 'sunTimes', 'aiInsight'],
  marine: ['kpi', 'forecastActions', 'aqiTrendAlerts', 'sunTimes', 'aiInsight'],
  commuter: ['aqiTrendAlerts', 'kpi', 'forecastActions', 'sunTimes', 'aiInsight'],
  eventPlanner: ['forecastActions', 'kpi', 'sunTimes', 'aqiTrendAlerts', 'aiInsight'],
};

/**
 * Blends ALL selected personas' block-order preferences, not just the
 * first-selected one — each persona votes on every block's rank, with
 * earlier-selected personas weighted more heavily (1, 1/2, 1/3, ...) so
 * the effect is still predictable (first pick matters most) while later
 * picks genuinely still shift the result, rather than being ignored.
 */
function computeBlendedBlockOrder(personas: Persona[]): DashboardBlockId[] {
  if (personas.length === 0) return DEFAULT_BLOCK_ORDER;

  const scores: Record<DashboardBlockId, number> = {
    kpi: 0, sunTimes: 0, aiInsight: 0, aqiTrendAlerts: 0, forecastActions: 0,
  };

  personas.forEach((persona, personaIndex) => {
    const order = PERSONA_BLOCK_ORDER[persona] ?? DEFAULT_BLOCK_ORDER;
    const weight = 1 / (personaIndex + 1);
    order.forEach((blockId, rank) => {
      scores[blockId] += rank * weight;
    });
  });

  return (Object.keys(scores) as DashboardBlockId[]).sort((a, b) => scores[a] - scores[b]);
}

const DashboardPage: React.FC = () => {
  const { location, setLocation, savedLocations, saveLocation, removeSavedLocation, isLocationSaved } = useAppLocation();
  const { showToast } = useToast();
  const { t, language } = useLanguage();
  const { weather, airQuality, alerts, status, errorMessage, refresh } = useEnvironmentData();
  const { preferences } = usePreferences();

  const isLoading = status === 'LOADING' && !weather;
  const isHardError = status === 'ERROR' && !weather;
  const activeAlerts = sortAlertsForPersonas(alerts.filter((a) => a.status === 'Active'), preferences.personas);

  const chartData = airQuality?.hourly.slice(0, 24).map((h) => ({
    time: new Date(h.time).toLocaleTimeString([], { hour: 'numeric' }),
    aqi: h.aqi,
  })) ?? [];

  const predictions = useMemo(
    () => (airQuality ? predictionService.predict(airQuality, weather?.current ?? null) : []),
    [airQuality, weather]
  );
  const factors = useMemo(
    () => (airQuality ? predictionService.factors(airQuality, weather?.current ?? null) : []),
    [airQuality, weather]
  );
  const insight = useMemo(() => predictionService.explain(predictions, factors), [predictions, factors]);
  const TrendIcon = insight.trend === 'Increasing' ? TrendingUp : insight.trend === 'Decreasing' ? TrendingDown : Minus;
  const trendColor = insight.trend === 'Increasing' ? 'var(--color-critical)' : insight.trend === 'Decreasing' ? 'var(--color-accent)' : 'var(--color-accent-blue)';

  // Marine data only fetched when Marine mode is actually selected — no
  // point calling a second API for everyone who isn't near a coast.
  const [marine, setMarine] = useState<MarineResult | null>(null);
  useEffect(() => {
    if (!preferences.personas.includes('marine')) return;
    const controller = new AbortController();
    marineService
      .getConditions(location.latitude, location.longitude, controller.signal)
      .then(setMarine)
      .catch(() => setMarine(null));
    return () => controller.abort();
  }, [preferences.personas, location.latitude, location.longitude]);

  // Pollen only fetched when Health mode is selected — same pattern as
  // marine, and honestly reports unavailable outside Europe rather than
  // faking a number (see pollenService.ts).
  const [pollen, setPollen] = useState<PollenResult | null>(null);
  useEffect(() => {
    if (!preferences.personas.includes('health')) return;
    const controller = new AbortController();
    pollenService
      .getPollen(location.latitude, location.longitude, controller.signal)
      .then(setPollen)
      .catch(() => setPollen(null));
    return () => controller.abort();
  }, [preferences.personas, location.latitude, location.longitude]);

  const personaInsights = useMemo(
    () =>
      preferences.personas
        .map((p) => getPersonaInsight(p, { weather, airQuality, marine, commuteWindows: preferences.commuteWindows, pollen, latitude: location.latitude }))
        .filter((x): x is NonNullable<typeof x> => x !== null),
    [preferences.personas, weather, airQuality, marine, pollen, location.latitude]
  );

  // True personalization: the rest of the dashboard's independent sections
  // actually reorder based on your top (first-selected) interest, not just
  // an added-on strip. No persona selected yet = original default order.
  const blockOrder: DashboardBlockId[] = computeBlendedBlockOrder(preferences.personas);

  const blockMap: Record<DashboardBlockId, React.ReactNode> = {
    kpi: weather && !isHardError ? (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={t('dashboard.humidity')} value={weather.current.humidity} unit="%" icon={Droplets} colorVar="--color-accent-blue" />
        <StatCard
          label={t('dashboard.wind')}
          value={preferences.units === 'imperial' ? Math.round(weather.current.windSpeed * 0.621371) : weather.current.windSpeed}
          unit={preferences.units === 'imperial' ? 'mph' : 'km/h'}
          icon={WindIcon}
          colorVar="--color-accent-teal"
          hint={weather.current.windDirectionLabel}
        />
        <StatCard label={t('dashboard.pressure')} value={weather.current.pressure} unit="hPa" icon={Gauge} colorVar="--color-accent" />
        <StatCard label={t('dashboard.visibility')} value={weather.current.visibility} decimals={1} unit="km" icon={Eye} colorVar="--color-info" />
      </div>
    ) : null,

    sunTimes: weather && !isHardError ? (
      <div className="grid grid-cols-2 gap-3">
        <Card className="flex items-center gap-3 py-3">
          <span className="grid place-items-center size-10 rounded-lg bg-[var(--color-warning)]/10 text-[var(--color-warning)] shrink-0"><Sunrise size={18} /></span>
          <div>
            <p className="text-sm text-[var(--color-text-muted)] uppercase tracking-wide">{t('dashboard.sunrise')}</p>
            <p className="text-base font-semibold text-[var(--color-text-primary)]">{weather.current.sunrise}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 py-3">
          <span className="grid place-items-center size-10 rounded-lg bg-[var(--color-critical)]/10 text-[var(--color-critical)] shrink-0"><Sunset size={18} /></span>
          <div>
            <p className="text-sm text-[var(--color-text-muted)] uppercase tracking-wide">{t('dashboard.sunset')}</p>
            <p className="text-base font-semibold text-[var(--color-text-primary)]">{weather.current.sunset}</p>
          </div>
        </Card>
      </div>
    ) : null,

    aiInsight: airQuality && !isHardError ? (
      <Card className="border-[var(--color-advanced)]/25 bg-[var(--color-advanced)]/[0.04]">
        <div className="flex items-start gap-3">
          <span className="grid place-items-center size-10 rounded-xl bg-[var(--color-advanced)]/15 text-[var(--color-advanced)] shrink-0">
            <Cpu size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="text-base font-semibold text-[var(--color-text-primary)]">{t('dashboard.aiInsight')}</p>
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-advanced)]/30 bg-[var(--color-advanced)]/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-advanced)]">
                <Sparkles size={10} /> {t('dashboard.simulated')}
              </span>
              <span className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)]">
                <TrendIcon size={12} style={{ color: trendColor }} /> {insight.trend}
              </span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{insight.summary}</p>
            <Link to="/ai-predictions" className="mt-1.5 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-accent-teal)] hover:underline">
              {t('dashboard.viewFullPrediction')} <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </Card>
    ) : null,

    aqiTrendAlerts: (
      <div className="grid lg:grid-cols-3 gap-5">
        {/* AQI trend */}
        <Card className="lg:col-span-2">
          <CardHeader title={t('dashboard.aqiTrendTitle')} subtitle={t('dashboard.aqiTrendSubtitle')} icon={TrendingUp} action={<DataStatusBadge state={status} />} />
          {isLoading ? (
            <div className="skeleton h-56 w-full rounded-lg" />
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-accent-teal)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-accent-teal)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-panel-border)" vertical={false} />
                <XAxis dataKey="time" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={{ background: 'var(--color-panel)', border: '1px solid var(--color-panel-border)', borderRadius: 10, fontSize: 12 }} />
                <Area type="monotone" dataKey="aqi" stroke="var(--color-accent-teal)" fill="url(#aqiGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)] py-10 text-center">{t('dashboard.noAqiTrend')}</p>
          )}
          <Link to="/air-quality" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-accent-teal)] hover:underline">
            {t('dashboard.viewAirQualityBreakdown')} <ArrowRight size={12} />
          </Link>
        </Card>

        {/* Alerts rail */}
        <Card>
          <CardHeader title={t('dashboard.activeAlertsTitle')} icon={ShieldAlert} subtitle={`${activeAlerts.length} ${t('dashboard.activeAlertsCount')}`} />
          {activeAlerts.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] py-6 text-center">{t('dashboard.noActiveAlerts')}</p>
          ) : (
            <ul className="space-y-2.5">
              {activeAlerts.slice(0, 4).map((a) => (
                <li key={a.id} className="rounded-lg border border-[var(--color-panel-border)] p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-[var(--color-text-primary)]">{a.type}</span>
                    <span
                      className="text-xs font-bold uppercase px-1.5 py-0.5 rounded"
                      style={{
                        color: a.severity === 'Critical' ? 'var(--color-critical)' : a.severity === 'High' ? 'var(--color-warning)' : 'var(--color-accent-blue)',
                        backgroundColor: a.severity === 'Critical' ? 'color-mix(in srgb, var(--color-critical) 15%, transparent)' : a.severity === 'High' ? 'color-mix(in srgb, var(--color-warning) 15%, transparent)' : 'color-mix(in srgb, var(--color-accent-blue) 15%, transparent)',
                      }}
                    >
                      {a.severity}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)] line-clamp-2">{a.description}</p>
                </li>
              ))}
            </ul>
          )}
          <Link to="/warnings" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-accent-teal)] hover:underline">
            {t('dashboard.viewAllAlerts')} <ArrowRight size={12} />
          </Link>
        </Card>
      </div>
    ),

    forecastActions: (
      <div className="grid lg:grid-cols-3 gap-5">
        {/* 7-day preview */}
        <Card className="lg:col-span-2">
          <CardHeader title={t('dashboard.forecastTitle')} icon={Sparkles} />
          {isLoading ? (
            <CardSkeleton lines={2} />
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {weather?.daily.map((d, i) => (
                <div key={d.date} className="flex flex-col items-center gap-1.5 rounded-lg border border-[var(--color-panel-border)] py-3 hover:bg-[var(--color-panel-hover)] transition-colors">
                  <span className="text-xs font-medium text-[var(--color-text-muted)]">
                    {i === 0 ? t('dashboard.today') : new Date(d.date).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', { weekday: 'short' })}
                  </span>
                  <WeatherIcon code={d.weatherCode} size={22} className="text-[var(--color-accent-teal)]" />
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">{formatTemp(d.max, preferences.units)}</span>
                  <span className="text-sm text-[var(--color-text-muted)]">{formatTemp(d.min, preferences.units)}</span>
                </div>
              ))}
            </div>
          )}
          <Link to="/weather" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-accent-teal)] hover:underline">
            {t('dashboard.fullForecast')} <ArrowRight size={12} />
          </Link>
        </Card>

        {/* Recommendations preview */}
        <Card>
          <CardHeader title={t('dashboard.recommendedTitle')} icon={Leaf} />
          <ul className="space-y-2.5 text-sm text-[var(--color-text-secondary)]">
            {airQuality && airQuality.current.aqi !== null && airQuality.current.aqi > 100 ? (
              <>
                <li className="flex gap-2"><span className="text-[var(--color-warning)]">•</span> {t('dashboard.recAqiLimit')}</li>
                <li className="flex gap-2"><span className="text-[var(--color-warning)]">•</span> {t('dashboard.recAqiMask')}</li>
                <li className="flex gap-2"><span className="text-[var(--color-warning)]">•</span> {t('dashboard.recAqiWindows')}</li>
              </>
            ) : (
              <li className="flex gap-2"><span className="text-[var(--color-accent)]">•</span> {t('dashboard.recGood')}</li>
            )}
          </ul>
          <Link to="/actions" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-accent-teal)] hover:underline">
            {t('dashboard.viewAllRecommendations')} <ArrowRight size={12} />
          </Link>
        </Card>
      </div>
    ),
  };

  return (
    <div className="space-y-5">
      {/* Hero */}
      <Card className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            background: 'radial-gradient(600px 300px at 15% 0%, var(--color-bg-ambient-1), transparent 60%)',
          }}
        />
        {weather && (
          <WeatherAnimation code={weather.current.weatherCode} isDay={weather.current.isDay} />
        )}
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{location.displayName}</h1>
              <DataStatusBadge state={status} />
              <button
                onClick={() => {
                  if (isLocationSaved(location)) return;
                  if (savedLocations.length >= MAX_SAVED) {
                    showToast(`You can save up to ${MAX_SAVED} places — remove one in Settings first`, 'error');
                    return;
                  }
                  saveLocation(location, 'Custom', location.city);
                  showToast(`${location.city} saved`, 'success');
                }}
                aria-label={isLocationSaved(location) ? 'Already saved' : 'Save this location'}
                title={isLocationSaved(location) ? 'Saved' : 'Save this location'}
                className={`shrink-0 transition-colors ${isLocationSaved(location) ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}
              >
                {isLocationSaved(location) ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
              </button>
            </div>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              {location.latitude.toFixed(4)}° N/S • {location.longitude.toFixed(4)}° E/W
            </p>

            {isLoading ? (
              <div className="flex items-center gap-3">
                <div className="skeleton size-16 rounded-xl" />
                <div className="space-y-2">
                  <div className="skeleton h-8 w-24 rounded" />
                  <div className="skeleton h-3 w-32 rounded" />
                </div>
              </div>
            ) : weather ? (
              <div className="flex items-center gap-4">
                <span className="grid place-items-center size-16 rounded-2xl bg-[var(--color-bg-secondary)] text-[var(--color-accent-teal)]">
                  <WeatherIcon code={weather.current.weatherCode} isDay={weather.current.isDay} size={34} />
                </span>
                <div>
                  <p className="text-4xl font-bold text-[var(--color-text-primary)] tabular-nums">
                    {formatTemp(weather.current.temperature, preferences.units)}
                  </p>
                  <p className="text-base text-[var(--color-text-secondary)]">
                    {weather.current.condition} • {t('dashboard.feelsLike')} {formatTemp(weather.current.feelsLike, preferences.units)}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {airQuality && (
            <div className="flex items-center gap-5">
              <AQIGauge aqi={airQuality.current.aqi} category={airQuality.current.aqiCategory} size={150} />
              <div className="max-w-[200px] hidden sm:block">
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t('dashboard.airQualityLabel')}</p>
                  <InfoHint text={t('dashboard.aqiInfoHint')} />
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {AQI_GUIDANCE[airQuality.current.aqiCategory]}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {savedLocations.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {savedLocations.map((s) => (
            <button
              key={s.id}
              onClick={() => setLocation(s)}
              className={`group flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                s.latitude === location.latitude && s.longitude === location.longitude
                  ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                  : 'border-[var(--color-panel-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-panel-hover)]'
              }`}
            >
              <MapPin size={13} />
              {s.label === 'Custom' ? s.customLabel || s.city : s.label}
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  removeSavedLocation(s.id);
                }}
                aria-label={`Remove ${s.label}`}
                className="ml-1 rounded-full p-0.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
              >
                <X size={12} />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* For You — persona-based personalization */}
      <Card>
        <CardHeader title={t('dashboard.forYouTitle')} icon={Users2} subtitle={t('dashboard.forYouSubtitle')} />
        <PersonaSelector />
        {personaInsights.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {personaInsights.map((ins) =>
              ins.persona === 'travel' ? (
                <TravelCard key={ins.persona} savedLocations={savedLocations} />
              ) : (
                <div key={ins.persona}>
                  <SmartInsightCard insight={ins} />
                  {weather && (
                    <PersonaGuide
                      items={getPersonaGuide(ins.persona, { weather, airQuality, marine, pollen, commuteWindows: preferences.commuteWindows, units: preferences.units })}
                    />
                  )}
                </div>
              )
            )}
          </div>
        )}
      </Card>

      {isHardError && (
        <Card>
          <ErrorState message={errorMessage ?? 'Unable to load environmental data for this location.'} onRetry={refresh} />
        </Card>
      )}

      {blockOrder.map((id) => (
        <React.Fragment key={id}>{blockMap[id]}</React.Fragment>
      ))}
    </div>
  );
};

export default DashboardPage;
