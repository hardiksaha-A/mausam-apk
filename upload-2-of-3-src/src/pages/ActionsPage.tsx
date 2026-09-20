import React, { useMemo } from 'react';
import { User, Truck, Factory, Building2, Info } from 'lucide-react';
import { useEnvironmentData } from '../context/EnvironmentDataContext';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardHeader } from '../components/common/Card';
import { EmptyState, CardSkeleton } from '../components/common/States';
import { classifyUsAqi } from '../utils/aqi';

interface Recommendation {
  title: string;
  detail: string;
}

function buildRecommendations(aqi: number | null, pm25: number | null, tempC: number | null) {
  const category = classifyUsAqi(aqi);
  const elevated = aqi !== null && aqi > 100;
  const severe = aqi !== null && aqi > 200;
  const hot = tempC !== null && tempC >= 38;

  const citizens: Recommendation[] = [];
  const traffic: Recommendation[] = [];
  const industrial: Recommendation[] = [];
  const city: Recommendation[] = [];

  if (severe) {
    citizens.push({ title: 'Avoid outdoor exertion', detail: `AQI is ${category.toLowerCase()}. Stay indoors where possible and use air filtration.` });
    citizens.push({ title: 'Wear a mask outdoors', detail: 'N95-grade masks reduce fine particulate exposure during severe events.' });
    traffic.push({ title: 'Consider odd-even or restriction schemes', detail: 'Temporary vehicle restrictions can meaningfully cut peak-hour emissions during severe episodes.' });
    industrial.push({ title: 'Review emission permits for compliance', detail: 'Cross-check active industrial output against permitted emission ceilings during the episode.' });
    city.push({ title: 'Issue a public health advisory', detail: 'Notify schools and outdoor event organizers of the elevated risk.' });
  } else if (elevated) {
    citizens.push({ title: 'Limit prolonged outdoor exertion', detail: 'Sensitive groups (children, elderly, respiratory/heart conditions) should reduce time outdoors.' });
    citizens.push({ title: 'Keep windows closed during peak hours', detail: 'Indoor air quality benefits from limiting outdoor air exchange during high-pollution windows.' });
    traffic.push({ title: 'Encourage carpooling / public transit', detail: 'Reducing single-occupancy trips helps ease localized congestion-driven emissions.' });
    industrial.push({ title: 'Increase monitoring frequency', detail: 'Shorten reporting intervals for emission-heavy processes while AQI remains elevated.' });
    city.push({ title: 'Monitor sensitive locations', detail: 'Track AQI near schools, hospitals, and eldercare facilities more closely.' });
  } else {
    citizens.push({ title: 'Enjoy normal outdoor activity', detail: 'Air quality is within a good/moderate range for typical outdoor plans.' });
    traffic.push({ title: 'No special traffic measures needed', detail: 'Current conditions do not warrant congestion mitigation action.' });
    industrial.push({ title: 'Maintain standard monitoring cadence', detail: 'Continue routine emission compliance checks.' });
    city.push({ title: 'No advisory needed', detail: 'Conditions are within typical ranges for public activity.' });
  }

  if (pm25 !== null && pm25 > 90) {
    citizens.push({ title: 'Reduce indoor combustion sources', detail: 'Avoid candles, incense, or indoor cooking smoke while PM2.5 is spiking.' });
  }
  if (hot) {
    citizens.push({ title: 'Stay hydrated and avoid peak sun', detail: 'Extreme heat combined with pollution increases health risk — limit midday outdoor exposure.' });
  }

  return { citizens, traffic, industrial, city };
}

const CATEGORIES = [
  { key: 'citizens' as const, label: 'Citizens', icon: User, color: '--color-accent' },
  { key: 'traffic' as const, label: 'Traffic Authorities', icon: Truck, color: '--color-accent-blue' },
  { key: 'industrial' as const, label: 'Industrial Authorities', icon: Factory, color: '--color-warning' },
  { key: 'city' as const, label: 'City Administration', icon: Building2, color: '--color-advanced' },
];

const ActionsPage: React.FC = () => {
  const { airQuality, weather, status } = useEnvironmentData();
  const { t } = useLanguage();

  const recs = useMemo(
    () => buildRecommendations(airQuality?.current.aqi ?? null, airQuality?.current.pm2_5 ?? null, weather?.current.temperature ?? null),
    [airQuality, weather]
  );

  if (status === 'LOADING' && !airQuality) {
    return (
      <div className="grid sm:grid-cols-2 gap-5">
        <CardSkeleton lines={4} />
        <CardSkeleton lines={4} />
      </div>
    );
  }

  if (!airQuality) {
    return (
      <Card>
        <EmptyState title={t('pages.actions.noRecommendations')} message="Recommendations will appear once environmental data loads for this location." />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Environmental Actions</h1>

      <Card className="border-[var(--color-accent-blue)]/30 bg-[var(--color-accent-blue)]/[0.04]">
        <div className="flex gap-2.5 items-start">
          <Info size={15} className="text-[var(--color-accent-blue)] mt-0.5 shrink-0" />
          <p className="text-sm text-[var(--color-text-secondary)]">
            These recommendations are decision-support suggestions generated from current conditions and general
            public-health guidance. They are informational only and are not connected to any official municipal
            authority system.
          </p>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-5">
        {CATEGORIES.map(({ key, label, icon: Icon, color }) => (
          <Card key={key}>
            <CardHeader title={label} icon={Icon} />
            <ul className="space-y-3">
              {recs[key].map((r) => (
                <li key={r.title} className="rounded-lg border border-[var(--color-panel-border)] p-3">
                  <p className="text-xs font-semibold" style={{ color: `var(${color})` }}>{r.title}</p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1 leading-relaxed">{r.detail}</p>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ActionsPage;
