import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
      {icon && (
        <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-dn-surface text-dn-text-muted">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <p className="text-base font-medium text-dn-text-main">{title}</p>
        {description && (
          <p className="text-sm text-dn-text-muted max-w-xs">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
