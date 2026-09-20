import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { LANGUAGE_NAMES, type Language } from '../i18n/translations';

const OPTIONS: Language[] = ['en', 'hi'];

/**
 * Deliberately minimal: no instructional text in any single language,
 * since the entire point is that someone who reads only Hindi (or only
 * English) shouldn't need to read the *other* language first just to
 * find their own. Each option is shown in its own script — the
 * universal convention used by phones, ATMs, and government portals.
 */
export const LanguagePicker: React.FC = () => {
  const { setLanguage } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] p-4">
      <div className="w-full max-w-sm text-center">
        <span className="inline-grid place-items-center size-14 rounded-2xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] mb-6">
          <Globe size={28} />
        </span>
        <div className="space-y-3">
          {OPTIONS.map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className="w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] py-4 text-xl font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-panel-hover)] transition-colors"
            >
              {LANGUAGE_NAMES[lang]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
