import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'income' | 'expense' | 'neutral' | 'indigo' | 'gray';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-dn-surface-low text-dn-text-muted',
  income: 'bg-dn-success/10 text-dn-success border border-dn-success/20',
  expense: 'bg-dn-error/10 text-dn-error border border-dn-error/20',
  neutral: 'bg-dn-tertiary/10 text-dn-tertiary border border-dn-tertiary/20',
  indigo: 'bg-dn-primary/10 text-dn-primary border border-dn-primary/20',
  gray: 'bg-white/5 text-dn-text-muted border border-white/10',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}
