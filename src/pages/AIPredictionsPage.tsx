import { tr, ph, aqiCat } from '../i18n/dynamic';
import React, { useMemo } from 'react';
import { Cpu, Sparkles, TriangleAlert, Car, Factory, Wind as WindIcon, Flame, HelpCircle, TrendingUp, TrendingDown, Minus, Gauge } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useEnvironmentData } from '../context/EnvironmentDataContext';
import { useLanguage } from '../context/LanguageContext';
import { predictionService } from '../services/predictionService';
import { Card, CardHeader } from '../components/common/Card';
import { ErrorState, EmptyState, CardSkeleton } from '../components/common/States';
import { AQI_COLORS, classifyUsAqi } from '../utils/aqi';

const RISK_COLOR: Record<string, string> = {
  Low: AQI_COLORS.Good,
  Moderate: AQI_COLORS.Moderate,
  High: AQI_COLORS.Unhealthy,
  Severe: AQI_COLORS.Hazardous,
};

const SOURCE_ICONS: Record<string, React.ElementType> = {
  Traffic: Car,
  Industrial: Factory,
  Dust: WindIcon,
  'Biomass Burning': Flame,
  Other: HelpCircle,
};

// Prototype-only estimated source contribution shares. NOT scientifically
// verified source attribution — see the disclaimer rendered with this data.
function estimateSources(pm25: number | null) {
  const base = pm25 ?? 40;
  const trafficShare = Math.min(45, 25 + base * 0.15);
  const industrialShare = Math.min(35, 15 + base * 0.1);
  const dustShare = Math.max(5, 20 - base * 0.05);
  const biomassShare = Math.max(3, 10 - base * 0.03);
  const remaining = Math.max(2, 100 - trafficShare - industrialShare - dustShare - biomassShare);
  return [
    { label: 'Traffic', value: Math.round(trafficShare) },
    { label: 'Industrial', value: Math.round(industrialShare) },
    { label: 'Dust', value: Math.round(dustShare) },
    { label: 'Biomass Burning', value: Math.round(biomassShare) },
    { label: 'Other', value: Math.round(remaining) },
  ];
}

