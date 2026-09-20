import { tr } from '../../i18n/dynamic';
import React from 'react';
import { RefreshCw, Inbox, type LucideIcon } from 'lucide-react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => (
  <div className={`skeleton rounded-md ${className}`} aria-hidden="true" />
);

export const CardSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 space-y-3">
    <Skeleton className="h-4 w-1/3" />
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className="h-3 w-full" />
    ))}
  </div>
);

export const EmptyState: React.FC<{ icon?: LucideIcon; title: string; message: string; action?: React.ReactNode }> = ({
  icon: Icon = Inbox,
  title,
  message,
  action,
}) => (
  <div className="flex flex-col items-center justify-center text-center py-10 px-4 gap-2">
    <span className="grid place-items-center size-11 rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] mb-1">
      <Icon size={20} />
    </span>
    <p className="text-sm font-medium text-[var(--color-text-primary)]">{title}</p>
    <p className="text-xs text-[var(--color-text-muted)] max-w-xs">{message}</p>
    {action && <div className="mt-2">{action}</div>}
  </div>
);

export const ErrorState: React.FC<{ title?: string; message: string; onRetry?: () => void }> = ({
  title = tr('Something went wrong', 'कुछ ग़लत हो गया'),
  message,
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center text-center py-10 px-4 gap-2">
    <span className="grid place-items-center size-11 rounded-full bg-[var(--color-critical)]/10 text-[var(--color-critical)] mb-1">
      <RefreshCw size={20} />
    </span>
    <p className="text-sm font-medium text-[var(--color-text-primary)]">{title}</p>
    <p className="text-xs text-[var(--color-text-muted)] max-w-sm">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30 px-3.5 py-1.5 text-sm font-medium hover:bg-[var(--color-accent)]/25 transition-colors"
      >
        <RefreshCw size={14} /> Retry
      </button>
    )}
  </div>
);
