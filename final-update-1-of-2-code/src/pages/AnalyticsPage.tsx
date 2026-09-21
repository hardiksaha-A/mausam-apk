import { tr, ph, timeLocale } from '../i18n/dynamic';
import React, { useEffect, useState } from 'react';
import { LineChart as LineChartIcon, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ScatterChart, Scatter } from 'recharts';
import { useAppLocation } from '../context/LocationContext';
import { useLanguage } from '../context/LanguageContext';
import { fetchAnalytics, type AnalyticsRange, type AnalyticsResult } from '../services/analyticsService';
import { Card, CardHeader } from '../components/common/Card';
import { DataStatusBadge } from '../components/common/DataStatusBadge';
import { ErrorState, EmptyState, CardSkeleton } from '../components/common/States';

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '6m', label: '6 Months' },
  { value: '1y', label: '1 Year' },
];

const AnalyticsPage: React.FC = () => {
  const { location } = useAppLocation();
  const { t } = useLanguage();
  const [range, setRange] = useState<AnalyticsRange>('7d');
  const [data, setData] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Bumping this forces the effect below to re-run even when `range`
  // itself hasn't changed — otherwise clicking Retry on the same range
  // was a no-op (setRange(current value) doesn't trigger a re-render).
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchAnalytics(location.latitude, location.longitude, range, controller.signal)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : tr('Failed to load analytics', 'एनालिटिक्स लोड नहीं हो सके'));
        setLoading(false);
      });
    return () => controller.abort();
  }, [location.latitude, location.longitude, range, reloadToken]);

  const isHourly = data?.granularity === 'hourly';
  const formatDate = (d: React.ReactNode) =>
    isHourly
      ? new Date(String(d)).toLocaleTimeString(timeLocale() ?? [], { hour: 'numeric' })
      : new Date(String(d)).toLocaleDateString(timeLocale() ?? [], { month: 'short', day: 'numeric' });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">{tr('Environmental Analytics', 'पर्यावरण एनालिटिक्स')}</h1>
        <div className="flex gap-1 rounded-lg bg-[var(--color-bg-secondary)] p-1 overflow-x-auto">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-2.5 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                range === r.value ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {ph(r.label)}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="space-y-5">
          <CardSkeleton lines={5} />
          <CardSkeleton lines={5} />
        </div>
      )}

      {!loading && error && (
        <Card>
          <ErrorState message={error} onRetry={() => setReloadToken((t) => t + 1)} />
        </Card>
      )}

      {!loading && !error && data && data.points.length === 0 && (
        <Card>
          <EmptyState title={t('pages.analytics.noData')} message="No historical data is available for this location and range." icon={LineChartIcon} />
        </Card>
      )}

      {!loading && !error && data && data.points.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <DataStatusBadge state={data.weatherState === 'LIVE' ? 'LIVE' : 'ERROR'} />
            <span className="text-sm text-[var(--color-text-muted)]">{tr('Weather history', 'मौसम का इतिहास')}</span>
            <DataStatusBadge state={data.aqState} />
            <span className="text-sm text-[var(--color-text-muted)]">{tr('Air quality history', 'वायु गुणवत्ता का इतिहास')}</span>
          </div>

          {data.aqCappedDays && (
            <Card className="border-[var(--color-warning)]/30 bg-[var(--color-warning)]/[0.05]">
              <div className="flex gap-2.5 items-start">
                <Info size={15} className="text-[var(--color-warning)] mt-0.5 shrink-0" />
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {tr(`The keyless air-quality provider only exposes roughly the last ${data.aqCappedDays} days of history. AQI/PM trends below are shown for that available window rather than the full requested range — labeled Estimated to reflect the shorter coverage. Weather temperature history is unaffected and covers the full requested range.`, `बिना-कुंजी वाला वायु-गुणवत्ता प्रदाता केवल पिछले लगभग ${data.aqCappedDays} दिनों का इतिहास देता है। नीचे AQI/PM रुझान माँगी गई पूरी अवधि के बजाय इसी उपलब्ध अवधि के लिए दिखाए गए हैं — कम कवरेज दर्शाने के लिए "अनुमानित" लिखा है। तापमान का इतिहास प्रभावित नहीं है और पूरी माँगी गई अवधि को कवर करता है।`)}
                </p>
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title={t('pages.analytics.aqiPmTrend')} subtitle={isHourly ? tr('Hourly readings — last 24 hours', 'घंटेवार रीडिंग — पिछले 24 घंटे') : tr('Daily average', 'दैनिक औसत')} />
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.points}>
                <CartesianGrid stroke="var(--color-panel-border)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDate} stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} width={30} />
                <Tooltip labelFormatter={formatDate} contentStyle={{ background: 'var(--color-panel)', border: '1px solid var(--color-panel-border)', borderRadius: 10, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="aqi" name="AQI" stroke="var(--color-accent-teal)" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="pm2_5" name="PM2.5" stroke="var(--color-warning)" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="pm10" name="PM10" stroke="var(--color-accent-blue)" strokeWidth={1.5} dot={false} connectNulls strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader title={t('pages.analytics.tempTrend')} subtitle={isHourly ? tr('Hourly reading', 'घंटेवार रीडिंग') : tr('Daily high / low', 'दैनिक अधिकतम / न्यूनतम')} />
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.points}>
                  <CartesianGrid stroke="var(--color-panel-border)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatDate} stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} width={30} />
                  <Tooltip labelFormatter={formatDate} contentStyle={{ background: 'var(--color-panel)', border: '1px solid var(--color-panel-border)', borderRadius: 10, fontSize: 12 }} />
                  {isHourly ? (
                    <Line type="monotone" dataKey="tempMax" name={tr('Temp °C', 'तापमान °C')} stroke="var(--color-critical)" strokeWidth={2} dot={false} />
                  ) : (
                    <>
                      <Line type="monotone" dataKey="tempMax" name={tr('High °C', 'अधिकतम °C')} stroke="var(--color-critical)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="tempMin" name={tr('Low °C', 'न्यूनतम °C')} stroke="var(--color-accent-blue)" strokeWidth={2} dot={false} />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <CardHeader title={t('pages.analytics.tempVsAqi')} subtitle={t('pages.analytics.scatterSubtitle')} />
              <ResponsiveContainer width="100%" height={220}>
                <ScatterChart>
                  <CartesianGrid stroke="var(--color-panel-border)" />
                  <XAxis type="number" dataKey="tempMax" name={tr('Temp °C', 'तापमान °C')} stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="number" dataKey="aqi" name="AQI" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} width={30} />
                  <Tooltip contentStyle={{ background: 'var(--color-panel)', border: '1px solid var(--color-panel-border)', borderRadius: 10, fontSize: 12 }} cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={data.points.filter((p) => p.tempMax !== null && p.aqi !== null)} fill="var(--color-accent-teal)" />
                </ScatterChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <CardHeader title={t('pages.analytics.windVsAqi')} subtitle={t('pages.analytics.scatterSubtitle')} />
              <ResponsiveContainer width="100%" height={220}>
                <ScatterChart>
                  <CartesianGrid stroke="var(--color-panel-border)" />
                  <XAxis type="number" dataKey="wind" name={tr('Wind km/h', 'हवा किमी/घं')} stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="number" dataKey="aqi" name="AQI" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} width={30} />
                  <Tooltip contentStyle={{ background: 'var(--color-panel)', border: '1px solid var(--color-panel-border)', borderRadius: 10, fontSize: 12 }} cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={data.points.filter((p) => p.wind !== null && p.aqi !== null)} fill="var(--color-accent-blue)" />
                </ScatterChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <CardHeader title={t('pages.analytics.rainVsPm')} subtitle={t('pages.analytics.scatterSubtitle')} />
              <ResponsiveContainer width="100%" height={220}>
                <ScatterChart>
                  <CartesianGrid stroke="var(--color-panel-border)" />
                  <XAxis type="number" dataKey="precipitation" name={tr('Rain mm', 'वर्षा मिमी')} stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="number" dataKey="pm2_5" name="PM2.5" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} width={30} />
                  <Tooltip contentStyle={{ background: 'var(--color-panel)', border: '1px solid var(--color-panel-border)', borderRadius: 10, fontSize: 12 }} cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={data.points.filter((p) => p.precipitation !== null && p.pm2_5 !== null)} fill="var(--color-warning)" />
                </ScatterChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;
