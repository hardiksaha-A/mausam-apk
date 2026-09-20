import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { CountUp } from './CountUp';

interface StatCardProps {
  label: string;
  value: number;
  decimals?: number;
  unit?: string;
  icon: LucideIcon;
  colorVar?: string; // css var name e.g. --color-accent
  hint?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, decimals = 0, unit = '', icon: Icon, colorVar = '--color-accent-teal', hint }) => {
  return (
    <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-4 hover:bg-[var(--color-panel-hover)] transition-colors">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">{label}</span>
        <span className="grid place-items-center size-7 rounded-md" style={{ backgroundColor: `color-mix(in srgb, var(${colorVar}) 15%, transparent)`, color: `var(${colorVar})` }}>
          <Icon size={14} />
        </span>
      </div>
      <p className="text-2xl font-bold text-[var(--color-text-primary)] tabular-nums animate-count-pulse">
        <CountUp value={value} decimals={decimals} />
        {unit && <span className="text-sm font-medium text-[var(--color-text-muted)] ml-1">{unit}</span>}
      </p>
      {hint && <p className="text-[11px] text-[var(--color-text-muted)] mt-1">{hint}</p>}
    </div>
  );
};
