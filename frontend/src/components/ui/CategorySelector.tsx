import { useTranslation } from 'react-i18next';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import type { Category } from '@/models';

interface CategorySelectorProps {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
  /** 'grid' renders an icon grid (default). 'select' renders a SearchableSelect dropdown. */
  variant?: 'grid' | 'select';
  label?: string;
  className?: string;
}

export function CategorySelector({
  categories,
  value,
  onChange,
  variant = 'grid',
  label,
  className = '',
}: CategorySelectorProps) {
  const { t } = useTranslation();

  if (categories.length === 0) return null;

  const resolvedLabel = label ?? t('eventForm.category');

  if (variant === 'select') {
    const options = categories.map((c) => ({ value: String(c.id), label: c.name }));
    return (
      <SearchableSelect
        label={resolvedLabel}
        placeholder={t('common.none')}
        options={options}
        value={value}
        onChange={(val) => onChange(String(val))}
        className={className}
      />
    );
  }

  // variant === 'grid'
  return (
    <div className={className}>
      <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-3">
        {resolvedLabel}
      </p>
      <div className="grid grid-cols-4 gap-x-3 gap-y-4">
        {categories.map((cat) => {
          const selected = value === String(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onChange(selected ? '' : String(cat.id))}
              className="flex flex-col items-center gap-2"
            >
              <CategoryIcon
                category={cat}
                size="lg"
                colorClass={selected ? 'bg-dn-primary text-dn-bg' : 'bg-dn-surface text-dn-text-muted'}
                className="transition-all active:scale-95"
              />
              <span
                className={[
                  'text-xs text-center font-medium leading-tight',
                  selected ? 'text-dn-primary' : 'text-dn-text-muted',
                ].join(' ')}
              >
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
