import React, { createContext, useCallback, useContext, useState } from 'react';
import { translations, type Language } from '../i18n/translations';

const STORAGE_KEY = 'mausam:language';
const SELECTED_FLAG_KEY = 'mausam:language-selected';

function detectSystemLanguage(): Language {
  if (typeof navigator === 'undefined') return 'en';
  const lang = navigator.language || (navigator as any).userLanguage || '';
  return lang.toLowerCase().startsWith('hi') ? 'hi' : 'en';
}

function loadLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'hi') return stored;
  } catch {
    // ignore
  }
  return detectSystemLanguage();
}

function loadHasSelected(): boolean {
  try {
    return localStorage.getItem(SELECTED_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Looks up a dot-path key like "nav.dashboard" in the given language's
 * dictionary, falling back to English (then the key itself) if missing —
 * so a partially-translated phase never shows a blank string. */
function lookup(lang: Language, key: TranslationKeyPath): string {
  const dict = translations[lang] as Record<string, unknown>;
  const fallbackDict = translations.en as Record<string, unknown>;
  const parts = key.split('.');

  const resolve = (dict: Record<string, unknown>): string | undefined => {
    let node: unknown = dict;
    for (const part of parts) {
      if (typeof node !== 'object' || node === null) return undefined;
      node = (node as Record<string, unknown>)[part];
    }
    return typeof node === 'string' ? node : undefined;
  };

  return resolve(dict) ?? resolve(fallbackDict) ?? key;
}

type TranslationKeyPath = string;

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  hasSelectedLanguage: boolean;
  t: (key: TranslationKeyPath) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(loadLanguage);
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState<boolean>(loadHasSelected);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    setHasSelectedLanguage(true);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      localStorage.setItem(SELECTED_FLAG_KEY, 'true');
    } catch {
      // ignore storage failures — choice just won't survive a restart
    }
  }, []);

  const t = useCallback((key: TranslationKeyPath) => lookup(language, key), [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, hasSelectedLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
