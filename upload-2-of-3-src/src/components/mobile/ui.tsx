import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { pushBackHandler } from '../../native/backStack';
import type { WeatherAnimationCategory } from '../../utils/weatherCodes';

export const TINTS = {
  blue: '#3b82f6',
  peach: '#f59e0b',
  green: '#22c55e',
  yellow: '#eab308',
  purple: '#8b5cf6',
  red: '#ef4444',
  teal: '#14b8a6',
} as const;
export type Tint = keyof typeof TINTS;

/** Rounded, softly tinted card — the building block of every phone screen. */
export const GlassCard: React.FC<{
  tint?: Tint;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
}> = ({ tint, className = '', children, onClick, ariaLabel }) => {
  const c = tint ? TINTS[tint] : null;
  const style: React.CSSProperties = c
    ? {
        background: `color-mix(in srgb, ${c} 9%, var(--color-panel))`,
        borderColor: `color-mix(in srgb, ${c} 26%, var(--color-panel-border))`,
      }
    : {};
  const cls = `rounded-3xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-4 shadow-[0_2px_14px_rgba(30,80,150,0.06)] ${className}`;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={ariaLabel} style={style} className={`${cls} text-left w-full active:scale-[0.985] transition-transform`}>
        {children}
      </button>
    );
  }
  return (
    <div style={style} className={cls} aria-label={ariaLabel}>
      {children}
    </div>
  );
};

/** Small rounded stat chip (icon + value), as used under the insight headline. */
export const StatPill: React.FC<{ icon: React.ReactNode; label: string; tone?: string }> = ({ icon, label, tone }) => (
  <span
    className="inline-flex items-center gap-1.5 rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 py-2 text-[15px] font-semibold text-[var(--color-text-primary)] whitespace-nowrap"
    style={tone ? { color: tone } : undefined}
  >
    {icon}
    {label}
  </span>
);

/** Full-width bottom sheet with backdrop. Closes on backdrop tap and Android Back. */
export const BottomSheet: React.FC<{ open: boolean; onClose: () => void; children: React.ReactNode; label: string }> = ({
  open, onClose, children, label,
}) => {
  useEffect(() => {
    if (!open) return;
    const remove = pushBackHandler(onClose);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      remove();
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end" role="dialog" aria-modal="true" aria-label={label}>
      <button className="absolute inset-0 bg-black/45 animate-fade-in" aria-label="Close" onClick={onClose} />
      <div
        className="animate-sheet-up relative w-full max-h-[90dvh] overflow-y-auto rounded-t-[28px] bg-[var(--color-bg-secondary)] border-t border-[var(--color-panel-border)] px-5 pt-3 shadow-2xl"
        style={{ paddingBottom: 'calc(var(--sab) + 20px)' }}
      >
        <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-[var(--color-panel-border)]" />
        {children}
      </div>
    </div>,
    document.body
  );
};

export const SheetCloseButton: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <button
    onClick={onClick}
    className="inline-flex items-center gap-2 rounded-2xl bg-white/70 px-4 h-11 text-base font-medium text-[#0b1b3b] backdrop-blur"
  >
    {label} <X size={18} />
  </button>
);

/** Circular progress ring with a centred value. */
export const ScoreRing: React.FC<{ value: number; color: string; size?: number; children?: React.ReactNode }> = ({
  value, color, size = 112, children,
}) => {
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeOpacity={0.18} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(100, value)) / 100)}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
};

const Cloud: React.FC<{ x?: number; y?: number; s?: number; fill?: string }> = ({ x = 0, y = 0, s = 1, fill = '#ffffff' }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill}>
    <circle cx="40" cy="62" r="22" />
    <circle cx="70" cy="46" r="30" />
    <circle cx="102" cy="62" r="22" />
    <rect x="28" y="62" width="88" height="22" rx="11" />
  </g>
);

/** Simple layered sun/moon/cloud/rain illustration for the home hero. */
export const SkyIllustration: React.FC<{ category: WeatherAnimationCategory; isDay: boolean; partly: boolean }> = ({
  category, isDay, partly,
}) => {
  const showSun = category === 'clear' || partly;
  return (
    <svg viewBox="0 0 170 130" className="w-full h-full" aria-hidden="true">
      <defs>
        <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd45a" />
          <stop offset="100%" stopColor="#ffb02e" />
        </radialGradient>
        <filter id="cloudShadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#1d4f9c" floodOpacity="0.22" />
        </filter>
      </defs>
      {showSun && isDay && (
        <>
          <circle cx="62" cy="46" r="40" fill="#ffffff" opacity="0.32" />
          <circle cx="62" cy="46" r="27" fill="url(#sunGlow)" />
        </>
      )}
      {showSun && !isDay && (
        <>
          <circle cx="62" cy="44" r="26" fill="#f4f1de" />
          <circle cx="72" cy="38" r="22" fill="#1b2f5b" opacity="0.9" />
        </>
      )}
      {category !== 'clear' || partly ? (
        <g filter="url(#cloudShadow)">
          <Cloud x={22} y={26} s={0.98} fill={category === 'rain' || category === 'thunderstorm' ? '#dfe7f2' : '#ffffff'} />
        </g>
      ) : null}
      {(category === 'rain' || category === 'thunderstorm') &&
        [50, 72, 94, 116].map((x, i) => (
          <line key={x} x1={x} y1={112 + (i % 2) * 4} x2={x - 6} y2={124 + (i % 2) * 4} stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />
        ))}
      {category === 'thunderstorm' && <polygon points="88,96 76,118 88,118 82,134 102,108 90,108" fill="#facc15" />}
      {category === 'snow' &&
        [52, 78, 104].map((x) => <circle key={x} cx={x} cy={118} r="4" fill="#ffffff" />)}
      {category === 'fog' &&
        [104, 116].map((y) => <rect key={y} x="30" y={y} width="96" height="6" rx="3" fill="#ffffff" opacity="0.75" />)}
    </svg>
  );
};
