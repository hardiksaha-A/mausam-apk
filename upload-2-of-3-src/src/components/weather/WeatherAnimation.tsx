import React, { useMemo } from 'react';
import { getWeatherAnimationCategory } from '../../utils/weatherCodes';

interface WeatherAnimationProps {
  code: number;
  isDay?: boolean;
  className?: string;
}

/**
 * A lightweight, purely decorative CSS-animated backdrop that reflects the
 * current weather condition — drifting clouds, falling rain/snow, a pulsing
 * sun, or rolling fog. Pure CSS transforms only (no JS animation loop, no
 * canvas) so it's cheap to run, and it automatically freezes under
 * prefers-reduced-motion via the sitewide rule in index.css.
 *
 * Purely decorative: aria-hidden, sits behind real content (z-index/position
 * handled by the parent), never intercepts clicks (pointer-events-none).
 */
export const WeatherAnimation: React.FC<WeatherAnimationProps> = ({ code, isDay = true, className = '' }) => {
  const category = getWeatherAnimationCategory(code);

  // Deterministic-but-varied positions/delays/durations for a natural feel,
  // memoized so they don't reshuffle on every re-render.
  const raindrops = useMemo(
    () => Array.from({ length: 22 }, (_, i) => ({
      left: (i * 4.6 + (i % 3) * 2) % 100,
      delay: (i % 7) * 0.25,
      duration: 0.7 + (i % 5) * 0.12,
    })),
    []
  );
  const snowflakes = useMemo(
    () => Array.from({ length: 18 }, (_, i) => ({
      left: (i * 5.6 + (i % 4) * 3) % 100,
      delay: (i % 6) * 0.6,
      duration: 4 + (i % 5) * 1.1,
      size: 3 + (i % 3),
    })),
    []
  );
  const clouds = useMemo(
    () => [
      { top: 8, scale: 1, opacity: 0.35, duration: 38, delay: 0 },
      { top: 22, scale: 0.7, opacity: 0.25, duration: 52, delay: -18 },
      { top: 2, scale: 0.55, opacity: 0.2, duration: 46, delay: -30 },
    ],
    []
  );

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
      {category === 'clear' && isDay && (
        <div
          className="absolute -top-6 right-8 size-28 rounded-full animate-sun-pulse"
          style={{ background: 'radial-gradient(circle, var(--color-warning) 0%, transparent 70%)' }}
        />
      )}

      {(category === 'cloudy' || category === 'rain' || category === 'thunderstorm') &&
        clouds.map((c, i) => (
          <div
            key={i}
            className="absolute animate-drift-cloud"
            style={{
              top: `${c.top}%`,
              width: 120 * c.scale,
              height: 40 * c.scale,
              opacity: c.opacity,
              animationDuration: `${c.duration}s`,
              animationDelay: `${c.delay}s`,
            }}
          >
            <div className="w-full h-full rounded-full bg-[var(--color-text-secondary)] blur-md" />
          </div>
        ))}

      {(category === 'rain' || category === 'thunderstorm') &&
        raindrops.map((d, i) => (
          <span
            key={i}
            className="absolute top-0 w-px h-4 rounded-full bg-[var(--color-accent-blue)] animate-fall-rain"
            style={{
              left: `${d.left}%`,
              animationDuration: `${d.duration}s`,
              animationDelay: `${d.delay}s`,
            }}
          />
        ))}

      {category === 'thunderstorm' && (
        <div className="absolute inset-0 bg-white animate-lightning-flash" />
      )}

      {category === 'snow' &&
        snowflakes.map((s, i) => (
          <span
            key={i}
            className="absolute top-0 rounded-full bg-[var(--color-text-primary)] animate-fall-snow"
            style={{
              left: `${s.left}%`,
              width: s.size,
              height: s.size,
              animationDuration: `${s.duration}s`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}

      {category === 'fog' && (
        <>
          {[20, 45, 70].map((top, i) => (
            <div
              key={i}
              className="absolute h-8 w-2/3 rounded-full bg-[var(--color-text-muted)] blur-xl animate-drift-fog"
              style={{ top: `${top}%`, animationDuration: `${10 + i * 3}s`, animationDelay: `${i * -3}s` }}
            />
          ))}
        </>
      )}
    </div>
  );
};
