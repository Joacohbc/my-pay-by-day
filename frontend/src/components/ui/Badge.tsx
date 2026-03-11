import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'income' | 'expense' | 'neutral' | 'indigo' | 'gray';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  centered?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-dn-surface-low text-dn-text-muted',
  income: 'bg-dn-success/10 text-dn-success border border-dn-success/20',
  expense: 'bg-dn-error/10 text-dn-error border border-dn-error/20',
  neutral: 'bg-dn-tertiary/10 text-dn-tertiary border border-dn-tertiary/20',
  indigo: 'bg-dn-primary/10 text-dn-primary border border-dn-primary/20',
  gray: 'bg-white/5 text-dn-text-muted border border-white/10',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px] leading-3',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({ 
  children, 
  variant = 'default', 
  size = 'md',
  centered = false,
  className = '' 
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full font-medium whitespace-nowrap',
        centered ? 'justify-center text-center' : '',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}
