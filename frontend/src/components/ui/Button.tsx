import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-dn-primary text-dn-surface-low hover:brightness-110 active:scale-[0.98] disabled:opacity-50',
  secondary:
    'bg-dn-surface text-dn-text-main border border-white/5 hover:bg-dn-surface-low disabled:opacity-50',
  ghost:
    'bg-transparent text-dn-text-muted hover:bg-dn-surface hover:text-dn-text-main disabled:opacity-50',
  danger:
    'bg-dn-error/10 text-dn-error border border-dn-error/30 hover:bg-dn-error/20 active:scale-[0.98] disabled:opacity-50',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-4 py-2 text-xs rounded-pill',
  md: 'px-5 py-2.5 text-sm rounded-pill',
  lg: 'px-6 py-3.5 text-base rounded-pill',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      className = '',
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled ?? loading}
        className={[
          'inline-flex items-center justify-center gap-2 font-medium transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dn-primary/50',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth ? 'w-full' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
            <path
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              className="opacity-75"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
