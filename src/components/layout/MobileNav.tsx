import { tr } from '../../i18n/dynamic';
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Wind, Map as MapIcon, ShieldAlert, Menu, X, CloudSun, Cpu, LineChart, ListChecks, Settings, Leaf } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const BOTTOM_ITEMS = [
  { to: '/', key: 'mobileNav.home', icon: Home, end: true },
  { to: '/air-quality', key: 'mobileNav.aqi', icon: Wind, end: false },
  { to: '/pollution-map', key: 'mobileNav.map', icon: MapIcon, end: false },
  { to: '/warnings', key: 'mobileNav.alerts', icon: ShieldAlert, end: false },
] as const;

const MORE_ITEMS = [
  { to: '/weather', key: 'nav.weather', icon: CloudSun, end: false },
  { to: '/ai-predictions', key: 'nav.aiPredictions', icon: Cpu, end: false },
  { to: '/analytics', key: 'nav.analytics', icon: LineChart, end: false },
  { to: '/actions', key: 'nav.actions', icon: ListChecks, end: false },
  { to: '/settings', key: 'nav.settings', icon: Settings, end: false },
] as const;

export const MobileNav: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-5 border-t border-[var(--color-panel-border)] bg-[var(--color-bg-secondary)]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
        aria-label={tr('Primary navigation', 'मुख्य नेविगेशन')}
      >
        {BOTTOM_ITEMS.map(({ to, key, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
              }`
            }
          >
            <Icon size={19} />
            {t(key)}
          </NavLink>
        ))}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium text-[var(--color-text-muted)]"
          aria-label={tr('Open more navigation options', 'और विकल्प खोलें')}
        >
          <Menu size={19} />
          {t('mobileNav.more')}
        </button>
      </nav>

      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          <button
            className="absolute inset-0 bg-black/60 animate-fade-in"
            aria-label={tr('Close menu', 'मेनू बंद करें')}
            onClick={() => setDrawerOpen(false)}
          />
          <div className="animate-slide-up relative w-72 max-w-[85vw] h-full bg-[var(--color-bg-secondary)] border-l border-[var(--color-panel-border)] p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="grid place-items-center size-8 rounded-lg bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
                  <Leaf size={16} />
                </span>
                <p className="text-sm font-bold text-[var(--color-text-primary)]">Mausam</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} aria-label={tr('Close menu', 'मेनू बंद करें')} className="text-[var(--color-text-muted)]">
                <X size={20} />
              </button>
            </div>
            {[...BOTTOM_ITEMS, ...MORE_ITEMS].map(({ to, key, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setDrawerOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive ? 'bg-[var(--color-accent)]/12 text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-panel-hover)]'
                  }`
                }
              >
                <Icon size={17} />
                {t(key)}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
