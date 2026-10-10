import { DraftMultiSelectModal } from '@/components/events/DraftMultiSelectModal';
import { EventMultiSelectModal } from '@/components/events/EventMultiSelectModal';
import type { MergeSourceKind } from '@/components/events/mergeSources';
import type { EventType } from '@/models';

interface MergeSourcePickerProps {
  source: MergeSourceKind;
  open: boolean;
  onClose: () => void;
  onCancel?: () => void;
  title: string;
  onConfirm: (selectedIds: Set<number>) => void;
  confirmLabel: string;
  cancelLabel?: string;
  maxSelection?: number;
  initialSelectedIds?: ReadonlySet<number>;
  excludeIds?: ReadonlySet<number>;
  /** Events only: narrows the list to the base's type, since mixing types is rejected anyway. */
  eventType?: EventType;
}

export function MergeSourcePicker({ source, excludeIds, eventType, ...selectionProps }: MergeSourcePickerProps) {
  if (source === 'drafts') {
    return <DraftMultiSelectModal {...selectionProps} minSelection={1} excludeDraftIds={excludeIds} />;
  }
  return (
    <EventMultiSelectModal
      {...selectionProps}
      minSelection={1}
      excludeEventIds={excludeIds}
      eventFilters={eventType ? { type: eventType } : undefined}
    />
  );
}
