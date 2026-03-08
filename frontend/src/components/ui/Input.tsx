import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-dn-text-muted uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'w-full bg-dn-surface-low rounded-input px-4 py-3 text-sm text-dn-text-main placeholder-dn-text-muted/50',
            'focus:outline-none focus:ring-2 focus:ring-dn-primary/30',
            'transition-colors border-none [color-scheme:dark]',
            error ? 'ring-2 ring-dn-error/50' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
        {error && <p className="text-xs text-dn-error">{error}</p>}
        {hint && !error && <p className="text-xs text-dn-text-muted">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
