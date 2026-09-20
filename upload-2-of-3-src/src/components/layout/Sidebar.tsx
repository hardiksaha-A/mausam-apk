import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, CloudSun, Wind, Map as MapIcon, Cpu, ShieldAlert, LineChart, ListChecks, Settings, Leaf } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const NAV_ITEMS = [
  { to: '/', key: 'nav.dashboard', icon: Home, end: true },
  { to: '/weather', key: 'nav.weather', icon: CloudSun, end: false },
  { to: '/air-quality', key: 'nav.airQuality', icon: Wind, end: false },
  { to: '/pollution-map', key: 'nav.pollutionMap', icon: MapIcon, end: false },
  { to: '/ai-predictions', key: 'nav.aiPredictions', icon: Cpu, end: false },
  { to: '/warnings', key: 'nav.warnings', icon: ShieldAlert, end: false },
  { to: '/analytics', key: 'nav.analytics', icon: LineChart, end: false },
  { to: '/actions', key: 'nav.actions', icon: ListChecks, end: false },
  { to: '/settings', key: 'nav.settings', icon: Settings, end: false },
] as const;

export const Sidebar: React.FC = () => {
  const { t } = useLanguage();
  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-[var(--color-panel-border)] bg-[var(--color-bg-secondary)]/60 backdrop-blur-sm h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-[var(--color-panel-border)]">
        <span className="grid place-items-center size-8 rounded-lg bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
          <Leaf size={18} />
        </span>
        <div>
          <p className="text-base font-bold tracking-wide text-[var(--color-text-primary)] leading-tight">Mausam</p>
          <p className="text-xs text-[var(--color-text-muted)] leading-tight">{t('brand.tagline')}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1" aria-label="Primary navigation">
        {NAV_ITEMS.map(({ to, key, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--color-accent)]/12 text-[var(--color-accent)] border border-[var(--color-accent)]/25'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-panel-hover)] hover:text-[var(--color-text-primary)] border border-transparent'
              }`
            }
          >
            <Icon size={17} />
            {t(key)}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-[var(--color-panel-border)] text-xs text-[var(--color-text-muted)]">
        {t('brand.footer')}
      </div>
    </aside>
  );
};
