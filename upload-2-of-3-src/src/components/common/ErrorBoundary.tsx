import React from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  message: string | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : 'An unexpected error occurred.' };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Mausam caught a rendering error:', error);
  }

  reset = () => this.setState({ hasError: false, message: null });

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center text-center py-14 px-4 gap-3 rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)]">
          <span className="grid place-items-center size-12 rounded-full bg-[var(--color-critical)]/10 text-[var(--color-critical)]">
            <AlertOctagon size={22} />
          </span>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            {this.props.fallbackTitle ?? 'This section failed to load'}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] max-w-sm">{this.state.message}</p>
          <button
            onClick={this.reset}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30 px-3.5 py-1.5 text-sm font-medium hover:bg-[var(--color-accent)]/25 transition-colors"
          >
            <RotateCcw size={14} /> Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
