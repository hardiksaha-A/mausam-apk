import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Eye, EyeOff, GripVertical, RefreshCw, User } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { DEFAULT_ORDER, type HomeCardId } from '../../hooks/useHomeLayout';
import { BottomSheet } from './ui';
import { HOME_CARD_META } from './HomeCards';

interface Props {
  open: boolean;
  onClose: () => void;
  order: HomeCardId[];
  hidden: HomeCardId[];
  onSave: (order: HomeCardId[], hidden: HomeCardId[]) => void;
  onChangePersona: () => void;
  onReset: () => void;
}

const ROW_GAP = 8;

export const CustomizeSheet: React.FC<Props> = ({ open, onClose, order, hidden, onSave, onChangePersona, onReset }) => {
  const { t } = useLanguage();
  const [draft, setDraft] = useState<HomeCardId[]>(order);
  const [draftHidden, setDraftHidden] = useState<HomeCardId[]>(hidden);
  const [dragging, setDragging] = useState<HomeCardId | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    if (open) {
      setDraft(order);
      setDraftHidden(hidden);
    }
    // only re-seed when the sheet opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const move = useCallback((id: HomeCardId, toIndex: number) => {
    setDraft((prev) => {
      const from = prev.indexOf(id);
      if (from < 0 || from === toIndex) return prev;
      const next = [...prev];
      next.splice(from, 1);
      next.splice(Math.max(0, Math.min(next.length, toIndex)), 0, id);
      return next;
    });
  }, []);

  // Pointer-based drag (works for touch and mouse). Listeners live on the
  // document so the drag survives the row being re-ordered under the finger.
  const startDrag = (id: HomeCardId) => (e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(id);
    const onMove = (ev: PointerEvent) => {
      const list = listRef.current;
      if (!list) return;
      const first = list.children[0] as HTMLElement | undefined;
      if (!first) return;
      const rowH = first.getBoundingClientRect().height + ROW_GAP;
      const top = list.getBoundingClientRect().top;
      const idx = Math.max(0, Math.min(draftRef.current.length - 1, Math.floor((ev.clientY - top) / rowH)));
      move(id, idx);
    };
    const onUp = () => {
      setDragging(null);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  };

  const toggleHidden = (id: HomeCardId) =>
    setDraftHidden((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const save = () => {
    // Guard against stale ids, keep every known card present exactly once.
    const clean = [...draft.filter((id) => DEFAULT_ORDER.includes(id))];
    DEFAULT_ORDER.forEach((id) => { if (!clean.includes(id)) clean.push(id); });
    onSave(clean, draftHidden);
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} label={t('m.customize.title')}>
      <h2 className="text-[22px] font-bold text-[var(--color-text-primary)]">{t('m.customize.title')}</h2>
      <p className="text-[15px] text-[var(--color-text-secondary)] mt-1 mb-4">{t('m.customize.hint')}</p>

      <ul ref={listRef} className="flex flex-col" style={{ gap: ROW_GAP }}>
        {draft.map((id, i) => {
          const meta = HOME_CARD_META[id];
          const Icon = meta.icon;
          const isHidden = draftHidden.includes(id);
          return (
            <li
              key={id}
              className={`flex items-center gap-3 h-14 rounded-2xl border px-3 bg-[var(--color-panel)] ${
                dragging === id ? 'border-[var(--color-brand)] shadow-lg scale-[1.02] relative z-10' : 'border-[var(--color-panel-border)]'
              } ${isHidden ? 'opacity-55' : ''}`}
            >
              <button
                onPointerDown={startDrag(id)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') { e.preventDefault(); move(id, i - 1); }
                  if (e.key === 'ArrowDown') { e.preventDefault(); move(id, i + 1); }
                }}
                aria-label={`Reorder ${t(meta.labelKey)}`}
                className="grid place-items-center size-10 text-[var(--color-text-muted)] cursor-grab active:cursor-grabbing"
                style={{ touchAction: 'none' }}
              >
                <GripVertical size={20} />
              </button>
              <Icon size={20} className="text-[var(--color-text-secondary)] shrink-0" />
              <span className="flex-1 text-base font-medium text-[var(--color-text-primary)] truncate">{t(meta.labelKey)}</span>
              <button
                onClick={() => toggleHidden(id)}
                aria-label={isHidden ? 'Show card' : 'Hide card'}
                aria-pressed={!isHidden}
                className="grid place-items-center size-11 text-[var(--color-brand)]"
              >
                {isHidden ? <EyeOff size={22} className="text-[var(--color-text-muted)]" /> : <Eye size={22} />}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="grid grid-cols-2 gap-3 mt-5">
        <button onClick={() => { onClose(); onChangePersona(); }} className="h-14 rounded-2xl bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-semibold text-[15px] inline-flex items-center justify-center gap-2 active:scale-[0.98]">
          <User size={18} /> {t('m.customize.changePersona')}
        </button>
        <button onClick={() => { onReset(); onClose(); }} className="h-14 rounded-2xl bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-semibold text-[15px] inline-flex items-center justify-center gap-2 active:scale-[0.98]">
          <RefreshCw size={18} /> {t('m.customize.reset')}
        </button>
      </div>
      <button onClick={save} className="mt-3 w-full h-14 rounded-2xl bg-[var(--color-brand)] text-white font-semibold text-lg inline-flex items-center justify-center gap-2 active:scale-[0.99] shadow-md">
        <Check size={22} /> {t('m.customize.save')}
      </button>
    </BottomSheet>
  );
};
