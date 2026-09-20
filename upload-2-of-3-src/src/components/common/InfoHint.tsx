import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

export const InfoHint: React.FC<{ text: string; label?: string }> = ({ text, label }) => {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        aria-label={label ?? 'What does this mean?'}
        className="inline-flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        <HelpCircle size={14} />
      </button>
      {open && (
        <span className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-2 w-56 rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-panel)] shadow-lg p-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          {text}
        </span>
      )}
    </span>
  );
};
