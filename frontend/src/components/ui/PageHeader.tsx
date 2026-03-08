import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, back = false, action }: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-2">
      <div className="flex items-center gap-3 min-w-0">
        {back && (
          <button
            onClick={() => navigate(-1)}
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-dn-surface-low text-dn-text-main hover:bg-dn-surface transition-colors"
          >
            <Icon name="arrow_back" className="text-[18px]" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-medium text-dn-text-main tracking-tight truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-dn-text-muted truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
