import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bookmark, ChevronRight, CheckCircle2, Cloud, Cpu, Droplets, Eye, Info, MapPin, Plane, RefreshCw,
  ShieldAlert, Sparkles, Sun, Sunrise, Sunset, Thermometer, TrendingDown, TrendingUp, Minus, Wind, Bell, Clock, CalendarDays, Activity,
} from 'lucide-react';
import { useAppLocation } from '../../context/LocationContext';
import { useEnvironmentData } from '../../context/EnvironmentDataContext';
import { usePreferences } from '../../context/PreferencesContext';
import { useLanguage } from '../../context/LanguageContext';
import { usePersonaInsights } from '../../hooks/usePersonaInsights';
import { useSavedLocationsWeather } from '../../hooks/useSavedLocationsWeather';
import { useTravelDestination } from '../../hooks/useTravelDestination';
import { useDestinationWeather } from '../../hooks/useDestinationWeather';
import type { HomeCardId } from '../../hooks/useHomeLayout';
import { sortAlertsForPersonas } from '../../services/alertService';
import { predictionService } from '../../services/predictionService';
import { travelInsight, type SmartInsight } from '../../utils/personaInsights';
import { generalInsight } from '../../utils/generalInsight';
import { ACTIVITY_SCORE_RULES, computeActivityScore, uvCategory } from '../../utils/activityScore';
import { AQI_COLORS, AQI_GUIDANCE } from '../../utils/aqi';
import { formatTemp, formatWind, formatVisibility } from '../../utils/units';
import { localNowIso } from '../../utils/time';
import { WeatherIcon } from '../weather/WeatherIcon';
import { GlassCard, ScoreRing, StatPill, type Tint } from './ui';
import { PersonaGuide } from '../common/PersonaGuide';
import { getPersonaGuide, type GuideItem } from '../../utils/personaGuides';
import { GENERAL_ICON, PERSONA_ICONS } from './personaMeta';
import type { Persona } from '../../types';

/** Tiny helper for the few strings that don't warrant their own dictionary key. */
function useL() {
  const { language } = useLanguage();
  return (en: string, hi: string) => (language === 'hi' ? hi : en);
}

const CardTitle: React.FC<{ icon: React.ElementType; title: string; right?: React.ReactNode }> = ({ icon: Icon, title, right }) => (
  <div className="flex items-center justify-between gap-2 mb-3">
    <div className="flex items-center gap-2 min-w-0">
      <Icon size={18} className="text-[var(--color-brand)] shrink-0" />
      <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)] truncate">{title}</h3>
    </div>
    {right}
  </div>
);

const SeeAll: React.FC<{ to: string }> = ({ to }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  return (
    <button onClick={() => navigate(to)} className="inline-flex items-center gap-0.5 text-sm font-semibold text-[var(--color-brand)] h-9 px-1">
      {t('m.seeAll')} <ChevronRight size={16} />
    </button>
  );
};

// ---------------------------------------------------------------- Insight

const TONE_TINT: Record<SmartInsight['tone'], Tint> = { good: 'blue', info: 'blue', moderate: 'peach', caution: 'red' };

