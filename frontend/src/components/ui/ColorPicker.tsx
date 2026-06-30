import { useTranslation } from 'react-i18next';
import { ICON_COLORS } from '@/lib/iconColors';
import { Icon } from '@/components/ui/Icon';

interface ColorPickerProps {
  value?: string;
  onChange?: (color: string) => void;
  label?: string;
}

/**
 * Swatch picker for assigning a palette color to a Node or Category icon.
 * An empty string means "no color" (the default type/primary tint is used).
 */
export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const { t } = useTranslation();

  const ringClass = 'ring-2 ring-offset-2 ring-offset-dn-surface-low ring-dn-text-main';

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-dn-text-muted uppercase tracking-wider">
          {label}
        </label>
      )}

      <div className="flex flex-wrap gap-2.5 rounded-input bg-dn-surface-low p-3">
        {/* Default / no color */}
        <button
          type="button"
          title={t('colorPicker.default')}
          aria-label={t('colorPicker.default')}
          onClick={() => onChange?.('')}
          className={[
            'flex items-center justify-center w-8 h-8 rounded-full bg-dn-surface text-dn-text-muted transition-all active:scale-90',
            !value ? ringClass : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <Icon name="format_color_reset" className="text-base" />
        </button>

        {ICON_COLORS.map((c) => {
          const selected = value === c.key;
          return (
            <button
              key={c.key}
              type="button"
              title={c.key}
              aria-label={c.key}
              onClick={() => onChange?.(selected ? '' : c.key)}
              className={[
                `w-8 h-8 rounded-full ${c.swatchClass} transition-all active:scale-90`,
                selected ? ringClass : '',
              ]
                .filter(Boolean)
                .join(' ')}
            />
          );
        })}
      </div>
    </div>
  );
}
