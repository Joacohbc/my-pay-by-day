import { Component, type ErrorInfo, type ReactNode } from 'react';
import i18n from '@/lib/i18n';
import { reportReactError } from '@/lib/errorReporter';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

/**
 * Top-level boundary for unhandled render crashes. The Router's `RouteErrorBoundary` only catches
 * errors inside the router lifecycle; this catches everything rendered under it and reports the
 * React componentStack to Loki via the error reporter. The fallback reads translations from the
 * i18n instance directly (no hooks) so it renders even when the React tree is already broken.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportReactError(error, info.componentStack ?? '');
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        role="alert"
        className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center"
      >
        <h1 className="text-xl font-semibold">{i18n.t('errors.boundaryTitle')}</h1>
        <p className="max-w-md text-sm text-gray-500">{i18n.t('errors.boundaryMessage')}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {i18n.t('errors.boundaryReload')}
        </button>
      </div>
    );
  }
}
