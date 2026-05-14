import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';

export function RouteErrorBoundary() {
  const error = useRouteError();
  console.error('Route error:', error);

  let title = 'Unexpected Application Error!';
  let message = 'An unexpected error occurred.';

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    message = error.data?.message || 'The page you requested could not be found or an error occurred.';
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="min-h-screen bg-dn-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-dn-surface rounded-3xl border border-dn-border-divider p-6 shadow-xl">
        <ErrorState
          title={title}
          message={message}
          action={
            <Button onClick={() => window.location.href = '/'}>
              Go to Dashboard
            </Button>
          }
        />
      </div>
    </div>
  );
}
