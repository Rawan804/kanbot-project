import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Optional custom fallback. If omitted the default recovery UI is shown. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Class-based Error Boundary — React's only mechanism for catching render-time
 * errors in the component tree.
 *
 * Catches: errors thrown during render, in lifecycle methods, and in the
 * constructors of child components.
 *
 * Does NOT catch: async errors, event-handler errors, API errors. Those are
 * handled by try/catch, React Query's error state, or the router errorElement.
 *
 * Place this once around the router so it catches catastrophic render failures.
 * Route-level errors (thrown loaders, errorElement) are separate.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // In production you would forward this to a monitoring service (Sentry, etc.)
    // Never log sensitive payload data. The component stack is safe.
    console.error('[ErrorBoundary]', error.message, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return <DefaultErrorFallback error={error} reset={this.reset} />;
  }
}

function DefaultErrorFallback({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen min-h-[100dvh] flex-col items-center justify-center gap-4 bg-kanbot-background px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
        {/* Inline SVG: no icon library required */}
        <svg
          viewBox="0 0 24 24"
          className="h-7 w-7 text-red-500"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Something went wrong</h1>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          An unexpected error occurred. Try refreshing the page.
        </p>
        {/* Do not render error.message — it may contain internal details. */}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-kanbot-primary px-4 text-sm font-semibold text-white hover:bg-kanbot-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary focus-visible:ring-offset-2"
        >
          Try again
        </button>
        <a
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary focus-visible:ring-offset-2"
        >
          Go home
        </a>
      </div>
    </main>
  );
}
