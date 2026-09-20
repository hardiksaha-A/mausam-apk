import { tr } from '../../i18n/dynamic';
import React from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Bell, Settings as SettingsIcon, MapPin, Sun, Moon, Globe } from 'lucide-react';
import { LocationSearch } from './LocationSearch';
import { DataStatusBadge } from '../common/DataStatusBadge';
import { useAppLocation } from '../../context/LocationContext';
import { useEnvironmentData } from '../../context/EnvironmentDataContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { LANGUAGE_NAMES, type Language } from '../../i18n/translations';
import { timeAgo } from '../../utils/units';

export const Topbar: React.FC = () => {
  const { location } = useAppLocation();
  const { status, isRefreshing, lastUpdated, refresh, alerts } = useEnvironmentData();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const activeAlerts = alerts.filter((a) => a.status === 'Active');
  const otherLanguage: Language = language === 'en' ? 'hi' : 'en';

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-[var(--color-panel-border)] bg-[var(--color-bg-primary)]/85 backdrop-blur-md px-4 sm:px-6 h-16">
      <div className="flex items-center gap-2 min-w-0">
        <MapPin size={16} className="text-[var(--color-accent-teal)] shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate max-w-[140px] sm:max-w-[220px]">
            {location.city}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] truncate max-w-[140px] sm:max-w-[220px]">
            {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°
          </p>
        </div>
      </div>

      <div className="hidden md:block flex-1 max-w-md">
        <LocationSearch instanceId="desktop" />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <DataStatusBadge state={status} className="hidden sm:inline-flex" />
        <span className="hidden md:inline text-sm text-[var(--color-text-muted)]">
          {t('topbar.updated')} {timeAgo(lastUpdated)}
        </span>
        {/* Always-visible language switch — shows the OTHER language's
            name in its own script, so it's self-explanatory regardless
            of which language the person currently reads. */}
        <button
          onClick={() => setLanguage(otherLanguage)}
          aria-label={t('topbar.switchLanguage')}
          title={t('topbar.switchLanguage')}
          className="flex items-center gap-1.5 px-2.5 h-9 rounded-lg border border-[var(--color-panel-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/40 transition-colors text-sm font-medium"
        >
          <Globe size={15} />
          <span className="hidden sm:inline">{LANGUAGE_NAMES[otherLanguage]}</span>
        </button>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          aria-label={t('topbar.refresh')}
          title={t('topbar.refresh')}
          className="grid place-items-center size-9 rounded-lg border border-[var(--color-panel-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent-teal)] hover:border-[var(--color-accent-teal)]/40 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? t('topbar.switchToLight') : t('topbar.switchToDark')}
          title={theme === 'dark' ? t('topbar.switchToLight') : t('topbar.switchToDark')}
          className="relative grid place-items-center size-9 rounded-lg border border-[var(--color-panel-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/40 transition-colors overflow-hidden"
        >
          <Sun
            size={16}
            className={`absolute transition-all duration-300 ${theme === 'dark' ? 'opacity-0 -rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`}
          />
          <Moon
            size={16}
            className={`absolute transition-all duration-300 ${theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'}`}
          />
        </button>
        <Link
          to="/warnings"
          aria-label={tr(`${activeAlerts.length} active alerts`, `${activeAlerts.length} सक्रिय चेतावनियाँ`)}
          title={t('topbar.notifications')}
          className="relative grid place-items-center size-9 rounded-lg border border-[var(--color-panel-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-warning)] hover:border-[var(--color-warning)]/40 transition-colors"
        >
          <Bell size={16} />
          {activeAlerts.length > 0 && (
            <span className="absolute -top-1 -right-1 grid place-items-center size-4 rounded-full bg-[var(--color-critical)] text-white text-xs font-bold">
              {activeAlerts.length}
            </span>
          )}
        </Link>
        <Link
          to="/settings"
          aria-label={t('topbar.settings')}
          title={t('topbar.settings')}
          className="hidden sm:grid place-items-center size-9 rounded-lg border border-[var(--color-panel-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <SettingsIcon size={16} />
        </Link>
      </div>

      <div className="md:hidden w-full order-3">
        <LocationSearch instanceId="mobile" />
      </div>
    </header>
  );
};
