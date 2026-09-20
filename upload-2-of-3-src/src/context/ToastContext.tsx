import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const ICONS: Record<ToastKind, React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const COLORS: Record<ToastKind, string> = {
  success: 'text-[var(--color-accent)] border-[var(--color-accent)]/40',
  error: 'text-[var(--color-critical)] border-[var(--color-critical)]/40',
  info: 'text-[var(--color-accent-blue)] border-[var(--color-accent-blue)]/40',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed bottom-[calc(var(--sab,0px)+88px)] lg:bottom-4 right-4 z-[9999] flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))]"
        aria-live="polite"
        role="status"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <div
              key={t.id}
              className={`animate-fade-in flex items-start gap-2.5 rounded-xl border bg-[var(--color-panel)]/95 backdrop-blur px-4 py-3 shadow-lg ${COLORS[t.kind]}`}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <p className="text-sm text-[var(--color-text-primary)] flex-1">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
