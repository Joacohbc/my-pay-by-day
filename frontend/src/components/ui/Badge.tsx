import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'income' | 'expense' | 'neutral' | 'indigo';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-zinc-800 text-zinc-300',
  income: 'bg-emerald-950 text-emerald-400 border border-emerald-800',
  expense: 'bg-rose-950 text-rose-400 border border-rose-800',
  neutral: 'bg-amber-950 text-amber-400 border border-amber-800',
  indigo: 'bg-indigo-950 text-indigo-400 border border-indigo-800',
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
