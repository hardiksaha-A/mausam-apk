import { useCallback, useEffect, useState } from 'react';
import type { SavedLocation } from '../types';

// Same key the desktop Travel card uses, so the choice is shared everywhere.
const KEY = 'mausam:travel-destination';

export function useTravelDestination(saved: SavedLocation[]): { destination: SavedLocation | null; setDestinationId: (id: string | null) => void } {
  const [id, setId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  });
  const destination = saved.find((s) => s.id === id) ?? null;

  useEffect(() => {
    try {
      if (destination) localStorage.setItem(KEY, destination.id);
      else localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  }, [destination]);

  const setDestinationId = useCallback((next: string | null) => setId(next), []);
  return { destination, setDestinationId };
}
