import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { useResolveDuplicate } from '@/hooks/useDuplicates';
import { useAlert } from '@/contexts/AlertContext';
import type { DuplicateRecord } from '@/models';

function DuplicateRow({ record, currentId }: { record: DuplicateRecord; currentId: number }) {
  const { t } = useTranslation();
  const alert = useAlert();
  const resolve = useResolveDuplicate();

  const otherEntity = record.entityId1 === currentId ? record.entity2 : record.entity1;
  const name = (otherEntity?.name as string) ?? `#${record.entityId1 === currentId ? record.entityId2 : record.entityId1}`;

  const handleNotDuplicate = () => {
    resolve.mutate(
      { id: record.id, request: { action: 'ACCEPTED_NOT_DUPLICATE' } },
      { onError: () => alert.error(t('common.error')) }
    );
  };

  const handleDeleteOther = () => {
    resolve.mutate(
      { id: record.id, request: { action: 'RESOLVED_MERGED', keepEntityId: currentId } },
      { onError: () => alert.error(t('common.error')) }
    );
  };

  return (
    <div className="p-2 flex items-center gap-3 border border-transparent hover:border-dn-primary/50 transition-colors rounded-2xl">
      <div className="flex-1 min-w-0 flex items-center gap-3 px-1">
        <div className="w-8 h-8 rounded-full bg-dn-surface flex items-center justify-center shrink-0">
          <Icon name="find_replace" className="text-sm text-dn-text-muted" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-dn-text-main truncate">{name}</p>
          <p className="text-xs text-dn-text-muted font-mono">
            {t('duplicates.section.score')}: {Math.round(record.score * 100)}%
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1 shrink-0">
        <button
          type="button"
          onClick={handleNotDuplicate}
          disabled={resolve.isPending}
          title={t('duplicates.section.markNotDuplicate')}
          className="flex items-center justify-center rounded-full p-1.5 text-dn-success hover:bg-dn-success/10 transition-colors disabled:opacity-50"
        >
          <Icon name="check_circle" className="text-lg" />
        </button>
        <button
          type="button"
          onClick={handleDeleteOther}
          disabled={resolve.isPending}
          title={t('duplicates.section.deleteOther')}
          className="flex items-center justify-center rounded-full p-1.5 text-dn-error hover:bg-dn-error/10 transition-colors disabled:opacity-50"
        >
          <Icon name="delete" className="text-lg" />
        </button>
      </div>
    </div>
  );
}

export function SimpleEntityDuplicatesSection({
  records,
  currentId,
}: {
  records: DuplicateRecord[];
  currentId: number;
}) {
  const { t } = useTranslation();

  if (!records.length) return null;

  return (
    <div className="mt-2 pt-2 border-t border-white/5">
      <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5 px-1">
        <Icon name="find_replace" className="text-sm" />
        {t('duplicates.section.title')}
      </p>
      <div className="space-y-1">
        {records.map((r) => (
          <DuplicateRow key={r.id} record={r} currentId={currentId} />
        ))}
      </div>
    </div>
  );
}
