import React from 'react';
import { Heart, Activity, Plane, Users, Sprout, Waves, Car, PartyPopper } from 'lucide-react';
import type { Persona } from '../../types';
import { usePreferences } from '../../context/PreferencesContext';
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

const ALL_PERSONAS: Persona[] = ['health', 'fitness', 'travel', 'family', 'agriculture', 'marine', 'commuter', 'eventPlanner'];

export const PersonaSelector: React.FC = () => {
  const { preferences, togglePersona } = usePreferences();
  const { t } = useLanguage();

  return (
    <div className="flex flex-wrap gap-2">
      {ALL_PERSONAS.map((persona) => {
        const Icon = PERSONA_ICONS[persona];
        const active = preferences.personas.includes(persona);
        return (
          <button
            key={persona}
            onClick={() => togglePersona(persona)}
            aria-pressed={active}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border transition-colors ${
              active
                ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                : 'border-[var(--color-panel-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-panel-hover)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <Icon size={16} />
            {t(`persona.${persona}.name`)}
          </button>
        );
      })}
    </div>
  );
};
