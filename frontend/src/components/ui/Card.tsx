import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: boolean;
}

export function Card({ children, padding = true, className = '', ...props }: CardProps) {
  return (
    <div
      className={[
        'bg-dn-surface rounded-card',
        padding ? 'p-5' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
