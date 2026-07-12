import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { AiFieldControls } from '@/components/ui/AiFieldControls';
import { DateInputField, type DateInputFieldProps } from '@/components/ui/DateInputField';
import type { AiFieldController } from '@/hooks/useAiFieldController';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelRight?: ReactNode;
  error?: string;
  hint?: string;
  ai?: AiFieldController;
}


export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, labelRight, error, hint, ai, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const labelRightContent = ai ? (
      <div className="flex items-center gap-1">
        <AiFieldControls controller={ai} />
        {labelRight}
      </div>
    ) : labelRight;

    if (props.type === 'date' || props.type === 'datetime-local') {
      const { value, onChange, disabled, readOnly, min, max, name } = props;
      return (
        <DateInputField
          ref={ref}
          id={inputId}
          name={name}
          label={label}
          labelRight={labelRightContent}
          error={error}
          hint={hint}
          className={className}
          value={typeof value === 'string' ? value : ''}
          onChange={onChange as unknown as DateInputFieldProps['onChange']}
          disabled={disabled}
          readOnly={readOnly}
          min={typeof min === 'string' ? min : undefined}
          max={typeof max === 'string' ? max : undefined}
          mode={props.type === 'datetime-local' ? 'datetime' : 'date'}
        />
      );
    }

    const baseInputClass = [
      'w-full bg-dn-surface-low rounded-input px-4 py-3 text-sm text-dn-text-main placeholder-dn-text-muted/50',
      'focus:outline-none focus:ring-2 focus:ring-dn-primary/30',
      'transition-colors border-none scheme-dark',
      error ? 'ring-2 ring-dn-error/50' : '',
      (props.disabled || props.readOnly) ? 'opacity-70 cursor-not-allowed bg-dn-surface-low border border-white/5' : '',
      className,
    ].filter(Boolean).join(' ');

    const labelBlock = (label || labelRightContent) && (
      <div className="flex items-center justify-between">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-dn-text-muted uppercase tracking-wider">
            {label}
          </label>
        )}
        {labelRightContent}
      </div>
    );

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
