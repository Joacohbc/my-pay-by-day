import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEvents } from '@/hooks/useEvents';
import { useFinanceEventDrafts } from '@/hooks/useDrafts';
import { useDebounce } from '@/hooks/useDebounce';
import { normalizeText } from '@/lib/utils/textUtils';
import { describeFinanceEvent } from '@/lib/format';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Input } from '@/components/ui/Input';

const SELECTABLE_EVENTS_PAGE_SIZE = 50;

type MemberTab = 'EVENT' | 'DRAFT';

interface GroupMembersPickerProps {
  eventIds: number[];
  draftIds: number[];
  onChangeEventIds: (ids: number[]) => void;
  onChangeDraftIds: (ids: number[]) => void;
}

function toggleId(ids: number[], id: number): number[] {
  return ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id];
}

export function GroupMembersPicker({ eventIds, draftIds, onChangeEventIds, onChangeDraftIds }: GroupMembersPickerProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<MemberTab>('EVENT');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 150);

  const { data: eventsPage } = useEvents(
    { page: 0, size: SELECTABLE_EVENTS_PAGE_SIZE, search: debouncedSearch || undefined },
    { enabled: tab === 'EVENT' }
  );
  const { data: drafts } = useFinanceEventDrafts();

  const draftOptions = useMemo(() => {
    const withDraftId = (drafts ?? []).filter(
      (draft): draft is typeof draft & { draftId: number } => draft.draftId != null
    );
    if (!debouncedSearch.trim()) return withDraftId;
    return withDraftId.filter((draft) => normalizeText(draft.name).includes(normalizeText(debouncedSearch)));
  }, [drafts, debouncedSearch]);

  const eventOptions = eventsPage?.content ?? [];

  return (
    <div className="space-y-3">
      <SegmentedControl
        label={t('paymentPlans.groupMembersLabel')}
        options={[
          { value: 'EVENT', label: `${t('paymentPlans.linkedEvent')} (${eventIds.length})` },
          { value: 'DRAFT', label: `${t('paymentPlans.linkedDraft')} (${draftIds.length})` },
        ]}
        value={tab}
        onChange={setTab}
      />

      <Input
        placeholder={t('common.search')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="max-h-64 overflow-y-auto rounded-input bg-dn-surface-low divide-y divide-white/5">
        {tab === 'EVENT' &&
          (eventOptions.length === 0 ? (
            <p className="px-4 py-3 text-xs text-dn-text-muted">{t('common.noResults')}</p>
          ) : (
            eventOptions.map((event) => (
              <label key={event.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={eventIds.includes(event.id)}
                  onChange={() => onChangeEventIds(toggleId(eventIds, event.id))}
                  className="w-4 h-4 shrink-0 accent-dn-primary bg-dn-surface-low"
                />
                <span className="text-sm text-dn-text-main truncate">{describeFinanceEvent(event)}</span>
              </label>
            ))
          ))}

        {tab === 'DRAFT' &&
          (draftOptions.length === 0 ? (
            <p className="px-4 py-3 text-xs text-dn-text-muted">{t('common.noResults')}</p>
          ) : (
            draftOptions.map((draft) => (
              <label key={draft.draftId} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={draftIds.includes(draft.draftId)}
                  onChange={() => onChangeDraftIds(toggleId(draftIds, draft.draftId))}
                  className="w-4 h-4 shrink-0 accent-dn-primary bg-dn-surface-low"
                />
                <span className="text-sm text-dn-text-main truncate">{describeFinanceEvent(draft)}</span>
              </label>
            ))
          ))}
      </div>
    </div>
  );
}
