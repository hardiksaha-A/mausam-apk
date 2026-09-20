import React, { useState } from 'react';
import { BookOpen, ChevronDown, Info } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { bandFor, displayValue, rangeText, type Gauge, type GuideItem, type LT } from '../../utils/personaGuides';

const withUnit = (v: string, unit: string) => (!unit ? v : /^[°%/]/.test(unit) ? `${v}${unit}` : `${v} ${unit}`);

const GaugeBlock: React.FC<{ g: Gauge }> = ({ g }) => {
  const { language, t } = useLanguage();
  const [levels, setLevels] = useState(false);
  const L = (x: LT) => (language === 'hi' ? x.hi : x.en);
  const band = bandFor(g);
  const span = g.max - g.min;
  const segs = g.bands
    .map((bd, i) => {
      const lo = i === 0 ? g.min : Math.max(g.min, g.bands[i - 1].upTo);
      const hi = Math.min(g.max, bd.upTo);
      return { bd, w: (Math.max(0, hi - lo) / span) * 100 };
    })
    .filter((s) => s.w > 0);
  const pos = g.value === null ? null : Math.max(0, Math.min(100, ((g.value - g.min) / span) * 100));

  return (
    <div className="py-3.5 first:pt-1 border-t first:border-t-0 border-[var(--color-panel-border)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-semibold text-[var(--color-text-primary)] leading-snug">{L(g.label)}</p>
        <p className="text-lg font-bold text-[var(--color-text-primary)] tabular-nums whitespace-nowrap">
          {g.value === null ? '—' : withUnit(displayValue(g), g.unit)}
        </p>
      </div>

      {g.value !== null && (
        <>
          <div className="relative mt-3 mb-1" role="img" aria-label={band ? `${L(g.label)}: ${L(band.label)}` : L(g.label)}>
            <div className="flex h-3 rounded-full overflow-hidden">
              {segs.map((s) => (
                <span key={s.bd.upTo} style={{ width: `${s.w}%`, background: s.bd.color }} />
              ))}
            </div>
            {pos !== null && (
              <span
                className="absolute top-1/2 size-5 -translate-y-1/2 -translate-x-1/2 rounded-full border-[3px] border-white bg-[var(--color-text-primary)] shadow"
                style={{ left: `${pos}%` }}
              />
            )}
          </div>
          {band && (
            <div className="mt-3 rounded-2xl px-3.5 py-3 border-l-4" style={{ borderColor: band.color, background: `${band.color}1f` }}>
              <p className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <span className="size-2.5 rounded-full shrink-0" style={{ background: band.color }} />
                {t('m.guide.right')}: {L(band.label)}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1 leading-snug">{L(band.advice)}</p>
            </div>
          )}
        </>
      )}
      {g.value === null && <p className="text-sm text-[var(--color-text-muted)] mt-1">{t('m.guide.none')}</p>}

      <p className="text-sm text-[var(--color-text-secondary)] mt-2.5 leading-snug">{L(g.best)}</p>
      {g.note && <p className="text-xs text-[var(--color-text-muted)] mt-1.5 leading-snug flex gap-1.5"><Info size={13} className="shrink-0 mt-0.5" />{L(g.note)}</p>}

      <button
        onClick={() => setLevels((v) => !v)}
        aria-expanded={levels}
        className="mt-1.5 h-9 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-brand,var(--color-accent-teal))]"
      >
        {levels ? t('m.guide.hide') : t('m.guide.levels')}
        <ChevronDown size={15} className={levels ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>
      {levels && (
        <ul className="mt-1 space-y-2">
          {g.bands.map((bd, i) => (
            <li key={bd.upTo} className={`flex gap-2.5 rounded-xl p-2.5 ${band === bd ? 'bg-[var(--color-panel-hover)] ring-1 ring-[var(--color-panel-border)]' : ''}`}>
              <span className="mt-1 size-3 rounded-full shrink-0" style={{ background: bd.color }} />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[var(--color-text-primary)]">
                  {rangeText(g, i)}
                  {g.unit ? (/^[°%/]/.test(g.unit) ? g.unit : ` ${g.unit}`) : ''} · {L(bd.label)}
                </span>
                <span className="block text-xs text-[var(--color-text-secondary)] leading-snug">{L(bd.advice)}</span>
              </span>
            </li>
          ))}
          <li className="text-xs text-[var(--color-text-muted)] pl-1">{t('m.guide.scale')}: {L(g.source)}</li>
        </ul>
      )}
    </div>
  );
};

/** Collapsible "Know your numbers" panel: best value, current zone, what to do. */
export const PersonaGuide: React.FC<{ items: GuideItem[]; defaultOpen?: boolean }> = ({ items, defaultOpen = false }) => {
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(defaultOpen);
  const L = (x: LT) => (language === 'hi' ? x.hi : x.en);
  const gauges = items.filter((i): i is Gauge => i.kind === 'gauge');
  if (items.length === 0) return null;

  return (
    <div className="mt-3 rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)]">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="w-full flex items-center gap-2.5 px-3.5 min-h-[52px] text-left">
        <BookOpen size={18} className="text-[var(--color-brand,var(--color-accent-teal))] shrink-0" />
        <span className="flex-1 text-[15px] font-semibold text-[var(--color-text-primary)]">{t('m.guide.title')}</span>
        {!open && (
          <span className="flex items-center gap-1" aria-hidden="true">
            {gauges.map((g) => {
              const bd = bandFor(g);
              return <span key={g.id} className="size-3 rounded-full" style={{ background: bd?.color ?? 'var(--color-panel-border)' }} />;
            })}
          </span>
        )}
        <ChevronDown size={18} className={`text-[var(--color-text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-3.5 pb-3.5">
          {items.map((it) =>
            it.kind === 'gauge' ? (
              <GaugeBlock key={it.id} g={it} />
            ) : (
              <div key={it.id} className="py-3 border-t border-[var(--color-panel-border)]">
                <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">{L(it.label)}</p>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1 leading-snug">{L(it.text)}</p>
              </div>
            )
          )}
          <p className="text-xs text-[var(--color-text-muted)] pt-2 border-t border-[var(--color-panel-border)] leading-snug">{t('m.guide.disclaimer')}</p>
        </div>
      )}
    </div>
  );
};
