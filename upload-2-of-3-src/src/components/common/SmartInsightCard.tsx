import React, { useState } from 'react';
import { Heart, Activity, Plane, Users, Sprout, Waves, Info, Car, PartyPopper } from 'lucide-react';
import type { Persona } from '../../types';
import type { SmartInsight } from '../../utils/personaInsights';
import { useLanguage } from '../../context/LanguageContext';

const PERSONA_ICONS: Record<Persona, React.ElementType> = {
  health: Heart,
  fitness: Activity,
  travel: Plane,
  family: Users,
  agriculture: Sprout,
  marine: Waves,
  commuter: Car,
  eventPlanner: PartyPopper,
};

const TONE_STYLES: Record<SmartInsight['tone'], string> = {
  good: 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/[0.06]',
  moderate: 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/[0.06]',
  caution: 'border-[var(--color-critical)]/30 bg-[var(--color-critical)]/[0.06]',
  info: 'border-[var(--color-panel-border)] bg-[var(--color-panel-hover)]',
};

const TONE_ICON_COLOR: Record<SmartInsight['tone'], string> = {
  good: 'text-[var(--color-accent)]',
  moderate: 'text-[var(--color-warning)]',
  caution: 'text-[var(--color-critical)]',
  info: 'text-[var(--color-text-secondary)]',
};

export const SmartInsightCard: React.FC<{ insight: SmartInsight }> = ({ insight }) => {
  const [showWhy, setShowWhy] = useState(false);
  const { t } = useLanguage();
  const Icon = PERSONA_ICONS[insight.persona];

  return (
    <div className={`relative rounded-xl border p-4 transition-colors ${TONE_STYLES[insight.tone]}`}>
      <div className="flex items-start gap-3">
        <div className={`shrink-0 mt-0.5 ${TONE_ICON_COLOR[insight.tone]}`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">{insight.title}</p>
            <button
              onClick={() => setShowWhy((v) => !v)}
              aria-label={t('dashboard.whyAmISeeing')}
              className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <Info size={13} />
            </button>
          </div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)] mt-0.5 truncate">
            {insight.headline}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-snug">{insight.detail}</p>
          {insight.isEstimate && (
            <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-panel-border)]/60 text-[var(--color-text-muted)]">
              {t('dashboard.estimated')}
            </span>
          )}
        </div>
      </div>

      {showWhy && (
        <div className="mt-3 pt-3 border-t border-[var(--color-panel-border)] text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
          <span className="font-medium text-[var(--color-text-primary)]">{t('dashboard.whyAmISeeing')} </span>
          {insight.reason}
        </div>
      )}
    </div>
  );
};
