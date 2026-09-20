import React, { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { MobileNav } from '../components/mobile/MobileNav';
import { useEnvironmentData } from '../context/EnvironmentDataContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { setSystemBarContent } from '../native/nativeInit';

const FORECAST_TABS = [
  { to: '/weather', key: 'nav.weather' },
  { to: '/air-quality', key: 'nav.airQuality' },
  { to: '/warnings', key: 'nav.warnings' },
  { to: '/ai-predictions', key: 'nav.aiPredictions' },
] as const;

const PROFILE_SUBPAGES = ['/settings', '/analytics', '/actions'];

export const MobileShell: React.FC = () => {
  const { pathname } = useLocation();
  const { refresh, isRefreshing } = useEnvironmentData();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isHome = pathname === '/';
  const pull = usePullToRefresh(refresh);

  useEffect(() => {
    document.documentElement.dataset.shell = 'mobile';
    return () => {
      delete document.documentElement.dataset.shell;
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  // Home's hero sets its own status-bar tone; every other screen follows the theme.
  useEffect(() => {
    if (!isHome) setSystemBarContent(theme === 'dark' ? 'light-content' : 'dark-content');
  }, [isHome, theme]);

  const showForecastTabs = FORECAST_TABS.some((x) => x.to === pathname);
  const showBack = PROFILE_SUBPAGES.includes(pathname);

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ paddingLeft: 'var(--sal)', paddingRight: 'var(--sar)' }}>
      {(pull > 0 || isRefreshing) && (
        <div
          className="fixed left-1/2 z-50 grid place-items-center size-10 rounded-full bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-lg text-[var(--color-brand)]"
          style={{ top: `calc(var(--sat) + ${isRefreshing ? 12 : Math.max(0, pull - 28)}px)`, transform: 'translateX(-50%)' }}
          aria-hidden="true"
        >
          <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} style={isRefreshing ? undefined : { transform: `rotate(${pull * 4}deg)` }} />
        </div>
      )}

      {!isHome && (
        <div className="sticky top-0 z-30 bg-[var(--color-bg-primary)]/92 backdrop-blur-md" style={{ paddingTop: 'var(--sat)' }}>
          {showBack && (
            <Link to="/profile" className="inline-flex items-center gap-1 h-12 px-3 text-base font-semibold text-[var(--color-brand)]">
              <ChevronLeft size={22} /> {t('m.nav.profile')}
            </Link>
          )}
          {showForecastTabs && (
            <div className="m-scroll-x px-4 py-2.5" data-no-pull role="tablist">
              {FORECAST_TABS.map((tab) => {
                const active = tab.to === pathname;
                return (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    role="tab"
                    aria-selected={active}
                    className={`shrink-0 h-10 px-4 inline-flex items-center rounded-full text-[15px] font-semibold border ${
                      active ? 'bg-[var(--color-brand)] border-[var(--color-brand)] text-white' : 'bg-[var(--color-panel)] border-[var(--color-panel-border)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    {t(tab.key)}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      <main
        key={pathname}
        className={`animate-fade-in flex-1 min-w-0 ${isHome ? '' : 'px-4 pt-2'}`}
        style={{
          paddingBottom: 'calc(88px + var(--sab))',
          paddingTop: !isHome && !showBack && !showForecastTabs ? 'calc(var(--sat) + 12px)' : undefined,
        }}
      >
        <Outlet />
      </main>

      <MobileNav />
    </div>
  );
};