const InsightCard: React.FC<{
  icon: React.ElementType; title: string; headline: string; detail: string; tone: SmartInsight['tone'];
  reason: string; isEstimate?: boolean; withPills: boolean; guide?: GuideItem[];
}> = ({ icon: Icon, title, headline, detail, tone, reason, isEstimate, withPills, guide }) => {
  const { weather } = useEnvironmentData();
  const { preferences } = usePreferences();
  const { t } = useLanguage();
  const [why, setWhy] = useState(false);
  const c = weather?.current;
  const uv = c ? uvCategory(c.uvIndex) : null;
  return (
    <GlassCard tint={TONE_TINT[tone]}>
      <div className="flex items-start gap-4">
        <span className="grid place-items-center size-16 rounded-full bg-[var(--color-brand)]/12 text-[var(--color-brand)] shrink-0">
          <Icon size={30} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{title}</p>
          <h2 className="text-[22px] leading-tight font-bold text-[var(--color-text-primary)] mt-0.5">{headline}</h2>
          <p className="text-[15px] text-[var(--color-text-secondary)] mt-1.5 leading-snug">{detail}</p>
        </div>
      </div>
      {withPills && c && uv && (
        <div className="flex flex-wrap gap-2 mt-4">
          <StatPill icon={<Thermometer size={16} className="text-[var(--color-brand)]" />} label={formatTemp(c.temperature, preferences.units)} />
          <StatPill icon={<Droplets size={16} className="text-[var(--color-brand)]" />} label={`${t('m.rain')} ${Math.round(c.precipitationProbability)}%`} />
          <StatPill icon={<Wind size={16} className="text-[var(--color-brand)]" />} label={`${t('m.wind2')} ${formatWind(c.windSpeed, preferences.units)}`} />
          <StatPill icon={<Sun size={16} style={{ color: uv.color }} />} label={`UV ${uv.label}`} />
        </div>
      )}
      <div className="flex items-center justify-between mt-3 gap-2">
        <button onClick={() => setWhy((v) => !v)} className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] h-9">
          <Info size={15} /> {t('dashboard.whyAmISeeing')}
        </button>
        {isEstimate && (
          <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-panel-border)]/60 text-[var(--color-text-muted)]">{t('dashboard.estimated')}</span>
        )}
      </div>
      {why && <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed pt-2 border-t border-[var(--color-panel-border)]">{reason}</p>}
      {guide && guide.length > 0 && <PersonaGuide items={guide} />}
    </GlassCard>
  );
};

export const TravelDestinationCard: React.FC<{ withPills: boolean }> = ({ withPills }) => {
  const { savedLocations } = useAppLocation();
  const { preferences } = usePreferences();
  const { t, language } = useLanguage();
  const { destination, setDestinationId } = useTravelDestination(savedLocations);
  const { weather, alerts, isLoading, errorMessage } = useDestinationWeather(destination);
  const insight = weather ? travelInsight(weather) : null;
  const today = weather?.daily[0];
  const label = (s: { label: string; customLabel?: string; city: string }) => (s.label === 'Custom' ? s.customLabel || s.city : s.label);
  const locale = language === 'hi' ? 'hi-IN' : 'en-US';
  const active = alerts.filter((a) => a.status === 'Active');

  return (
    <div className="space-y-3">
      {destination && weather && insight ? (
        <InsightCard icon={Plane} title={`${t('persona.travel.name')} · ${destination.city}`} headline={insight.headline} detail={insight.detail} tone={insight.tone} reason={insight.reason} isEstimate={insight.isEstimate} withPills={withPills}
          guide={getPersonaGuide('travel', { weather, airQuality: null, marine: null, pollen: null, commuteWindows: preferences.commuteWindows, units: preferences.units })} />
      ) : (
        <GlassCard tint="blue">
          <div className="flex items-center gap-3 mb-2">
            <span className="grid place-items-center size-12 rounded-full bg-[var(--color-brand)]/12 text-[var(--color-brand)]"><Plane size={24} /></span>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{t('persona.travel.name')}</h2>
          </div>
          <p className="text-[15px] text-[var(--color-text-secondary)]">
            {savedLocations.length === 0 ? t('m.travel.saveFirst') : isLoading ? t('m.travel.fetching') : errorMessage ? t('m.travel.failed') : t('m.travel.pick')}
          </p>
        </GlassCard>
      )}

      {savedLocations.length > 0 && (
        <div className="m-scroll-x" data-no-pull>
          {savedLocations.map((s) => (
            <button
              key={s.id}
              onClick={() => setDestinationId(s.id)}
              className={`shrink-0 h-10 px-4 rounded-full text-sm font-semibold border ${
                destination?.id === s.id ? 'bg-[var(--color-brand)] border-[var(--color-brand)] text-white' : 'bg-[var(--color-panel)] border-[var(--color-panel-border)] text-[var(--color-text-primary)]'
              }`}
            >
              {label(s)}
            </button>
          ))}
        </div>
      )}

      {destination && weather && today && (
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-1.5"><MapPin size={17} className="text-[var(--color-brand)]" />{destination.city}</p>
              <p className="text-base text-[var(--color-text-secondary)] mt-0.5">
                {weather.current.condition} · <span className="font-semibold text-[var(--color-brand)]">{formatTemp(today.max, preferences.units)}</span>/{formatTemp(today.min, preferences.units)}
              </p>
            </div>
            <WeatherIcon code={weather.current.weatherCode} isDay={weather.current.isDay} size={44} className="text-[var(--color-brand)]" />
          </div>
          <div className="grid grid-cols-4 gap-1 mt-4 border-t border-[var(--color-panel-border)] pt-3">
            {weather.daily.slice(1, 5).map((d) => (
              <div key={d.date} className="flex flex-col items-center gap-1">
                <span className="text-sm text-[var(--color-text-muted)]">{new Date(`${d.date}T12:00:00`).toLocaleDateString(locale, { weekday: 'short' })}</span>
                <WeatherIcon code={d.weatherCode} size={24} className="text-[var(--color-brand)]" />
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">{Math.round(d.max)}°/{Math.round(d.min)}°</span>
              </div>
            ))}
          </div>
          {active.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {active.slice(0, 2).map((a) => (
                <p key={a.id} className="flex items-start gap-1.5 text-sm text-[var(--color-warning)]"><ShieldAlert size={15} className="mt-0.5 shrink-0" />{a.type} — {a.description}</p>
              ))}
            </div>
          )}
        </GlassCard>
      )}
      {destination && isLoading && !weather && (
        <p className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]"><RefreshCw size={14} className="animate-spin" /> {t('m.travel.fetching')}</p>
      )}
    </div>
  );
};

