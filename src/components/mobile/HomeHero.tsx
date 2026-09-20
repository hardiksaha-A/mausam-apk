import { cond } from '../../i18n/dynamic';
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Globe, MapPin, RefreshCw } from 'lucide-react';
import { useAppLocation } from '../../context/LocationContext';
import { useEnvironmentData } from '../../context/EnvironmentDataContext';
import { usePreferences } from '../../context/PreferencesContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { LANGUAGE_NAMES, type Language } from '../../i18n/translations';
import { DataStatusBadge } from '../common/DataStatusBadge';
import { WeatherAnimation } from '../weather/WeatherAnimation';
import { SkyIllustration } from './ui';
import { setSystemBarContent } from '../../native/nativeInit';
import { getWeatherAnimationCategory } from '../../utils/weatherCodes';
import { dayPart, localHour } from '../../utils/time';
import { timeAgo } from '../../utils/units';

function skyGradient(category: ReturnType<typeof getWeatherAnimationCategory>, isDay: boolean, code: number): { bg: string; dark: boolean } {
  if (!isDay) return { bg: 'linear-gradient(180deg,#0a1836 0%,#173563 55%,#2c4f86 100%)', dark: true };
  switch (category) {
    case 'thunderstorm':
      return { bg: 'linear-gradient(180deg,#4a5d7a 0%,#7387a3 55%,#a9b8cb 100%)', dark: true };
    case 'rain':
      return { bg: 'linear-gradient(180deg,#647f9e 0%,#96abc3 55%,#cfd9e6 100%)', dark: false };
    case 'snow':
      return { bg: 'linear-gradient(180deg,#a3bad6 0%,#cfdcec 55%,#eef3f9 100%)', dark: false };
    case 'fog':
      return { bg: 'linear-gradient(180deg,#aab8c7 0%,#ccd6df 55%,#eceff2 100%)', dark: false };
    case 'cloudy':
      return code === 3
        ? { bg: 'linear-gradient(180deg,#8fa9c7 0%,#c0d0e2 55%,#e6edf5 100%)', dark: false }
        : { bg: 'linear-gradient(180deg,#63a6f0 0%,#a6cdf6 55%,#e0edfa 100%)', dark: false };
    default:
      return { bg: 'linear-gradient(180deg,#4b9aee 0%,#87c1f7 55%,#dcecfb 100%)', dark: false };
  }
}

const GlassButton: React.FC<{ label: string; onClick?: () => void; to?: string; children: React.ReactNode; dark: boolean }> = ({
  label, onClick, to, children, dark,
}) => {
  const cls = `relative grid place-items-center size-10 rounded-full backdrop-blur-md active:scale-95 transition-transform ${
    dark ? 'bg-white/15 text-white' : 'bg-white/55 text-[#0b1b3b]'
  }`;
  return to ? (
    <Link to={to} aria-label={label} title={label} className={cls}>{children}</Link>
  ) : (
    <button onClick={onClick} aria-label={label} title={label} className={cls}>{children}</button>
  );
};

