import type { TextareaHTMLAttributes } from 'react';
import { forwardRef, useRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', containerClassName = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const innerRef = useRef<HTMLTextAreaElement>(null);

    return (
      <div className={['flex flex-col gap-1.5', containerClassName].filter(Boolean).join(' ')}>
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-dn-text-muted uppercase tracking-wider">
            {label}
          </label>
        )}
        <textarea
          ref={(el) => {
            (innerRef as { current: HTMLTextAreaElement | null }).current = el;
            if (typeof ref === 'function') ref(el);
            else if (ref) (ref as { current: HTMLTextAreaElement | null }).current = el;
          }}
          id={inputId}
          className={[
            'w-full bg-dn-surface-low rounded-input px-4 py-3 text-sm text-dn-text-main placeholder-dn-text-muted/50',
            'focus:outline-none focus:ring-2 focus:ring-dn-primary/30',
            'transition-colors border-none field-sizing-content min-h-max break-all',
            error ? 'ring-2 ring-dn-error/50' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')
          }
          {...props}
        />
        {error && <p className="text-xs text-dn-error">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
