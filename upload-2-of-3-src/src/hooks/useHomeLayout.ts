import { useCallback, useMemo, useState } from 'react';
import type { Persona } from '../types';

export type HomeCardId =
  | 'insight' | 'alerts' | 'sun' | 'score' | 'hourly' | 'wind' | 'uv'
  | 'daily' | 'aqi' | 'saved' | 'humidity' | 'visibility' | 'outlook';

/** Cards that sit two-across; everything else is full width. */
export const HALF_WIDTH: ReadonlySet<HomeCardId> = new Set<HomeCardId>(['sun', 'score', 'wind', 'uv', 'humidity', 'visibility']);

export const DEFAULT_ORDER: HomeCardId[] = [
  'insight', 'alerts', 'sun', 'score', 'hourly', 'wind', 'uv', 'daily', 'aqi', 'saved', 'humidity', 'visibility', 'outlook',
];

// Most relevant cards per persona, best first. Same blending idea as the
// desktop dashboard: every selected persona votes, earlier picks weigh more.
const PERSONA_PRIORITY: Record<Persona, HomeCardId[]> = {
  health: ['aqi', 'uv', 'alerts', 'humidity'],
  fitness: ['score', 'sun', 'hourly', 'wind', 'uv'],
  travel: ['saved', 'daily', 'alerts'],
  family: ['alerts', 'hourly', 'uv', 'aqi'],
  agriculture: ['daily', 'humidity', 'sun', 'wind'],
  marine: ['wind', 'uv', 'sun', 'hourly'],
  commuter: ['alerts', 'hourly', 'visibility', 'wind'],
  eventPlanner: ['daily', 'hourly', 'score', 'wind'],
};

export function blendedOrder(personas: Persona[]): HomeCardId[] {
  const score: Record<string, number> = {};
  DEFAULT_ORDER.forEach((id, i) => (score[id] = i));
  personas.forEach((p, pi) => {
    const weight = 1 / (pi + 1);
    PERSONA_PRIORITY[p]?.forEach((id, rank) => {
      score[id] -= (6 - rank) * weight * 1.6;
    });
  });
  const rest = DEFAULT_ORDER.filter((id) => id !== 'insight').sort((a, b) => score[a] - score[b]);
  return ['insight', ...rest]; // the personalized insight always leads
}

interface StoredLayout {
  custom: HomeCardId[] | null;
  hidden: HomeCardId[];
}

const KEY = 'mausam:home-layout';

function load(): StoredLayout {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<StoredLayout>;
      const valid = (a: unknown): HomeCardId[] =>
        Array.isArray(a) ? (a.filter((x) => DEFAULT_ORDER.includes(x as HomeCardId)) as HomeCardId[]) : [];
      return { custom: p.custom ? valid(p.custom) : null, hidden: valid(p.hidden) };
    }
  } catch {
    // ignore
  }
  return { custom: null, hidden: [] };
}

export function useHomeLayout(personas: Persona[]) {
  const [stored, setStored] = useState<StoredLayout>(load);

  const persist = useCallback((next: StoredLayout) => {
    setStored(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const order = useMemo<HomeCardId[]>(() => {
    if (stored.custom) {
      // Keep the user's order, and append any card added in a later app version.
      const missing = DEFAULT_ORDER.filter((id) => !stored.custom!.includes(id));
      return [...stored.custom, ...missing];
    }
    return blendedOrder(personas);
  }, [stored.custom, personas]);

  const save = useCallback((newOrder: HomeCardId[], hidden: HomeCardId[]) => persist({ custom: newOrder, hidden }), [persist]);
  const reset = useCallback(() => persist({ custom: null, hidden: [] }), [persist]);

  return { order, hidden: stored.hidden, isCustom: stored.custom !== null, save, reset };
}