export const HomeHero: React.FC = () => {
  const navigate = useNavigate();
  const { location } = useAppLocation();
  const { weather, status, isRefreshing, lastUpdated, refresh, alerts } = useEnvironmentData();
  const { preferences } = usePreferences();
  const { language, setLanguage, t } = useLanguage();
  const { theme } = useTheme();

  const cur = weather?.current;
  const category = cur ? getWeatherAnimationCategory(cur.weatherCode) : 'clear';
  const isDay = cur?.isDay ?? true;
  const { bg, dark } = skyGradient(category, isDay, cur?.weatherCode ?? 0);
  const activeAlerts = alerts.filter((a) => a.status === 'Active').length;
  const other: Language = language === 'en' ? 'hi' : 'en';
  const part = dayPart(weather ? localHour(weather.timezone) : new Date().getHours());
  const name = preferences.profile.name.trim();
  const temp = cur ? (preferences.units === 'imperial' ? Math.round((cur.temperature * 9) / 5 + 32) : Math.round(cur.temperature)) : null;
  const feels = cur ? (preferences.units === 'imperial' ? Math.round((cur.feelsLike * 9) / 5 + 32) : Math.round(cur.feelsLike)) : null;
  const place = [location.city, location.state].filter(Boolean).join(', ');
  const fg = dark ? 'text-white' : 'text-[#0b1b3b]';
  const fgSoft = dark ? 'text-white/80' : 'text-[#0b1b3b]/75';

  // Status-bar icons must contrast with the sky behind them.
  useEffect(() => {
    setSystemBarContent(dark ? 'light-content' : 'dark-content');
    return () => setSystemBarContent(theme === 'dark' ? 'light-content' : 'dark-content');
  }, [dark, theme]);

  return (
    <header className="relative overflow-hidden" style={{ background: bg, paddingTop: 'calc(var(--sat) + 14px)' }}>
      {cur && (category === 'rain' || category === 'thunderstorm' || category === 'snow' || category === 'fog') && (
        // The animation is tinted with theme text colors (dark navy on the light
        // skin); on a sky backdrop we want soft white clouds/flakes instead.
        <div style={{ '--color-text-secondary': '#ffffff', '--color-text-primary': '#ffffff' } as React.CSSProperties}>
          <WeatherAnimation code={cur.weatherCode} isDay={cur.isDay} />
        </div>
      )}
      <div className="relative px-5 pb-12">
        <div className="flex items-start justify-between gap-3">
          <div className={`min-w-0 ${fg}`}>
            <h1 className="text-2xl font-bold leading-tight line-clamp-2">
              {t(`m.greeting.${part}`)}
              {name ? `, ${name.split(' ')[0]}` : ''}
            </h1>
            <button onClick={() => navigate('/locations')} className={`mt-1 flex items-center gap-1.5 text-base font-medium ${fgSoft} max-w-full`}>
              <MapPin size={16} className="shrink-0" />
              <span className="truncate">{place || location.displayName}</span>
            </button>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <GlassButton dark={dark} label={t('m.switchLang')} onClick={() => setLanguage(other)}>
              <Globe size={19} />
              <span className="sr-only">{LANGUAGE_NAMES[other]}</span>
            </GlassButton>
            <GlassButton dark={dark} label={t('m.refresh')} onClick={refresh}>
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
            </GlassButton>
            <GlassButton dark={dark} label={`${activeAlerts} ${t('m.alertsLabel')}`} to="/warnings">
              <Bell size={19} />
              {activeAlerts > 0 && (
                <span className="absolute -top-0.5 -right-0.5 grid place-items-center min-w-5 h-5 px-1 rounded-full bg-[#ef4444] text-white text-xs font-bold">
                  {activeAlerts}
                </span>
              )}
            </GlassButton>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className={`min-w-0 ${fg}`}>
            {cur ? (
              <>
                <p className="text-[84px] leading-[0.95] font-normal tabular-nums tracking-tight">{temp}°</p>
                <p className={`mt-2 text-lg font-medium ${fgSoft}`}>
                  {cond(cur.condition)} · {t('dashboard.feelsLike')} {feels}°
                </p>
              </>
            ) : (
              <div className="space-y-3">
                <div className="skeleton h-20 w-36 rounded-2xl" />
                <div className="skeleton h-5 w-44 rounded" />
              </div>
            )}
          </div>
          <div className="w-[150px] h-[116px] shrink-0 -mr-1">
            {cur && <SkyIllustration category={category} isDay={isDay} partly={cur.weatherCode === 1 || cur.weatherCode === 2} />}
          </div>
        </div>

        <div className={`mt-3 flex items-center gap-2 text-sm ${fgSoft}`}>
          <DataStatusBadge state={status} />
          <span>
            {t('m.updated')} {timeAgo(lastUpdated)}
          </span>
        </div>
      </div>
      {/* soft fade into the page background */}
      <div className="absolute inset-x-0 bottom-0 h-10 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, var(--color-bg-primary))' }} />
    </header>
  );
};
