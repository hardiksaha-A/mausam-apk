import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'mausam:theme';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function loadPreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    // ignore malformed/unavailable storage
  }
  // First launch on a phone-sized screen: default to the light sky look.
  if (typeof window !== 'undefined' && window.matchMedia?.('(max-width: 1023px)').matches) return 'light';
  return 'system';
}

function resolve(pref: ThemePreference): ResolvedTheme {
  return pref === 'system' ? getSystemTheme() : pref;
}

function applyToDocument(theme: ResolvedTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

interface ThemeContextValue {
  /** The user's stored choice — may be 'system'. */
  themePreference: ThemePreference;
  /** The actual light/dark value currently applied (system resolved). */
  theme: ResolvedTheme;
  setThemePreference: (pref: ThemePreference) => void;
  /** Convenience: flips between light and dark (leaves 'system' if that's active, resolving it first). */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(loadPreference);
  const [theme, setTheme] = useState<ResolvedTheme>(() => resolve(themePreference));

  // Keep the DOM + resolved theme in sync whenever the preference changes.
  useEffect(() => {
    const resolved = resolve(themePreference);
    setTheme(resolved);
    applyToDocument(resolved);
    try {
      localStorage.setItem(STORAGE_KEY, themePreference);
    } catch {
      // ignore write failures (private browsing, quota, etc.)
    }
  }, [themePreference]);

  // If following 'system', react live to OS-level theme changes.
  useEffect(() => {
    if (themePreference !== 'system' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => {
      const resolved = getSystemTheme();
      setTheme(resolved);
      applyToDocument(resolved);
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [themePreference]);

  const runThemeChange = useCallback((next: ThemePreference) => {
    // Use the View Transitions API for a smooth cross-fade where supported
    // (Chromium — covers the desktop app and Android). Falls back to an
    // instant swap elsewhere, which still animates via the CSS transition
    // on the color tokens themselves (see index.css).
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => void;
    };
    if (typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(() => setThemePreferenceState(next));
    } else {
      setThemePreferenceState(next);
    }
  }, []);

  const setThemePreference = useCallback(
    (pref: ThemePreference) => runThemeChange(pref),
    [runThemeChange]
  );

  const toggleTheme = useCallback(() => {
    const current = resolve(themePreference);
    runThemeChange(current === 'light' ? 'dark' : 'light');
  }, [themePreference, runThemeChange]);

  return (
    <ThemeContext.Provider value={{ themePreference, theme, setThemePreference, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
