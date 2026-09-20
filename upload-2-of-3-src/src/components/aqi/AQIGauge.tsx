import React from 'react';
import { AQI_COLORS } from '../../utils/aqi';
import type { AqiCategory } from '../../types';

interface AQIGaugeProps {
  aqi: number | null;
  category: AqiCategory;
  size?: number;
}

const MAX_AQI = 300;

export const AQIGauge: React.FC<AQIGaugeProps> = ({ aqi, category, size = 200 }) => {
  const radius = size / 2 - 14;
  const circumference = Math.PI * radius; // half circle
  const clamped = Math.min(MAX_AQI, Math.max(0, aqi ?? 0));
  const progress = aqi === null ? 0 : clamped / MAX_AQI;
  const color = AQI_COLORS[category];
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="flex flex-col items-center" role="img" aria-label={`Air Quality Index ${aqi ?? 'unavailable'}, ${category}`}>
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="var(--color-panel-border)"
          strokeWidth={14}
          strokeLinecap="round"
        />
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1), stroke 0.4s' }}
        />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={size * 0.22} fontWeight={700} fill="var(--color-text-primary)">
          {aqi ?? '—'}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize={size * 0.06} fill="var(--color-text-muted)">
          US AQI
        </text>
      </svg>
      <span
        className="mt-1 rounded-full px-3 py-1 text-xs font-semibold"
        style={{ backgroundColor: `${color}22`, color }}
      >
        {category}
      </span>
    </div>
  );
};
