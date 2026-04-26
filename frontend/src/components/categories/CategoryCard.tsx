import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import type { Category, DuplicateRecord } from '@/models';
import { SimpleEntityDuplicatesSection } from '@/components/duplicates/SimpleEntityDuplicatesSection';

interface CategoryCardProps {
  category: Category;
  duplicates?: DuplicateRecord[];
  isPending?: boolean;
  onEdit: (category: Category) => void;
  onArchive: (category: Category) => void;
  onUnarchive: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export function CategoryCard({
  category,
  duplicates = [],
  isPending = false,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
}: CategoryCardProps) {
  const { t } = useTranslation();

  return (
    <Card className={`${category.archived ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-4">
        <CategoryIcon category={category} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-base font-medium text-dn-text-main">{category.name}</p>
            {category.archived && (
              <span className="text-xs bg-dn-surface-low text-dn-text-muted px-1.5 py-0.5 rounded">
                {t('common.archived')}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!category.archived && (
            <button
              onClick={() => onEdit(category)}
              className="p-2 rounded-full text-dn-text-muted hover:text-dn-text-main hover:bg-dn-surface-low transition-colors"
            >
              <Icon name="edit" className="text-base" />
            </button>
          )}
          {category.archived ? (
            <button
              onClick={() => onUnarchive(category)}
              disabled={isPending}
              className="p-2 rounded-full text-dn-text-muted hover:text-dn-primary hover:bg-dn-primary/10 transition-colors disabled:opacity-50"
            >
              <Icon name="unarchive" className="text-base" />
            </button>
          ) : (
            <button
              onClick={() => onArchive(category)}
              disabled={isPending}
              className="p-2 rounded-full text-dn-text-muted hover:text-dn-text-main hover:bg-dn-surface-low transition-colors disabled:opacity-50"
            >
              <Icon name="archive" className="text-base" />
            </button>
          )}
          <button
            onClick={() => onDelete(category)}
            disabled={isPending}
            className="p-2 rounded-full text-dn-text-muted hover:text-dn-error hover:bg-dn-error/10 transition-colors disabled:opacity-50"
          >
            <Icon name="delete" className="text-base" />
          </button>
        </div>
      </div>
      {category.description && (
        <p className="text-xs text-dn-text-muted mt-2 pb-2 pr-2 pl-2 text-pretty">{category.description}</p>
      )}
      <SimpleEntityDuplicatesSection
        records={duplicates}
        currentId={category.id}
      />
    </Card>
  );
}
