import React from 'react';
import { Wind, Factory, Flame, Cloud, Waves, Info } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { useEnvironmentData } from '../context/EnvironmentDataContext';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardHeader } from '../components/common/Card';
import { DataStatusBadge } from '../components/common/DataStatusBadge';
import { ErrorState, EmptyState, CardSkeleton } from '../components/common/States';
import { AQIGauge } from '../components/aqi/AQIGauge';
import { AQI_GUIDANCE, AQI_COLORS, classifyUsAqi } from '../utils/aqi';
import type { AqiCategory } from '../types';

const SCALE: { category: AqiCategory; range: string }[] = [
  { category: 'Good', range: '0–50' },
  { category: 'Moderate', range: '51–100' },
  { category: 'Unhealthy for Sensitive Groups', range: '101–150' },
  { category: 'Unhealthy', range: '151–200' },
  { category: 'Very Unhealthy', range: '201–300' },
  { category: 'Hazardous', range: '301+' },
];

const POLLUTANTS = [
  { key: 'pm2_5', label: 'PM2.5', unit: 'µg/m³', icon: Cloud },
  { key: 'pm10', label: 'PM10', unit: 'µg/m³', icon: Cloud },
  { key: 'co', label: 'CO', unit: 'µg/m³', icon: Flame },
  { key: 'no2', label: 'NO₂', unit: 'µg/m³', icon: Factory },
  { key: 'so2', label: 'SO₂', unit: 'µg/m³', icon: Factory },
  { key: 'o3', label: 'O₃', unit: 'µg/m³', icon: Waves },
] as const;

const AirQualityPage: React.FC = () => {
  const { airQuality, status, errorMessage, refresh, lastUpdated } = useEnvironmentData();
  const { t } = useLanguage();

  if (status === 'LOADING' && !airQuality) {
    return (
      <div className="space-y-5">
        <CardSkeleton lines={5} />
        <CardSkeleton lines={3} />
      </div>
    );
  }

  if (status === 'ERROR' && !airQuality) {
    return (
      <Card>
        <ErrorState message={errorMessage ?? 'Air quality data is currently unavailable.'} onRetry={refresh} />
      </Card>
    );
  }

  if (!airQuality) {
    return (
      <Card>
        <EmptyState title={t('pages.airQuality.noData')} message="No air-quality data from provider for this location." icon={Wind} />
      </Card>
    );
  }

  const now = Date.now();
  const chartData = airQuality.hourly.map((h) => ({
    time: new Date(h.time).toLocaleTimeString([], { hour: 'numeric' }),
    aqi: h.aqi,
    isForecast: new Date(h.time).getTime() > now,
  }));
  const nowLabel = chartData.find((d) => d.isForecast)?.time;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Air Quality</h1>
        <DataStatusBadge state={status} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-1 flex flex-col items-center justify-center">
          <AQIGauge aqi={airQuality.current.aqi} category={airQuality.current.aqiCategory} size={200} />
          <p className="text-sm text-[var(--color-text-secondary)] text-center mt-3 leading-relaxed">
            {AQI_GUIDANCE[airQuality.current.aqiCategory]}
          </p>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title={t('pages.airQuality.pollutants')} subtitle={t('pages.airQuality.pollutantsSubtitle')} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {POLLUTANTS.map(({ key, label, unit, icon: Icon }) => {
              const value = airQuality.current[key];
              return (
                <div key={key} className="rounded-xl border border-[var(--color-panel-border)] p-3">
                  <div className="flex items-center gap-1.5 mb-1.5 text-[var(--color-text-muted)]">
                    <Icon size={13} />
                    <span className="text-sm font-medium uppercase tracking-wide">{label}</span>
                  </div>
                  <p className="text-lg font-bold text-[var(--color-text-primary)] tabular-nums">
                    {value !== null ? value.toFixed(1) : '—'}
                    <span className="text-xs font-normal text-[var(--color-text-muted)] ml-1">{unit}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Trend chart with measured vs forecast distinction */}
      <Card>
        <CardHeader
          title={t('pages.airQuality.trend')}
          subtitle={t('pages.airQuality.trendSubtitle')}
        />
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="aqiMeasured" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent-teal)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--color-accent-teal)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="aqiForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent-blue)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-accent-blue)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-panel-border)" vertical={false} />
            <XAxis dataKey="time" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={28} />
            <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} width={30} />
            <Tooltip contentStyle={{ background: 'var(--color-panel)', border: '1px solid var(--color-panel-border)', borderRadius: 10, fontSize: 12 }} />
            {nowLabel && <ReferenceLine x={nowLabel} stroke="var(--color-warning)" strokeDasharray="4 4" label={{ value: 'Now', fill: 'var(--color-warning)', fontSize: 10, position: 'top' }} />}
            <Area type="monotone" dataKey="aqi" stroke="var(--color-accent-teal)" fill="url(#aqiMeasured)" strokeWidth={2} connectNulls />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-2 mt-2 text-sm text-[var(--color-text-muted)]">
          <Info size={12} /> Values after the "Now" marker are model forecast, not live sensor measurements.
        </div>
      </Card>

      {/* Severity scale */}
      <Card>
        <CardHeader title={t('pages.airQuality.scale')} subtitle={t('pages.airQuality.scaleSubtitle')} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {SCALE.map((s) => {
            const active = classifyUsAqi(airQuality.current.aqi) === s.category;
            return (
              <div
                key={s.category}
                className={`rounded-lg border p-2.5 text-center transition-all ${active ? 'scale-[1.03] border-transparent' : 'border-[var(--color-panel-border)]'}`}
                style={active ? { backgroundColor: `${AQI_COLORS[s.category]}22`, borderColor: AQI_COLORS[s.category] } : undefined}
              >
                <div className="size-2.5 rounded-full mx-auto mb-1.5" style={{ backgroundColor: AQI_COLORS[s.category] }} />
                <p className="text-xs font-semibold text-[var(--color-text-primary)] leading-tight">{s.category}</p>
                <p className="text-sm text-[var(--color-text-muted)]">{s.range}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <p className="text-sm text-[var(--color-text-muted)] text-center">
        Source: {airQuality.meta.source} · Last updated {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '—'}
      </p>
    </div>
  );
};

export default AirQualityPage;
