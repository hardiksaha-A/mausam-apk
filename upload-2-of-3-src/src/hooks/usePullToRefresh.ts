import { useEffect, useRef, useState } from 'react';

/**
 * Pull down from the top of the page to refresh. Ignores gestures that start
 * on the map (so panning the map never triggers a refresh).
 */
export function usePullToRefresh(onRefresh: () => void, enabled = true): number {
  const [pull, setPull] = useState(0);
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const cb = useRef(onRefresh);
  cb.current = onRefresh;

  useEffect(() => {
    if (!enabled) return;
    const THRESHOLD = 72;

    const onStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (window.scrollY > 0 || target?.closest('.leaflet-container, [data-no-pull]')) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && window.scrollY <= 0) {
        pullRef.current = Math.min(dy * 0.5, 96);
        setPull(pullRef.current);
      } else if (pullRef.current !== 0) {
        pullRef.current = 0;
        setPull(0);
      }
    };
    const onEnd = () => {
      if (pullRef.current >= THRESHOLD * 0.5) cb.current();
      startY.current = null;
      pullRef.current = 0;
      setPull(0);
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [enabled]);

  return pull;
}