export const InsightSection: React.FC = () => {
  const { weather, airQuality } = useEnvironmentData();
  const { preferences } = usePreferences();
  const { t } = useLanguage();
  const { insights, guideFor } = usePersonaInsights();
  if (!weather) return null;

  if (preferences.personas.length === 0) {
    const g = generalInsight(weather, airQuality);
    return <InsightCard icon={GENERAL_ICON} title={t('m.general')} headline={g.headline} detail={g.detail} tone={g.tone} reason={g.reason} withPills guide={guideFor(null)} />;
  }

  return (
    <div className="space-y-3">
      {preferences.personas.map((p: Persona, i) => {
        if (p === 'travel') return <TravelDestinationCard key={p} withPills={i === 0} />;
        const ins = insights.find((x) => x.persona === p);
        if (!ins) return null;
        return (
          <InsightCard key={p} icon={PERSONA_ICONS[p]} title={ins.title} headline={ins.headline} detail={ins.detail} tone={ins.tone} reason={ins.reason} isEstimate={ins.isEstimate} withPills={i === 0} guide={guideFor(p)} />
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------- Alerts

export const AlertsCard: React.FC = () => {
  const navigate = useNavigate();
  const { alerts } = useEnvironmentData();
  const { preferences } = usePreferences();
  const { t } = useLanguage();
  const active = sortAlertsForPersonas(alerts.filter((a) => a.status === 'Active'), preferences.personas);
  if (active.length === 0) {
    return (
      <GlassCard tint="green" className="!py-3">
        <p className="flex items-center gap-2.5 text-[15px] font-medium text-[var(--color-text-primary)]"><CheckCircle2 size={20} className="text-[var(--color-accent)] shrink-0" />{t('m.noAlerts')}</p>
      </GlassCard>
    );
  }
  const top = active[0];
  const severe = top.severity === 'Critical' || top.severity === 'High';
  return (
    <GlassCard tint={severe ? 'red' : 'blue'} onClick={() => navigate('/warnings')} className="!py-3.5">
      <div className="flex items-center gap-3">
        <span className={`grid place-items-center size-10 rounded-full shrink-0 ${severe ? 'bg-[var(--color-critical)]/15 text-[var(--color-critical)]' : 'bg-[var(--color-brand)]/15 text-[var(--color-brand)]'}`}>
          {severe ? <ShieldAlert size={20} /> : <Info size={20} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-[var(--color-text-primary)] line-clamp-1">{top.type} · {top.severity}</p>
          <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2">{top.description}</p>
          {active.length > 1 && <p className="text-xs font-semibold text-[var(--color-brand)] mt-0.5">+{active.length - 1} {t('m.moreAlerts')}</p>}
        </div>
        <ChevronRight size={20} className="text-[var(--color-text-muted)] shrink-0" />
      </div>
    </GlassCard>
  );
};

// ---------------------------------------------------------------- Sun / score

export const SunCard: React.FC = () => {
  const { weather } = useEnvironmentData();
  const { t } = useLanguage();
  if (!weather) return null;
  return (
    <GlassCard tint="peach" className="flex flex-col justify-center gap-3 !px-3.5">
      <div className="flex items-center gap-3">
        <Sunrise size={30} className="text-[#f59e0b] shrink-0" />
        <div className="min-w-0"><p className="text-sm text-[var(--color-text-secondary)]">{t('dashboard.sunrise')}</p><p className="text-[17px] font-bold text-[var(--color-text-primary)] tabular-nums whitespace-nowrap">{weather.current.sunrise}</p></div>
      </div>
      <div className="h-px bg-[var(--color-panel-border)]" />
      <div className="flex items-center gap-3">
        <Sunset size={30} className="text-[#ea580c] shrink-0" />
        <div className="min-w-0"><p className="text-sm text-[var(--color-text-secondary)]">{t('dashboard.sunset')}</p><p className="text-[17px] font-bold text-[var(--color-text-primary)] tabular-nums whitespace-nowrap">{weather.current.sunset}</p></div>
      </div>
    </GlassCard>
  );
};

export const ScoreCard: React.FC = () => {
  const { weather, airQuality } = useEnvironmentData();
  const { t } = useLanguage();
  const L = useL();
  const [open, setOpen] = useState(false);
  if (!weather) return null;
  const s = computeActivityScore(weather.current, airQuality?.current.aqi ?? null);
  const color = s.score >= 80 ? '#16a34a' : s.score >= 60 ? '#65a30d' : s.score >= 40 ? '#d97706' : '#dc2626';
  const label = { Excellent: L('Excellent', 'उत्कृष्ट'), Good: L('Good', 'अच्छा'), Fair: L('Fair', 'ठीक-ठाक'), Poor: L('Poor', 'खराब') }[s.label];
  return (
    <GlassCard tint="green" className="flex flex-col items-center text-center">
      <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">{t('m.card.score')}</p>
      <p className="text-sm text-[var(--color-text-secondary)] mb-2">{t('m.scoreLabel')}: <span className="font-bold" style={{ color }}>{s.score}/100</span></p>
      <ScoreRing value={s.score} color={color} size={104}>
        <div className="text-center leading-tight">
          <Activity size={20} style={{ color }} className="mx-auto" />
          <p className="text-sm font-bold mt-0.5" style={{ color }}>{label}</p>
        </div>
      </ScoreRing>
      {s.limiting && <p className="text-xs text-[var(--color-text-muted)] mt-2">{L('Held back by', 'कमी का कारण')}: {s.limiting}</p>}
      <button onClick={() => setOpen((v) => !v)} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-text-muted)] h-8">
        <Info size={13} /> {t('m.howScore')}
      </button>
      {open && <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed mt-1 text-left">{ACTIVITY_SCORE_RULES}</p>}
    </GlassCard>
  );
};

// ---------------------------------------------------------------- Hourly / daily

export const HourlyCard: React.FC = () => {
  const { weather } = useEnvironmentData();
  const { preferences } = usePreferences();
  const { t, language } = useLanguage();
  const L = useL();
  if (!weather) return null;
  const nowKey = localNowIso(weather.timezone).slice(0, 13);
  const hours = weather.hourly.filter((h) => h.time.slice(0, 13) >= nowKey).slice(0, 24);
  const locale = language === 'hi' ? 'hi-IN' : 'en-US';
  return (
    <GlassCard>
      <CardTitle icon={Clock} title={t('m.card.hourly')} right={<SeeAll to="/weather" />} />
      <div className="m-scroll-x -mx-1 px-1" data-no-pull>
        {hours.map((h, i) => (
          <div key={h.time} className="shrink-0 w-[68px] flex flex-col items-center gap-1.5 rounded-2xl py-2.5">
            <span className="text-sm text-[var(--color-text-secondary)]">{i === 0 ? L('Now', 'अभी') : new Date(h.time).toLocaleTimeString(locale, { hour: 'numeric' })}</span>
            <WeatherIcon code={h.weatherCode} isDay={h.isDay} size={28} className="text-[var(--color-brand)]" />
            <span className="text-lg font-bold text-[var(--color-text-primary)]">{Math.round(preferences.units === 'imperial' ? (h.temperature * 9) / 5 + 32 : h.temperature)}°</span>
            <span className={`text-xs font-medium ${h.precipitationProbability >= 30 ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-muted)]'}`}>{Math.round(h.precipitationProbability)}%</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

export const DailyCard: React.FC = () => {
  const { weather } = useEnvironmentData();
  const { preferences } = usePreferences();
  const { t, language } = useLanguage();
  if (!weather) return null;
  const locale = language === 'hi' ? 'hi-IN' : 'en-US';
  return (
    <GlassCard>
      <CardTitle icon={CalendarDays} title={t('m.card.daily')} right={<SeeAll to="/weather" />} />
      <ul className="divide-y divide-[var(--color-panel-border)]">
        {weather.daily.slice(0, 7).map((d, i) => (
          <li key={d.date} className="flex items-center gap-3 py-2.5">
            <span className="w-16 text-[15px] font-medium text-[var(--color-text-primary)]">{i === 0 ? t('m.today') : new Date(`${d.date}T12:00:00`).toLocaleDateString(locale, { weekday: 'short' })}</span>
            <WeatherIcon code={d.weatherCode} size={24} className="text-[var(--color-brand)] shrink-0" />
            <span className={`w-12 text-sm font-medium ${d.precipitationProbability >= 30 ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-muted)]'}`}>{Math.round(d.precipitationProbability)}%</span>
            <span className="ml-auto text-[15px] tabular-nums text-[var(--color-text-primary)]">
              <b>{formatTemp(d.max, preferences.units).replace(/[CF]$/, '')}</b> <span className="text-[var(--color-text-muted)]">{formatTemp(d.min, preferences.units).replace(/[CF]$/, '')}</span>
            </span>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
};

// ---------------------------------------------------------------- Half-width stat cards

const StatHalf: React.FC<{ tint: Tint; icon: React.ReactNode; title: string; value: string; unit?: string; sub?: string; subColor?: string }> = ({ tint, icon, title, value, unit, sub, subColor }) => (
  <GlassCard tint={tint} className="flex items-center gap-3 !px-3.5">
    <div className="shrink-0">{icon}</div>
    <div className="min-w-0">
      <p className="text-sm text-[var(--color-text-secondary)]">{title}</p>
      <p className="leading-tight font-bold text-[var(--color-text-primary)] tabular-nums whitespace-nowrap">
        <span className="text-[26px]">{value}</span>
        {unit && <span className="text-sm font-semibold text-[var(--color-text-secondary)] ml-1">{unit}</span>}
      </p>
      {sub && <p className="text-sm font-semibold" style={{ color: subColor }}>{sub}</p>}
    </div>
  </GlassCard>
);

export const WindCard: React.FC = () => {
  const { weather } = useEnvironmentData();
  const { preferences } = usePreferences();
  const { t } = useLanguage();
  if (!weather) return null;
  const c = weather.current;
  const kmh = preferences.units === 'imperial' ? Math.round(c.windSpeed * 0.621371) : Math.round(c.windSpeed);
  return <StatHalf tint="blue" icon={<Wind size={36} className="text-[var(--color-brand)]" />} title={t('m.card.wind')} value={String(kmh)} unit={preferences.units === 'imperial' ? 'mph' : 'km/h'} sub={c.windDirectionLabel} subColor="var(--color-text-secondary)" />;
};

export const UvCard: React.FC = () => {
  const { weather } = useEnvironmentData();
  const { t } = useLanguage();
  if (!weather) return null;
  const uv = uvCategory(weather.current.uvIndex);
  return <StatHalf tint="yellow" icon={<Sun size={36} className="text-[#eab308]" />} title={t('m.card.uv')} value={String(Math.round(weather.current.uvIndex))} sub={uv.label} subColor={uv.color} />;
};

export const HumidityCard: React.FC = () => {
  const { weather } = useEnvironmentData();
  const { t } = useLanguage();
  if (!weather) return null;
  return <StatHalf tint="teal" icon={<Droplets size={34} className="text-[#0d9488]" />} title={t('m.card.humidity')} value={`${Math.round(weather.current.humidity)}%`} />;
};

export const VisibilityCard: React.FC = () => {
  const { weather } = useEnvironmentData();
  const { preferences } = usePreferences();
  const { t } = useLanguage();
  if (!weather) return null;
  return <StatHalf tint="purple" icon={<Eye size={34} className="text-[#8b5cf6]" />} title={t('m.card.visibility')} value={formatVisibility(weather.current.visibility, preferences.units).split(' ')[0]} unit={formatVisibility(weather.current.visibility, preferences.units).split(' ')[1]} />;
};

// ---------------------------------------------------------------- AQI

export const AqiCard: React.FC = () => {
  const navigate = useNavigate();
  const { airQuality } = useEnvironmentData();
  const { t } = useLanguage();
  const L = useL();
  if (!airQuality) return null;
  const a = airQuality.current;
  const color = AQI_COLORS[a.aqiCategory];
  const pos = a.aqi === null ? 0 : Math.min(300, a.aqi) / 300;
  return (
    <GlassCard onClick={() => navigate('/air-quality')}>
      <CardTitle icon={Cloud} title={t('m.card.aqi')} right={<ChevronRight size={20} className="text-[var(--color-text-muted)]" />} />
      <div className="flex items-end gap-3">
        <span className="text-5xl font-bold tabular-nums leading-none" style={{ color }}>{a.aqi === null ? '—' : Math.round(a.aqi)}</span>
        <div className="pb-1">
          <p className="text-lg font-semibold" style={{ color }}>{a.aqi === null ? L('Unavailable', 'उपलब्ध नहीं') : a.aqiCategory}</p>
          {a.pm2_5 !== null && <p className="text-sm text-[var(--color-text-muted)]">PM2.5 {Math.round(a.pm2_5)} µg/m³</p>}
        </div>
      </div>
      <div className="relative mt-4 h-2.5 rounded-full" style={{ background: 'linear-gradient(90deg,#22c55e 0%,#f59e0b 20%,#fb923c 35%,#ef4444 52%,#a855f7 75%,#7f1d1d 100%)' }}>
        {a.aqi !== null && <span className="absolute top-1/2 size-4 -translate-y-1/2 -translate-x-1/2 rounded-full border-[3px] border-white bg-[var(--color-text-primary)] shadow" style={{ left: `${pos * 100}%` }} />}
      </div>
      <p className="text-sm text-[var(--color-text-secondary)] mt-3 leading-snug">{AQI_GUIDANCE[a.aqiCategory]}</p>
    </GlassCard>
  );
};

// ---------------------------------------------------------------- Saved locations

export const SavedCard: React.FC = () => {
  const navigate = useNavigate();
  const { location, savedLocations, setLocation } = useAppLocation();
  const { preferences } = usePreferences();
  const { t } = useLanguage();
  const { data } = useSavedLocationsWeather(savedLocations);
  return (
    <GlassCard>
      <CardTitle icon={Bookmark} title={t('m.card.saved')} right={<SeeAll to="/locations" />} />
      {savedLocations.length === 0 ? (
        <button onClick={() => navigate('/locations')} className="text-[15px] text-[var(--color-text-secondary)] text-left">{t('m.locations.empty')}</button>
      ) : (
        <div className="m-scroll-x -mx-1 px-1" data-no-pull>
          {savedLocations.map((s) => {
            const w = data[s.id];
            const here = s.latitude === location.latitude && s.longitude === location.longitude;
            return (
              <button
                key={s.id}
                onClick={() => { setLocation(s); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={`shrink-0 w-[104px] flex flex-col items-center gap-1.5 rounded-2xl border py-3 px-2 ${here ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/10' : 'border-[var(--color-panel-border)] bg-[var(--color-panel)]'}`}
              >
                {w ? <WeatherIcon code={w.weatherCode} isDay={w.isDay} size={30} className="text-[var(--color-brand)]" /> : <RefreshCwPlaceholder />}
                <span className="text-sm font-medium text-[var(--color-text-primary)] max-w-full truncate">{s.label === 'Custom' ? s.customLabel || s.city : s.label === 'Home' ? t('m.locations.home') : s.label === 'Work' ? t('m.locations.work') : t('m.locations.college')}</span>
                <span className="text-xl font-bold text-[var(--color-text-primary)]">{w ? formatTemp(w.temperature, preferences.units).replace(/[CF]$/, '') : t('m.locations.dash')}</span>
              </button>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
};

const RefreshCwPlaceholder: React.FC = () => <span className="skeleton size-[30px] rounded-full" />;

// ---------------------------------------------------------------- AI outlook (simulated, labelled)

export const OutlookCard: React.FC = () => {
  const navigate = useNavigate();
  const { weather, airQuality } = useEnvironmentData();
  const { t } = useLanguage();
  const insight = useMemo(() => {
    if (!airQuality) return null;
    const preds = predictionService.predict(airQuality, weather?.current ?? null);
    const factors = predictionService.factors(airQuality, weather?.current ?? null);
    return predictionService.explain(preds, factors);
  }, [airQuality, weather]);
  if (!insight) return null;
  const Trend = insight.trend === 'Increasing' ? TrendingUp : insight.trend === 'Decreasing' ? TrendingDown : Minus;
  return (
    <GlassCard tint="purple" onClick={() => navigate('/ai-predictions')}>
      <CardTitle
        icon={Cpu}
        title={t('m.card.outlook')}
        right={<span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-advanced)]/12 px-2.5 py-1 text-xs font-bold uppercase text-[var(--color-advanced)]"><Sparkles size={11} />{t('dashboard.simulated')}</span>}
      />
      <p className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] mb-1"><Trend size={15} /> {insight.trend}</p>
      <p className="text-[15px] text-[var(--color-text-secondary)] leading-relaxed">{insight.summary}</p>
    </GlassCard>
  );
};

// ---------------------------------------------------------------- registry (used by Customize sheet)

export const HOME_CARD_META: Record<HomeCardId, { labelKey: string; icon: React.ElementType }> = {
  insight: { labelKey: 'm.card.insight', icon: Sparkles },
  alerts: { labelKey: 'm.card.alerts', icon: Bell },
  sun: { labelKey: 'm.card.sun', icon: Sunrise },
  score: { labelKey: 'm.card.score', icon: Activity },
  hourly: { labelKey: 'm.card.hourly', icon: Clock },
  wind: { labelKey: 'm.card.wind', icon: Wind },
  uv: { labelKey: 'm.card.uv', icon: Sun },
  daily: { labelKey: 'm.card.daily', icon: CalendarDays },
  aqi: { labelKey: 'm.card.aqi', icon: Cloud },
  saved: { labelKey: 'm.card.saved', icon: Bookmark },
  humidity: { labelKey: 'm.card.humidity', icon: Droplets },
  visibility: { labelKey: 'm.card.visibility', icon: Eye },
  outlook: { labelKey: 'm.card.outlook', icon: Cpu },
};

export const HOME_CARDS: Record<HomeCardId, React.FC> = {
  insight: InsightSection,
  alerts: AlertsCard,
  sun: SunCard,
  score: ScoreCard,
  hourly: HourlyCard,
  wind: WindCard,
  uv: UvCard,
  daily: DailyCard,
  aqi: AqiCard,
  saved: SavedCard,
  humidity: HumidityCard,
  visibility: VisibilityCard,
  outlook: OutlookCard,
};

