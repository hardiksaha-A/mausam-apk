import { ph } from '../../i18n/dynamic';
import React from 'react';
import { Radio, Database, Sparkles, TriangleAlert, Clock, WifiOff } from 'lucide-react';
import type { DataState } from '../../types';

const CONFIG: Record<DataState, { label: string; icon: React.ElementType; className: string }> = {
  LIVE: { label: 'Live', icon: Radio, className: 'text-[var(--color-accent)] bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30' },
  CACHED: { label: 'Cached', icon: Database, className: 'text-[var(--color-accent-blue)] bg-[var(--color-accent-blue)]/10 border-[var(--color-accent-blue)]/30' },
  FORECAST: { label: 'Forecast', icon: Sparkles, className: 'text-[var(--color-accent-blue)] bg-[var(--color-accent-blue)]/10 border-[var(--color-accent-blue)]/30' },
  ESTIMATED: { label: 'Estimated', icon: TriangleAlert, className: 'text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30' },
  SIMULATED: { label: 'Simulated', icon: Sparkles, className: 'text-[var(--color-advanced)] bg-[var(--color-advanced)]/10 border-[var(--color-advanced)]/30' },
  DEMO: { label: 'Demo Data', icon: Database, className: 'text-[var(--color-advanced)] bg-[var(--color-advanced)]/10 border-[var(--color-advanced)]/30' },
  ERROR: { label: 'Error', icon: WifiOff, className: 'text-[var(--color-critical)] bg-[var(--color-critical)]/10 border-[var(--color-critical)]/30' },
  STALE: { label: 'Stale', icon: Clock, className: 'text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30' },
  LOADING: { label: 'Loading', icon: Clock, className: 'text-[var(--color-text-muted)] bg-white/5 border-[var(--color-panel-border)]' },
};

export const DataStatusBadge: React.FC<{ state: DataState; className?: string }> = ({ state, className = '' }) => {
  const cfg = CONFIG[state];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${cfg.className} ${className}`}
    >
      <Icon size={11} />
      {ph(cfg.label)}
    </span>
  );
};
