import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';

const PRESET_COLORS = [
  '#F2B8B5', // Coral Red
  '#FDBA74', // Soft Orange / Peach
  '#F0D697', // Soft Yellow / Gold
  '#BBDCC0', // Sage Green
  '#A7F3D0', // Mint / Cool Green
  '#99F6E4', // Soft Teal
  '#7DD3FC', // Sky Blue
  '#C7D2FE', // Soft Indigo
  '#D0BCFF', // Lavender / Purple
  '#F5D0FE', // Fuchsia / Light Violet
  '#EFB8C8', // Rose Pink
  '#FB7185', // Soft Rose
  '#CCC2DC', // Muted Lilac
  '#CBD5E1', // Slate Grey
] as const;

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

interface ColorPickerProps {
  value?: string;
  onChange?: (color: string) => void;
  label?: string;
  error?: string;
}

export function ColorPicker({ value, onChange, label, error }: ColorPickerProps) {
  const { t } = useTranslation();

  const normalizedValue = value ?? '';
  const customValue = HEX_PATTERN.test(normalizedValue) ? normalizedValue : '#D0BCFF';

  const handleSelect = (color: string) => {
    onChange?.(normalizedValue.toLowerCase() === color.toLowerCase() ? '' : color);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-dn-text-muted uppercase tracking-wider">
          {label}
        </label>
      )}

      <div
        className={[
          'rounded-input bg-dn-surface-low p-3 flex flex-col gap-3',
          error ? 'ring-2 ring-dn-error/50' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="flex flex-wrap items-center gap-2">
          {PRESET_COLORS.map((color) => {
            const isSelected = normalizedValue.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={color}
                type="button"
                title={color}
                onClick={() => handleSelect(color)}
                style={{ backgroundColor: color }}
                className={[
                  'w-8 h-8 rounded-full transition-all active:scale-90',
                  isSelected
                    ? 'ring-2 ring-offset-2 ring-offset-dn-surface-low ring-dn-text-main'
                    : 'hover:scale-110',
                ].join(' ')}
                aria-label={color}
              >
                {isSelected && <Icon name="check" className="text-base text-dn-bg" />}
              </button>
            );
          })}

          <label
            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border border-dashed border-white/20 text-dn-text-muted hover:text-dn-text-main transition-colors"
            title={t('common.colorCustom')}
          >
            <Icon name="colorize" className="text-base" />
            <input
              type="color"
              value={customValue}
              onChange={(e) => onChange?.(e.target.value.toUpperCase())}
              className="sr-only"
            />
          </label>
        </div>

        {normalizedValue && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dn-surface">
            <span
              className="w-5 h-5 rounded-full shrink-0"
              style={{ backgroundColor: HEX_PATTERN.test(normalizedValue) ? normalizedValue : undefined }}
            />
            <span className="text-xs text-dn-text-main flex-1 truncate font-mono">{normalizedValue}</span>
            <button
              type="button"
              onClick={() => onChange?.('')}
              className="text-dn-text-muted hover:text-dn-error transition-colors"
              aria-label={t('common.colorClear')}
            >
              <Icon name="close" className="text-sm" />
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-dn-error">{error}</p>}
    </div>
  );
}
