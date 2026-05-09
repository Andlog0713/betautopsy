'use client';

import { Component, type ReactNode } from 'react';

// Minimal class-based React error boundary. Class component is the only
// API React exposes for componentDidCatch / getDerivedStateFromError —
// no functional equivalent exists. Used to wrap render-fragile subtrees
// (currently the activeReport view in /reports, which mounts AutopsyReport
// + recharts) so a render-time exception inside a chart or downstream
// component renders a recoverable fallback instead of unmounting the
// page and triggering React #310. Sentry still receives the original
// error via componentDidCatch → window.Sentry?.captureException.

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (err: Error) => void;
}

interface State {
  hasError: boolean;
}

interface SentryWindow {
  Sentry?: {
    captureException: (err: unknown) => void;
  };
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(err: Error): void {
    this.props.onError?.(err);
    if (typeof window !== 'undefined') {
      const sentry = (window as unknown as SentryWindow).Sentry;
      sentry?.captureException(err);
    }
  }

  private handleReset = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) return this.props.fallback;
      return (
        <div className="card p-6 text-center space-y-3">
          <p className="text-fg-bright">Something went wrong rendering this report.</p>
          <button
            onClick={this.handleReset}
            className="btn-secondary text-sm"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
