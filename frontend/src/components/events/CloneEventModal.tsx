import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { Routes } from '@/lib/routes';
import type { FinanceEvent } from '@/models';

const ALL_FIELDS = ['name', 'description', 'transactionDate', 'category', 'tags', 'nodes', 'amounts'] as const;
type CloneField = (typeof ALL_FIELDS)[number];

function CheckBox({ checked, disabled }: { checked: boolean; disabled?: boolean }) {
  return (
    <div
      className={[
        'shrink-0 w-5 h-5 border-2 rounded flex items-center justify-center transition-colors',
        disabled
          ? 'border-dn-text-muted/30 bg-transparent'
          : checked
            ? 'border-dn-primary bg-dn-primary'
            : 'border-dn-text-muted',
      ].join(' ')}
    >
      {checked && !disabled && <Icon name="check" className="text-xs text-white" />}
    </div>
  );
}

export function CloneEventModal({
  open,
  onClose,
  event,
}: {
  open: boolean;
  onClose: () => void;
  event: FinanceEvent;
}) {
  const { t } = useTranslation();
  const { navigate } = useAppNavigation();
  const [selected, setSelected] = useState<Set<CloneField>>(new Set(ALL_FIELDS));

  const toggle = (field: CloneField) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
        if (field === 'nodes') next.delete('amounts');
      } else {
        next.add(field);
      }
      return next;
    });
  };

  const handleClone = () => {
    const draft: Partial<FinanceEvent> = {};

    if (selected.has('name')) draft.name = `${event.name} (Copy)`;
    if (selected.has('description')) draft.description = event.description;
    if (selected.has('transactionDate')) draft.transactionDate = event.transactionDate;
    if (selected.has('category')) draft.category = event.category;
    if (selected.has('tags')) draft.tags = event.tags;

    if (selected.has('nodes')) {
      draft.lineItems = selected.has('amounts')
        ? event.lineItems
        : event.lineItems.map((li) => ({ ...li, amount: 0 }));
    }

    navigate(Routes.EVENT_NEW, { state: { draft } });
    onClose();
  };

  const fields: { key: CloneField; label: string; disabled?: boolean }[] = [
    { key: 'name', label: t('events.cloneFieldName') },
    { key: 'description', label: t('events.cloneFieldDescription') },
    { key: 'transactionDate', label: t('events.cloneFieldDate') },
    { key: 'category', label: t('events.cloneFieldCategory') },
    { key: 'tags', label: t('events.cloneFieldTags') },
    { key: 'nodes', label: t('events.cloneFieldNodes') },
    { key: 'amounts', label: t('events.cloneFieldAmounts'), disabled: !selected.has('nodes') },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('events.cloneModalTitle')}
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={handleClone}>
            {t('events.cloneConfirm')}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-dn-text-muted mb-4">{t('events.cloneModalSubtitle')}</p>
      <div className="flex flex-col gap-1">
        {fields.map(({ key, label, disabled }) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && toggle(key)}
            className={[
              'flex items-center gap-3 w-full px-3 py-2.5 rounded-input text-left transition-colors',
              disabled
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-dn-surface-low cursor-pointer',
            ].join(' ')}
          >
            <CheckBox checked={selected.has(key)} disabled={disabled} />
            <span className="text-sm text-dn-text-main">{label}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
