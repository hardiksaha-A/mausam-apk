import React from 'react';
import { usePreferences } from '../../context/PreferencesContext';
import { useLanguage } from '../../context/LanguageContext';
import { ALL_PERSONAS, GENERAL_ICON, PERSONA_ICONS } from './personaMeta';

/**
 * Scrollable persona chips. "General" = no persona. Tapping a persona toggles
 * it (you can combine several; earlier picks weigh more — a small number
 * badge shows the order once more than one is selected).
 */
export const PersonaChips: React.FC = () => {
  const { preferences, togglePersona, setPersonas } = usePreferences();
  const { t } = useLanguage();
  const sel = preferences.personas;

  const chip = (active: boolean) =>
    `shrink-0 inline-flex items-center gap-1.5 h-11 px-4 rounded-full border text-[15px] font-medium transition-colors ${
      active
        ? 'bg-[var(--color-brand)] border-[var(--color-brand)] text-white shadow-sm'
        : 'bg-[var(--color-panel)]/80 border-[var(--color-panel-border)] text-[var(--color-text-primary)] active:bg-[var(--color-panel-hover)]'
    }`;

  return (
    <div className="m-scroll-x px-5 -mx-0 py-1" role="group" aria-label="Personas" data-no-pull>
      <button className={chip(sel.length === 0)} aria-pressed={sel.length === 0} onClick={() => setPersonas([])}>
        <GENERAL_ICON size={16} />
        {t('m.general')}
      </button>
      {ALL_PERSONAS.map((p) => {
        const Icon = PERSONA_ICONS[p];
        const idx = sel.indexOf(p);
        const active = idx >= 0;
        return (
          <button key={p} className={chip(active)} aria-pressed={active} onClick={() => togglePersona(p)}>
            <Icon size={16} />
            {t(`persona.${p}.name`)}
            {active && sel.length > 1 && (
              <span className="grid place-items-center size-5 rounded-full bg-white/25 text-xs font-bold">{idx + 1}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
