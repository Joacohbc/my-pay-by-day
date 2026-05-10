import { forwardRef, useRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { formatDateInputDisplay, getDateInputPlaceholder } from '@/lib/format';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelRight?: ReactNode;
  error?: string;
  hint?: string;
}


export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, labelRight, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const internalDateRef = useRef<HTMLInputElement>(null);

    const baseInputClass = [
      'w-full bg-dn-surface-low rounded-input px-4 py-3 text-sm text-dn-text-main placeholder-dn-text-muted/50',
      'focus:outline-none focus:ring-2 focus:ring-dn-primary/30',
      'transition-colors border-none scheme-dark',
      error ? 'ring-2 ring-dn-error/50' : '',
      (props.disabled || props.readOnly) ? 'opacity-70 cursor-not-allowed bg-dn-surface-low border border-white/5' : '',
      className,
    ].filter(Boolean).join(' ');

    const labelBlock = (label || labelRight) && (
      <div className="flex items-center justify-between">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-dn-text-muted uppercase tracking-wider">
            {label}
          </label>
        )}
        {labelRight}
      </div>
    );

    if (props.type === 'date') {
      const { value, onChange, disabled, min, max } = props;

      const combinedRef = (el: HTMLInputElement | null) => {
        (internalDateRef as { current: HTMLInputElement | null }).current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) (ref as { current: HTMLInputElement | null }).current = el;
      };

      const displayValue = typeof value === 'string' ? formatDateInputDisplay(value) : '';

      return (
        <div className="flex flex-col gap-1.5">
          {labelBlock}
          <div className="relative">
            <div
              id={inputId}
              onClick={() => !disabled && internalDateRef.current?.showPicker()}
              className={[baseInputClass, 'pr-10 cursor-pointer flex items-center'].join(' ')}
            >
              {displayValue
                ? <span>{displayValue}</span>
                : <span className="text-dn-text-muted/50">{getDateInputPlaceholder()}</span>
              }
            </div>
            <input
              ref={combinedRef}
              type="date"
              value={value as string}
              onChange={onChange}
              disabled={disabled}
              min={min}
              max={max}
              className="sr-only"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => internalDateRef.current?.showPicker()}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dn-text-muted hover:text-dn-text-main transition-colors"
            >
              <Icon name="calendar_today" className="text-xl" />
            </button>
          </div>
          {error && <p className="text-xs text-dn-error">{error}</p>}
          {hint && !error && <p className="text-xs text-dn-text-muted">{hint}</p>}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1.5">
        {labelBlock}
        <input
          ref={ref}
          id={inputId}
          className={baseInputClass}
          {...props}
        />
        {error && <p className="text-xs text-dn-error">{error}</p>}
        {hint && !error && <p className="text-xs text-dn-text-muted">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
