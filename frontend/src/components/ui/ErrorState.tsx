import type { ReactNode } from 'react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  action?: ReactNode;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  action,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
      <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-dn-error/10 text-dn-error">
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div className="space-y-1">
        <p className="text-base font-medium text-dn-text-main">{title}</p>
        {message && <p className="text-sm text-dn-text-muted max-w-xs">{message}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
