import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useFormContext, useFieldArray, useWatch } from 'react-hook-form';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Modal } from '@/components/ui/Modal';
import { NodeForm } from '@/components/nodes/NodeForm';
import type { FinanceNode } from '@/models';

interface LineItemsFormValues {
  lineItems: { nodeId: string; amount: string }[];
  isSimplifiedMode?: boolean;
}
import { sortByUsage, getSortIcon, nextSortMode } from '@/lib/usageSorter';
import type { SortMode } from '@/lib/usageSorter';
import { useUsageStats, useRecordSelection } from '@/hooks/useSelectionHistory';

interface LineItemsEditorProps {
  nodes: FinanceNode[];
  /** Override the active sort mode from outside (controlled). Omit to let the editor manage it. */
  sortMode?: SortMode;
  onSortModeChange?: (mode: SortMode) => void;
  minItems?: number;
  maxItems?: number;
}

export function LineItemsEditor({
  nodes,
  sortMode: sortModeProp,
  onSortModeChange,
  minItems = 1,
  maxItems,
}: LineItemsEditorProps) {

  const { t } = useTranslation();
  const { control, register, setValue, formState: { errors } } = useFormContext<LineItemsFormValues>();
  const { fields, append, remove, move } = useFieldArray({ control, name: 'lineItems' });

  const isSimplifiedMode = useWatch({ control, name: 'isSimplifiedMode' }) ?? true;
  const firstAmount = useWatch({ control, name: 'lineItems.0.amount' });

  const setIsSimplifiedMode = (val: boolean) => setValue('isSimplifiedMode', val);

  const [showNodeModal, setShowNodeModal] = useState<number | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const [internalSortMode, setInternalSortMode] = useState<SortMode>('smart');
  const sortMode = sortModeProp ?? internalSortMode;

  const { data: stats } = useUsageStats('FINANCE_NODE');
  const recordSelection = useRecordSelection();

  const activeNodes = useMemo(
    () => sortByUsage(nodes.filter((n) => !n.archived), stats ?? [], sortMode),
    [nodes, stats, sortMode]
  );

  const nodeOptions = useMemo(
    () => activeNodes.map((n) => ({ value: String(n.id), label: n.name })),
    [activeNodes]
  );

  const cycleSortMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = nextSortMode(sortMode);
    if (onSortModeChange) onSortModeChange(next);
    else setInternalSortMode(next);
  };

  const moveLineItem = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= fields.length) return;
    move(fromIndex, toIndex);
  };

  const beginDragLineItem = (index: number, event: React.DragEvent<HTMLElement>) => {
    setDraggedItemIndex(index);
    setDropTargetIndex(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  };

  const handleLineItemDragOver = (index: number, event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    event.dataTransfer.dropEffect = 'move';
    if (dropTargetIndex !== index) {
      setDropTargetIndex(index);
    }
  };

  const handleLineItemDrop = (index: number, event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    const rawDraggedIndex = event.dataTransfer.getData('text/plain');
    const parsedDraggedIndex = Number(rawDraggedIndex);
    const sourceIndex = Number.isNaN(parsedDraggedIndex) ? draggedItemIndex : parsedDraggedIndex;
    if (sourceIndex !== null) {
      moveLineItem(sourceIndex, index);
    }
    setDraggedItemIndex(null);
    setDropTargetIndex(null);
  };

  const endDragLineItem = () => {
    setDraggedItemIndex(null);
    setDropTargetIndex(null);
  };

  const handleNodeChange = (val: string | number | null, onChange: (val: string) => void) => {
    const stringVal = val == null ? '' : String(val);
    onChange(stringVal);
    if (stringVal) recordSelection.mutate({ type: 'FINANCE_NODE', id: Number(stringVal) });
  };

  // Enforce exactly 2 line items in simplified mode
  useEffect(() => {
    if (!isSimplifiedMode) return;
    if (fields.length > 2) {
      remove(Array.from({ length: fields.length - 2 }, (_, i) => i + 2));
    } else if (fields.length < 2) {
      for (let i = fields.length; i < 2; i++) {
        append({ nodeId: '', amount: '' });
      }
    }
  }, [isSimplifiedMode, fields.length, remove, append]);

  // Sync all line item amounts to the first amount in simplified mode
  useEffect(() => {
    if (!isSimplifiedMode) return;
    for (let i = 1; i < fields.length; i++) {
      setValue(`lineItems.${i}.amount`, firstAmount ?? '');
    }
  }, [firstAmount, isSimplifiedMode, fields.length, setValue]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider">{t('eventForm.lineItems')}</p>
          <button
            type="button"
            onClick={cycleSortMode}
            className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-tighter text-dn-text-muted hover:text-dn-primary transition-colors bg-dn-surface-low px-2 py-0.5 rounded-full"
            title={`${t('common.sort')}: ${sortMode}`}
          >
            <Icon name={getSortIcon(sortMode)} className="text-[10px]" />
            {sortMode}
          </button>
        </div>
        <div className="flex items-center gap-3">
          {!isSimplifiedMode && (!maxItems || fields.length < maxItems) && (
            <button
              type="button"
              onClick={() => append({ nodeId: '', amount: '' })}
              className="flex items-center gap-1 text-xs text-dn-primary hover:brightness-110 transition-all"
            >
              <Icon name="add" className="text-sm" />
              {t('eventForm.addLineItem')}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (!isSimplifiedMode) {
                // Normalize to exactly 2 items before entering simplified mode
                if (fields.length > 2) {
                  remove(Array.from({ length: fields.length - 2 }, (_, i) => i + 2));
                } else if (fields.length < 2) {
                  for (let i = fields.length; i < 2; i++) {
                    append({ nodeId: '', amount: '' });
                  }
                }
                setIsSimplifiedMode(true);
              } else {
                const num = parseFloat(firstAmount ?? '') || 0;
                if (num !== 0) {
                  fields.forEach((_, i) => {
                    setValue(`lineItems.${i}.amount`, String(i === 0 ? -Math.abs(num) : Math.abs(num)));
                  });
                }
                setIsSimplifiedMode(false);
              }
            }}
            className="text-xs text-dn-text-muted hover:text-dn-primary transition-colors"
          >
            {isSimplifiedMode ? t('eventForm.manualMode') : t('eventForm.simplifiedMode')}
          </button>
        </div>
      </div>
      {errors.lineItems?.root?.message && (
        <p className="text-xs text-dn-error mb-2">{errors.lineItems.root.message}</p>
      )}

      {isSimplifiedMode ? (
        <div className="space-y-3">
          <div className="space-y-2">
            {fields.map((field, i) => (
              <div
                key={field.id}
                onDragOver={(event) => handleLineItemDragOver(i, event)}
                onDrop={(event) => handleLineItemDrop(i, event)}
                className={[
                  'flex items-center gap-3 px-3 py-2 rounded-input bg-dn-surface-low transition-all',
                  draggedItemIndex === i ? 'opacity-60' : '',
                  dropTargetIndex === i && draggedItemIndex !== null && draggedItemIndex !== i ? 'ring-1 ring-inset ring-dn-primary/40' : '',
                ].join(' ')}
              >
                <span className={`text-sm font-bold w-4 shrink-0 ${i === 0 ? 'text-dn-error' : 'text-dn-success'}`}>
                  {i === 0 ? '−' : '+'}
                </span>
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => beginDragLineItem(i, event)}
                  onDragEnd={endDragLineItem}
                  aria-label={t('eventForm.reorderLineItem')}
                  title={t('eventForm.reorderLineItem')}
                  className="p-1.5 rounded-full text-dn-text-muted hover:text-dn-primary hover:bg-dn-primary/10 transition-colors cursor-grab active:cursor-grabbing"
                >
                  <Icon name="drag_indicator" className="text-base" />
                </button>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1">
                    <Controller
                      name={`lineItems.${i}.nodeId`}
                      control={control}
                      render={({ field: f }) => (
                        <SearchableSelect
                          placeholder={t('eventForm.selectNode')}
                          options={nodeOptions}
                          error={errors.lineItems?.[i]?.nodeId?.message}
                          value={f.value}
                          onChange={(val) => handleNodeChange(val, f.onChange)}
                          allowNone
                        />
                      )}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNodeModal(i)}
                    className="p-2 rounded-full text-dn-text-muted hover:text-dn-primary hover:bg-dn-primary/10 transition-colors"
                    title={t('nodes.addNode')}
                  >
                    <Icon name="add_circle" className="text-xl" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Input
            label={t('eventForm.amount')}
            placeholder={t('eventForm.amountPlaceholder')}
            type="number"
            step="0.01"
            error={errors.lineItems?.[0]?.amount?.message}
            {...register('lineItems.0.amount')}
          />
        </div>
      ) : (
        <div className="space-y-2">
          {fields.map((field, i) => (
            <div
              key={field.id}
              onDragOver={(event) => handleLineItemDragOver(i, event)}
              onDrop={(event) => handleLineItemDrop(i, event)}
              className={[
                'flex gap-2 items-center rounded-input transition-all',
                draggedItemIndex === i ? 'opacity-60' : '',
                dropTargetIndex === i && draggedItemIndex !== null && draggedItemIndex !== i ? 'ring-1 ring-inset ring-dn-primary/40' : '',
              ].join(' ')}
            >
              <button
                type="button"
                draggable
                onDragStart={(event) => beginDragLineItem(i, event)}
                onDragEnd={endDragLineItem}
                aria-label={t('eventForm.reorderLineItem')}
                title={t('eventForm.reorderLineItem')}
                className="p-1.5 rounded-full text-dn-text-muted hover:text-dn-primary hover:bg-dn-primary/10 transition-colors cursor-grab active:cursor-grabbing shrink-0"
              >
                <Icon name="drag_indicator" className="text-base" />
              </button>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1">
                  <Controller
                    name={`lineItems.${i}.nodeId`}
                    control={control}
                    render={({ field: f }) => (
                      <SearchableSelect
                        placeholder={t('eventForm.selectNode')}
                        options={nodeOptions}
                        error={errors.lineItems?.[i]?.nodeId?.message}
                        value={f.value}
                        onChange={(val) => handleNodeChange(val, f.onChange)}
                      />
                    )}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowNodeModal(i)}
                  className="p-2 rounded-full text-dn-text-muted hover:text-dn-primary hover:bg-dn-primary/10 transition-colors shrink-0"
                  title={t('nodes.addNode')}
                >
                  <Icon name="add_circle" className="text-xl" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-24">
                  <Input
                    placeholder={t('eventForm.amountPlaceholder')}
                    type="number"
                    step="0.01"
                    error={errors.lineItems?.[i]?.amount?.message}
                    {...register(`lineItems.${i}.amount`)}
                  />
                </div>
              </div>
              {fields.length > minItems && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="p-1.5 rounded-full text-dn-text-muted hover:text-dn-error hover:bg-dn-error/10 transition-colors"
                >
                  <Icon name="delete" className="text-base" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-dn-text-muted mt-2">{t('eventForm.dragLineItemHint')}</p>
      <p className="text-xs text-dn-text-muted mt-2">
        {isSimplifiedMode ? t('eventForm.signedAmountHint') : t('eventForm.manualAmountHint')}
      </p>

      <Modal
        open={showNodeModal !== null}
        onClose={() => setShowNodeModal(null)}
        title={t('nodes.newNode')}
      >
        <NodeForm
          onSuccess={(newNode) => {
            if (showNodeModal !== null) {
              setValue(`lineItems.${showNodeModal}.nodeId`, String(newNode.id), { shouldDirty: true });
            }
            setShowNodeModal(null);
          }}
          onCancel={() => setShowNodeModal(null)}
        />
      </Modal>
    </div>
  );
}

