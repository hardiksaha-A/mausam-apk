import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Droplets, Thermometer, Wind } from 'lucide-react';
import { useEnvironmentData } from '../../context/EnvironmentDataContext';
import { useAppLocation } from '../../context/LocationContext';
import { usePreferences } from '../../context/PreferencesContext';
import { useLanguage } from '../../context/LanguageContext';
import { usePersonaInsights } from '../../hooks/usePersonaInsights';
import { generalInsight } from '../../utils/generalInsight';
import { formatTemp, formatWind } from '../../utils/units';
import { pushBackHandler } from '../../native/backStack';
import { DataStatusBadge } from '../common/DataStatusBadge';
import { PersonaGuide } from '../common/PersonaGuide';
import { ALL_PERSONAS, GENERAL_ICON, PERSONA_ICONS } from './personaMeta';
import { SheetCloseButton, StatPill } from './ui';
import type { Persona } from '../../types';

/**
 * "SIH Demonstration Mode" — pick ONE persona and see the same real, live
 * weather turn into that persona's guidance. Picking a persona here really
 * sets it (so the home screen behind reflects it too).
 */
export const DemoSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { t } = useLanguage();
  const { preferences, setPersonas } = usePreferences();
  const { weather, airQuality, status } = useEnvironmentData();
  const { location } = useAppLocation();
  const { forPersona, guideFor } = usePersonaInsights();

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

  const current: Persona | null = preferences.personas[0] ?? null;
  const insight = weather ? (current ? forPersona(current) : null) : null;
  const general = weather && !current ? generalInsight(weather, airQuality) : null;
  const headline = insight?.headline ?? general?.headline ?? '';
  const detail = insight?.detail ?? general?.detail ?? '';
  const reason = insight?.reason ?? general?.reason ?? '';
  const Icon = current ? PERSONA_ICONS[current] : GENERAL_ICON;
  const title = current ? t(`persona.${current}.name`) : t('m.general');
  const c = weather?.current;

  const tile = (active: boolean) =>
    `flex flex-col items-center justify-center gap-2 rounded-2xl border h-[92px] px-1 text-[15px] font-medium text-center transition-colors ${
      active
        ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-semibold shadow-sm'
        : 'border-[var(--color-panel-border)] bg-[var(--color-panel)] text-[var(--color-text-primary)] active:bg-[var(--color-panel-hover)]'
    }`;

  return createPortal(
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-[var(--color-bg-primary)] animate-fade-in" role="dialog" aria-modal="true" aria-label={t('m.demo.title')}>
      <div className="relative px-5 pb-8 rounded-b-[32px]" style={{ background: 'linear-gradient(180deg,#4b9aee 0%,#87c1f7 60%,#dcecfb 100%)', paddingTop: 'calc(var(--sat) + 16px)' }}>
        <div className="flex justify-end">
          <SheetCloseButton onClick={onClose} label={t('m.demo.close')} />
        </div>
        <h1 className="mt-4 text-[30px] font-bold text-white leading-tight">{t('m.demo.title')}</h1>
        <p className="text-lg text-white/90 mt-1">{t('m.demo.subtitle')}</p>
      </div>

      <div className="px-5 mt-5 pb-10" style={{ paddingBottom: 'calc(var(--sab) + 32px)' }}>
        <div className="grid grid-cols-3 gap-3">
          <button className={tile(!current)} aria-pressed={!current} onClick={() => setPersonas([])}>
            <GENERAL_ICON size={28} />
            {t('m.general')}
          </button>
          {ALL_PERSONAS.map((p) => {
            const I = PERSONA_ICONS[p];
            const active = current === p;
            return (
              <button key={p} className={tile(active)} aria-pressed={active} onClick={() => setPersonas([p])}>
                <I size={28} />
                {t(`persona.${p}.name`)}
              </button>
            );
          })}
        </div>

        <div className="mt-5 rounded-3xl border border-[var(--color-brand)]/25 bg-[var(--color-brand-soft)] p-5">
          <div className="flex items-start gap-4">
            <span className="grid place-items-center size-16 rounded-full bg-[var(--color-brand)]/15 text-[var(--color-brand)] shrink-0"><Icon size={30} /></span>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dcfce7] px-2.5 py-1 text-xs font-semibold text-[#15803d]">
                <span className="size-2 rounded-full bg-[#16a34a]" /> {t('m.demo.live')}
              </span>
              <p className="mt-2 text-lg font-semibold text-[var(--color-brand)] flex items-center gap-1.5">{title} <ArrowRight size={16} /></p>
            </div>
          </div>
          {weather ? (
            <>
              <h2 className="mt-3 text-2xl leading-tight font-bold text-[var(--color-text-primary)]">{headline}</h2>
              <p className="mt-1.5 text-base text-[var(--color-text-secondary)] leading-snug">{detail}</p>
              {c && (
                <div className="flex flex-wrap gap-2 mt-4">
                  <StatPill icon={<Thermometer size={16} className="text-[var(--color-brand)]" />} label={formatTemp(c.temperature, preferences.units)} />
                  <StatPill icon={<Droplets size={16} className="text-[var(--color-brand)]" />} label={`${t('m.rain')} ${Math.round(c.precipitationProbability)}%`} />
                  <StatPill icon={<Wind size={16} className="text-[var(--color-brand)]" />} label={formatWind(c.windSpeed, preferences.units)} />
                </div>
              )}
              <p className="mt-4 text-sm text-[var(--color-text-muted)] leading-relaxed border-t border-[var(--color-brand)]/15 pt-3">{reason}</p>
              <PersonaGuide key={current ?? 'general'} items={guideFor(current)} defaultOpen />
            </>
          ) : (
            <div className="mt-4 skeleton h-24 rounded-2xl" />
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <DataStatusBadge state={status} />
          <span>{location.city} · {t('m.demo.note')}</span>
        </div>

        <button onClick={onClose} className="mt-5 w-full h-14 rounded-2xl bg-[var(--color-brand)] text-white font-semibold text-lg active:scale-[0.99] shadow-md">
          {t('m.demo.seeHome')}
        </button>
      </div>
    </div>,
    document.body
  );
};
