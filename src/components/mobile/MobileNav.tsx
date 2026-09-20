import { tr } from '../../i18n/dynamic';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bookmark, CloudSun, Home, Map as MapIcon, User } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const TABS = [
  { to: '/', key: 'm.nav.home', icon: Home, paths: ['/'] },
  { to: '/weather', key: 'm.nav.forecast', icon: CloudSun, paths: ['/weather', '/air-quality', '/warnings', '/ai-predictions'] },
  { to: '/pollution-map', key: 'm.nav.map', icon: MapIcon, paths: ['/pollution-map'] },
  { to: '/locations', key: 'm.nav.locations', icon: Bookmark, paths: ['/locations'] },
  { to: '/profile', key: 'm.nav.profile', icon: User, paths: ['/profile', '/settings', '/analytics', '/actions'] },
] as const;

export const MobileNav: React.FC = () => {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  return (
    <nav
      aria-label={tr('Primary navigation', 'मुख्य नेविगेशन')}
      className="fixed bottom-0 inset-x-0 z-40 grid grid-cols-5 border-t border-[var(--color-panel-border)] bg-[var(--color-bg-secondary)]/95 backdrop-blur-md"
      style={{ paddingBottom: 'var(--sab)' }}
    >
      {TABS.map(({ to, key, icon: Icon, paths }) => {
        const active = (paths as readonly string[]).includes(pathname);
        return (
          <Link key={to} to={to} aria-current={active ? 'page' : undefined} className="flex flex-col items-center justify-center gap-1 pt-2 pb-1.5 min-h-[64px]">
            <span className={`grid place-items-center h-8 w-16 rounded-full transition-colors ${active ? 'bg-[var(--color-brand)] text-white' : 'text-[var(--color-text-muted)]'}`}>
              <Icon size={22} />
            </span>
            <span className={`text-xs ${active ? 'font-bold text-[var(--color-brand)]' : 'font-medium text-[var(--color-text-muted)]'}`}>{t(key)}</span>
          </Link>
        );
      })}
    </nav>
  );
};