const AIPredictionsPage: React.FC = () => {
  const { airQuality, weather, status, errorMessage, refresh } = useEnvironmentData();
  const { t } = useLanguage();

  const predictions = useMemo(() => (airQuality ? predictionService.predict(airQuality, weather?.current ?? null) : []), [airQuality, weather]);
  const factors = useMemo(() => (airQuality ? predictionService.factors(airQuality, weather?.current ?? null) : []), [airQuality, weather]);
  const explanation = useMemo(() => predictionService.explain(predictions, factors), [predictions, factors]);
  const sources = useMemo(() => estimateSources(airQuality?.current.pm2_5 ?? null), [airQuality]);

  const TrendIcon = explanation.trend === 'Increasing' ? TrendingUp : explanation.trend === 'Decreasing' ? TrendingDown : Minus;
  const trendColor = explanation.trend === 'Increasing' ? 'var(--color-critical)' : explanation.trend === 'Decreasing' ? 'var(--color-accent)' : 'var(--color-accent-blue)';

  if (status === 'LOADING' && !airQuality) {
    return (
      <div className="space-y-5">
        <CardSkeleton lines={4} />
        <CardSkeleton lines={4} />
      </div>
    );
  }

  if (status === 'ERROR' && !airQuality) {
    return (
      <Card>
        <ErrorState message={errorMessage ?? tr('Prediction inputs unavailable.', 'पूर्वानुमान के इनपुट उपलब्ध नहीं।')} onRetry={refresh} />
      </Card>
    );
  }

  if (!airQuality) {
    return (
      <Card>
        <EmptyState title={t('pages.aiPredictions.noData')} message="Air-quality inputs are required to generate predictions." icon={Cpu} />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">{tr('AI Predictions', 'AI पूर्वानुमान')}</h1>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-advanced)]/30 bg-[var(--color-advanced)]/10 px-2.5 py-1 text-sm font-medium uppercase tracking-wide text-[var(--color-advanced)]">
          <Sparkles size={11} /> {tr('Simulated AI Prediction', 'सिम्युलेटेड AI पूर्वानुमान')}
        </span>
      </div>

      <Card className="border-[var(--color-advanced)]/30 bg-[var(--color-advanced)]/[0.04]">
        <div className="flex gap-3">
          <TriangleAlert size={18} className="text-[var(--color-advanced)] shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {tr(`Mausam does not yet run a trained machine learning model. The AQI/PM figures below for each horizon are drawn from Open-Meteo's real CAMS atmospheric forecast where available; the risk narrative, "confidence", and contributing-factor weighting are a prototype heuristic (${predictionService.modelLabel}) with no statistical validation. Treat this page as illustrative, not decision-grade forecasting.`, `Mausam अभी कोई प्रशिक्षित मशीन-लर्निंग मॉडल नहीं चलाता। हर समय-सीमा के AQI/PM आँकड़े, जहाँ उपलब्ध हों, Open-Meteo के असली CAMS वायुमंडलीय पूर्वानुमान से लिए गए हैं; जोखिम का विवरण, "भरोसा" और योगदान देने वाले कारकों का भार एक प्रोटोटाइप अनुमान (${predictionService.modelLabel}) है जिसका कोई सांख्यिकीय सत्यापन नहीं हुआ। इस पेज को उदाहरण की तरह देखें, निर्णय-योग्य पूर्वानुमान की तरह नहीं।`)}
          </p>
        </div>
      </Card>

      {/* Plain-language explanation */}
      <Card hoverEffect={false}>
        <CardHeader title={t('pages.aiPredictions.expectedTrend')} icon={Cpu} />
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <span
              className="grid place-items-center size-11 rounded-xl"
              style={{ backgroundColor: `${trendColor}1f`, color: trendColor }}
            >
              <TrendIcon size={20} />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">{ph(explanation.trend)}</p>
              <p className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                <Gauge size={11} /> {tr('Prototype confidence', 'प्रोटोटाइप भरोसा')}: {ph(explanation.confidenceLabel)}
              </p>
            </div>
          </div>
          <div className="flex-1 border-t sm:border-t-0 sm:border-l border-[var(--color-panel-border)] pt-3 sm:pt-0 sm:pl-4">
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{explanation.summary}</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1.5">{explanation.confidenceNote}</p>
          </div>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {predictions.map((p) => (
          <Card key={p.horizonLabel} hoverEffect>
            <p className="text-sm font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-2">{ph(p.horizonLabel)}</p>
            <p className="text-2xl font-bold text-[var(--color-text-primary)] tabular-nums">{p.aqi}</p>
            <p className="text-sm text-[var(--color-text-muted)] mb-2">AQI · {aqiCat(classifyUsAqi(p.aqi))}</p>
            <span
              className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: `${RISK_COLOR[p.riskLevel]}22`, color: RISK_COLOR[p.riskLevel] }}
            >
              {ph(p.riskLevel)} {tr('Risk', 'जोखिम')}
            </span>
            <div className="mt-2.5 text-sm text-[var(--color-text-muted)] space-y-0.5">
              <p>PM2.5: {p.pm25} µg/m³</p>
              <p>PM10: {p.pm10} µg/m³</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title={t('pages.aiPredictions.contributingFactors')} subtitle={t('pages.aiPredictions.contributingFactorsSubtitle')} icon={Sparkles} />
          <ul className="space-y-3">
            {factors.map((f) => (
              <li key={f.factor}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--color-text-primary)] font-medium">{f.factor}</span>
                  <span className="text-[var(--color-text-muted)]">{f.weight}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--color-panel-border)] overflow-hidden">
                  <div className="h-full bg-[var(--color-advanced)] rounded-full transition-all duration-700" style={{ width: `${f.weight}%` }} />
                </div>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">{f.impact}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title={t('pages.aiPredictions.pollutionSources')} subtitle={t('pages.aiPredictions.pollutionSourcesSubtitle')} />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={sources.map((x) => ({ ...x, label: ph(x.label) }))} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid stroke="var(--color-panel-border)" horizontal={false} />
              <XAxis type="number" stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} unit="%" />
              <YAxis dataKey="label" type="category" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} width={90} />
              <Tooltip contentStyle={{ background: 'var(--color-panel)', border: '1px solid var(--color-panel-border)', borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="value" fill="var(--color-accent-teal)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {sources.map((s) => {
              const Icon = SOURCE_ICONS[s.label] ?? HelpCircle;
              return (
                <div key={s.label} className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
                  <Icon size={12} /> {ph(s.label)}
                </div>
              );
            })}
          </div>
          <p className="text-sm text-[var(--color-text-muted)] mt-3">
            {tr('These percentages are a prototype estimate for illustration only — not scientifically verified source attribution.', 'ये प्रतिशत सिर्फ़ उदाहरण के लिए एक प्रोटोटाइप अनुमान हैं — वैज्ञानिक रूप से सत्यापित स्रोत-निर्धारण नहीं।')}
          </p>
        </Card>
      </div>
    </div>
  );
};

export default AIPredictionsPage;
