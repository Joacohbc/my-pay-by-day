import type { TextareaHTMLAttributes } from 'react';
import { forwardRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-dn-text-muted uppercase tracking-wider">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={3}
          className={[
            'w-full bg-dn-surface-low rounded-input px-4 py-3 text-sm text-dn-text-main placeholder-dn-text-muted/50 resize-none',
            'focus:outline-none focus:ring-2 focus:ring-dn-primary/30',
            'transition-colors border-none',
            error ? 'ring-2 ring-dn-error/50' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
        {error && <p className="text-xs text-dn-error">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
