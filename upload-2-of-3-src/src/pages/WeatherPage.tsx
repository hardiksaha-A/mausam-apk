import React, { useState } from 'react';
import { Droplets, Wind as WindIcon, Gauge, Eye, Sunrise, Sunset, ThermometerSun, CloudRain, Sun } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';
import { useEnvironmentData } from '../context/EnvironmentDataContext';
import { useLanguage } from '../context/LanguageContext';
import { usePreferences } from '../context/PreferencesContext';
import { Card, CardHeader } from '../components/common/Card';
import { StatCard } from '../components/common/StatCard';
import { DataStatusBadge } from '../components/common/DataStatusBadge';
import { ErrorState, EmptyState, CardSkeleton } from '../components/common/States';
import { WeatherIcon } from '../components/weather/WeatherIcon';
import { WeatherAnimation } from '../components/weather/WeatherAnimation';
import { formatTemp, formatWind, formatPressure, formatVisibility } from '../utils/units';

type ChartMetric = 'temperature' | 'precipitationProbability' | 'windSpeed';

const METRIC_LABELS: Record<ChartMetric, string> = {
  temperature: 'Temperature',
  precipitationProbability: 'Precipitation %',
  windSpeed: 'Wind Speed',
};

const WeatherPage: React.FC = () => {
  const { weather, status, errorMessage, refresh } = useEnvironmentData();
  const { t } = useLanguage();
  const { preferences } = usePreferences();
  const [metric, setMetric] = useState<ChartMetric>('temperature');

  if (status === 'LOADING' && !weather) {
    return (
      <div className="space-y-5">
        <CardSkeleton lines={4} />
        <CardSkeleton lines={5} />
      </div>
    );
  }

  if (status === 'ERROR' && !weather) {
    return (
      <Card>
        <ErrorState message={errorMessage ?? 'Weather data is currently unavailable.'} onRetry={refresh} />
      </Card>
    );
  }

  if (!weather) {
    return (
      <Card>
        <EmptyState title={t('pages.weather.noData')} message="No weather data available for this location yet." />
      </Card>
    );
  }

  const hourlyChart = weather.hourly.slice(0, 24).map((h) => ({
    time: new Date(h.time).toLocaleTimeString([], { hour: 'numeric' }),
    temperature: h.temperature,
    precipitationProbability: h.precipitationProbability,
    windSpeed: h.windSpeed,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Weather Forecast</h1>
        <DataStatusBadge state={status} />
      </div>

      {/* Current conditions */}
      <Card className="relative overflow-hidden">
        <WeatherAnimation code={weather.current.weatherCode} isDay={weather.current.isDay} />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex items-center gap-4">
            <span className="grid place-items-center size-20 rounded-2xl bg-[var(--color-bg-secondary)] text-[var(--color-accent-teal)]">
              <WeatherIcon code={weather.current.weatherCode} isDay={weather.current.isDay} size={42} />
            </span>
            <div>
              <p className="text-5xl font-bold text-[var(--color-text-primary)] tabular-nums">
                {formatTemp(weather.current.temperature, preferences.units)}
              </p>
              <p className="text-base text-[var(--color-text-secondary)] mt-1">{weather.current.condition}</p>
              <p className="text-sm text-[var(--color-text-muted)]">Feels like {formatTemp(weather.current.feelsLike, preferences.units)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1">
            <StatCard label="Humidity" value={weather.current.humidity} unit="%" icon={Droplets} colorVar="--color-accent-blue" />
            <StatCard label="UV Index" value={weather.current.uvIndex} decimals={1} icon={Sun} colorVar="--color-warning" />
            <StatCard label="Rain Chance" value={weather.current.precipitationProbability} unit="%" icon={CloudRain} colorVar="--color-info" />
          </div>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Wind"
          value={preferences.units === 'imperial' ? Math.round(weather.current.windSpeed * 0.621371) : weather.current.windSpeed}
          unit={preferences.units === 'imperial' ? 'mph' : 'km/h'}
          icon={WindIcon}
          colorVar="--color-accent-teal"
          hint={weather.current.windDirectionLabel}
        />
        <StatCard label="Pressure" value={weather.current.pressure} unit="hPa" icon={Gauge} colorVar="--color-accent" />
        <StatCard label="Visibility" value={weather.current.visibility} decimals={1} unit="km" icon={Eye} colorVar="--color-advanced" />
        <StatCard label="Feels Like" value={weather.current.feelsLike} unit="°" icon={ThermometerSun} colorVar="--color-critical" />
      </div>

      {/* Hourly chart */}
      <Card>
        <CardHeader
          title={t('pages.weather.hourly')}
          subtitle={t('pages.weather.hourlySubtitle')}
          action={
            <div className="flex gap-1 rounded-lg bg-[var(--color-bg-secondary)] p-1">
              {(Object.keys(METRIC_LABELS) as ChartMetric[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`px-2.5 py-1 rounded-md text-sm font-medium transition-colors ${
                    metric === m ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {METRIC_LABELS[m]}
                </button>
              ))}
            </div>
          }
        />
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={hourlyChart}>
            <CartesianGrid stroke="var(--color-panel-border)" vertical={false} />
            <XAxis dataKey="time" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} width={30} />
            <Tooltip contentStyle={{ background: 'var(--color-panel)', border: '1px solid var(--color-panel-border)', borderRadius: 10, fontSize: 12 }} />
            <Line type="monotone" dataKey={metric} stroke="var(--color-accent-teal)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-4 flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
          {weather.hourly.slice(0, 12).map((h) => (
            <div key={h.time} className="flex flex-col items-center gap-1.5 min-w-[64px] rounded-lg border border-[var(--color-panel-border)] py-3 hover:bg-[var(--color-panel-hover)] transition-colors">
              <span className="text-sm text-[var(--color-text-muted)]">{new Date(h.time).toLocaleTimeString([], { hour: 'numeric' })}</span>
              <WeatherIcon code={h.weatherCode} isDay={h.isDay} size={18} className="text-[var(--color-accent-teal)]" />
              <span className="text-xs font-semibold text-[var(--color-text-primary)]">{formatTemp(h.temperature, preferences.units)}</span>
              <span className="text-xs text-[var(--color-accent-blue)]">{h.precipitationProbability}%</span>
            </div>
          ))}
        </div>
      </Card>

      {/* 7-day forecast */}
      <Card>
        <CardHeader title={t('pages.weather.daily')} subtitle={t('pages.weather.dailySubtitle')} />
        <div className="divide-y divide-[var(--color-panel-border)]">
          {weather.daily.map((d, i) => (
            <div key={d.date} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
              <span className="w-16 text-sm font-medium text-[var(--color-text-primary)] shrink-0">
                {i === 0 ? 'Today' : new Date(d.date).toLocaleDateString([], { weekday: 'short' })}
              </span>
              <WeatherIcon code={d.weatherCode} size={20} className="text-[var(--color-accent-teal)] shrink-0" />
              <span className="text-sm text-[var(--color-text-muted)] flex-1 min-w-0 truncate hidden sm:inline">{d.condition}</span>
              <span className="text-xs text-[var(--color-accent-blue)] w-10 text-right shrink-0">{d.precipitationProbability}%</span>
              <div className="flex items-center gap-2 w-28 justify-end shrink-0">
                <span className="text-sm text-[var(--color-text-muted)] tabular-nums">{formatTemp(d.min, preferences.units)}</span>
                <div className="h-1 w-12 rounded-full bg-[var(--color-panel-border)] overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[var(--color-accent-blue)] to-[var(--color-warning)]" style={{ width: '100%' }} />
                </div>
                <span className="text-xs font-semibold text-[var(--color-text-primary)] tabular-nums">{formatTemp(d.max, preferences.units)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-5">
        <Card className="flex items-center gap-4">
          <span className="grid place-items-center size-11 rounded-xl bg-[var(--color-warning)]/10 text-[var(--color-warning)]"><Sunrise size={20} /></span>
          <div>
            <p className="text-sm text-[var(--color-text-muted)]">Sunrise</p>
            <p className="text-lg font-semibold text-[var(--color-text-primary)]">{weather.current.sunrise}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <span className="grid place-items-center size-11 rounded-xl bg-[var(--color-critical)]/10 text-[var(--color-critical)]"><Sunset size={20} /></span>
          <div>
            <p className="text-sm text-[var(--color-text-muted)]">Sunset</p>
            <p className="text-lg font-semibold text-[var(--color-text-primary)]">{weather.current.sunset}</p>
          </div>
        </Card>
      </div>

      {/* keep BarChart import used for visual variety in precipitation view */}
      {metric === 'precipitationProbability' && (
        <Card>
          <CardHeader title={t('pages.weather.precip')} subtitle={t('pages.weather.precipSubtitle')} />
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={hourlyChart}>
              <CartesianGrid stroke="var(--color-panel-border)" vertical={false} />
              <XAxis dataKey="time" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} width={30} />
              <Tooltip contentStyle={{ background: 'var(--color-panel)', border: '1px solid var(--color-panel-border)', borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="precipitationProbability" fill="var(--color-accent-blue)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <p className="text-sm text-[var(--color-text-muted)] text-center">
        Visibility shown as {formatVisibility(weather.current.visibility, preferences.units)} · Pressure {formatPressure(weather.current.pressure, preferences.units)} · Wind {formatWind(weather.current.windSpeed, preferences.units)}
      </p>
    </div>
  );
};

export default WeatherPage;
