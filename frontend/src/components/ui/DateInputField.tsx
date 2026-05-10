import { forwardRef, useEffect, useRef, useState, useMemo } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import {
  DATE_FORMAT_OPTIONS,
  applyDateMask,
  formatIsoDate,
  getDateFormat,
  getMaskPlaceholder,
  isMaskComplete,
  onDateFormatChange,
  parseFormattedDate,
  setDateFormatId,
  type DateFormatOption,
} from '@/lib/utils/dateFormat';
import { getLocalizedTodayString } from '@/lib/format';

export interface DateInputFieldProps {
  label?: string;
  labelRight?: ReactNode;
  error?: string;
  hint?: string;
  id?: string;
  value?: string;
  onChange?: (event: { target: { value: string } }) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  name?: string;
}

function emitIsoChange(onChange: DateInputFieldProps['onChange'], iso: string) {
  if (!onChange) return;
  onChange({ target: { value: iso } });
}

export const DateInputField = forwardRef<HTMLInputElement, DateInputFieldProps>(
  (
    { label, labelRight, error, hint, id, value, onChange, min, max, disabled, readOnly, className = '', name },
    ref,
  ) => {
    const { t } = useTranslation();
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const internalDateRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [, forceTick] = useState(0);
    useEffect(() => onDateFormatChange(() => forceTick((n) => n + 1)), []);

    const formatOption = getDateFormat();
    const isInteractive = !disabled && !readOnly;

    const [typedValue, setTypedValue] = useState<string>(() =>
      value ? formatIsoDate(value, formatOption) : '',
    );
    const [isFormatMenuOpen, setIsFormatMenuOpen] = useState(false);
    const [hasInputError, setHasInputError] = useState(false);

    useEffect(() => {
      setTypedValue(value ? formatIsoDate(value, formatOption) : '');
      setHasInputError(false);
    }, [value, formatOption]);

    useEffect(() => {
      if (!isFormatMenuOpen) return;
      const handlePointer = (e: PointerEvent) => {
        if (!containerRef.current) return;
        if (!containerRef.current.contains(e.target as Node)) {
          setIsFormatMenuOpen(false);
        }
      };
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsFormatMenuOpen(false);
      };
      document.addEventListener('pointerdown', handlePointer);
      document.addEventListener('keydown', handleKey);
      return () => {
        document.removeEventListener('pointerdown', handlePointer);
        document.removeEventListener('keydown', handleKey);
      };
    }, [isFormatMenuOpen]);

    const todayPreview = useMemo(() => getLocalizedTodayString(), []);

    const baseInputClass = [
      'w-full bg-dn-surface-low rounded-input px-4 py-3 text-sm text-dn-text-main placeholder-dn-text-muted/50',
      'focus:outline-none focus:ring-2 focus:ring-dn-primary/30',
      'transition-colors border-none scheme-dark',
      error || hasInputError ? 'ring-2 ring-dn-error/50' : '',
      !isInteractive ? 'opacity-70 cursor-not-allowed bg-dn-surface-low border border-white/5' : '',
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

    const combinedRef = (el: HTMLInputElement | null) => {
      (internalDateRef as { current: HTMLInputElement | null }).current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) (ref as { current: HTMLInputElement | null }).current = el;
    };

    const openPicker = () => {
      if (!isInteractive) return;
      internalDateRef.current?.showPicker?.();
    };

    const handleNativePickerChange = (e: ChangeEvent<HTMLInputElement>) => {
      const iso = e.target.value;
      setTypedValue(iso ? formatIsoDate(iso, formatOption) : '');
      setHasInputError(false);
      emitIsoChange(onChange, iso);
    };

    const handleTypedChange = (e: ChangeEvent<HTMLInputElement>) => {
      const masked = applyDateMask(e.target.value, formatOption);
      setTypedValue(masked);
      setHasInputError(false);
      if (isMaskComplete(masked, formatOption)) {
        const iso = parseFormattedDate(masked, formatOption);
        if (iso) {
          emitIsoChange(onChange, iso);
          return;
        }
        setHasInputError(true);
      } else if (!masked && value) {
        emitIsoChange(onChange, '');
      }
    };

    const handleTypedBlur = () => {
      if (!typedValue) {
        if (value) emitIsoChange(onChange, '');
        setHasInputError(false);
        return;
      }
      const iso = parseFormattedDate(typedValue, formatOption);
      if (iso) {
        setTypedValue(formatIsoDate(iso, formatOption));
        setHasInputError(false);
        if (iso !== value) emitIsoChange(onChange, iso);
      } else {
        setHasInputError(true);
      }
    };

    const handlePickFormat = (opt: DateFormatOption) => {
      setDateFormatId(opt.id);
      setIsFormatMenuOpen(false);
    };

    const placeholder = getMaskPlaceholder(formatOption);
    const displayValue = value ? formatIsoDate(value, formatOption) : '';

    return (
      <div className="flex flex-col gap-1.5">
        {labelBlock}
        <div className="relative" ref={containerRef}>
          {formatOption.isNumeric ? (
            <input
              id={inputId}
              name={name}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={typedValue}
              onChange={handleTypedChange}
              onBlur={handleTypedBlur}
              placeholder={placeholder}
              disabled={disabled}
              readOnly={readOnly}
              className={[baseInputClass, 'pr-16'].join(' ')}
            />
          ) : (
            <div
              id={inputId}
              role="button"
              tabIndex={isInteractive ? 0 : -1}
              onClick={openPicker}
              onKeyDown={(e) => {
                if (!isInteractive) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openPicker();
                }
              }}
              title={displayValue || t('settings.dateTapToPick')}
              aria-label={displayValue || t('settings.dateTapToPick')}
              style={{ borderStyle: 'dashed', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.12)' }}
              className={[
                baseInputClass,
                'pr-16 px-3 cursor-pointer flex items-center min-w-0 text-xs',
                !isInteractive ? 'pointer-events-none' : '',
              ].filter(Boolean).join(' ')}
            >
              {displayValue
                ? <span className="truncate min-w-0 flex-1">{displayValue}</span>
                : <span className="text-dn-text-muted/60 italic truncate min-w-0 flex-1">{t('settings.dateTapToPick')}</span>
              }
            </div>
          )}
          <input
            ref={combinedRef}
            type="date"
            value={value ?? ''}
            onChange={handleNativePickerChange}
            disabled={disabled}
            readOnly={readOnly}
            min={min}
            max={max}
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
          />
          <button
            type="button"
            disabled={!isInteractive}
            onClick={() => setIsFormatMenuOpen((open) => !open)}
            aria-label={t('settings.dateFormat')}
            className="absolute right-8 top-1/2 -translate-y-1/2 text-dn-text-muted hover:text-dn-text-main transition-colors disabled:opacity-50"
          >
            <Icon name="tune" className="text-lg" />
          </button>
          <button
            type="button"
            disabled={!isInteractive}
            onClick={openPicker}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-dn-text-muted hover:text-dn-text-main transition-colors disabled:opacity-50"
          >
            <Icon name="calendar_today" className="text-lg" />
          </button>
          {isFormatMenuOpen && (
            <div className="absolute left-0 top-full mt-1 z-40 w-44 bg-dn-surface border border-white/5 rounded-input shadow-2xl overflow-hidden">
              <ul className="max-h-56 overflow-y-auto py-1 scrollbar-thin">
                {DATE_FORMAT_OPTIONS.map((opt) => {
                  const isSelected = opt.id === formatOption.id;
                  return (
                    <li key={opt.id}>
                      <button
                        type="button"
                        onClick={() => handlePickFormat(opt)}
                        className={[
                          'w-full text-left px-3 py-2 text-sm flex flex-col gap-0.5 hover:bg-white/5 transition-colors',
                          isSelected ? 'text-dn-primary' : 'text-dn-text-main',
                        ].join(' ')}
                      >
                        <span className="truncate">{formatIsoDate(todayPreview, opt)}</span>
                        <span className="font-mono text-[10px] text-dn-text-muted truncate">{opt.mask ?? opt.pattern}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
        {(error || hasInputError) && <p className="text-xs text-dn-error">{error ?? t('common.error')}</p>}
        {hint && !error && !hasInputError && <p className="text-xs text-dn-text-muted">{hint}</p>}
      </div>
    );
  },
);

DateInputField.displayName = 'DateInputField';
