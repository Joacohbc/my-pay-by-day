import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FinanceEvent, PaymentPlan } from '@/models';
import { EventCard } from '@/components/events/EventCard';
import { Icon } from '@/components/ui/Icon';
import { getGroupColor } from '@/lib/groupColors';

interface EventGroupFolderCardProps {
  readonly plan: PaymentPlan;
  /** A consecutive run of this plan's members as they appear in the loaded list — not necessarily every member the plan has. */
  readonly members: FinanceEvent[];
  readonly iconSource: 'category' | 'node';
}

/**
 * A run of two or more consecutive rows that belong to the same GROUP plan collapses into one
 * closed folder — that is the case a color stripe alone reads poorly for (a string of related
 * expenses back to back). Members of the same plan that are *not* adjacent stay as individual
 * `GroupableEventCard` rows elsewhere in the list, tied together only by the shared stripe color.
 */
export function EventGroupFolderCard({ plan, members, iconSource }: EventGroupFolderCardProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const groupColor = getGroupColor(plan.id);
  const anchorEventId = members[0].id;

  return (
    <div data-event-id={anchorEventId} className="flex items-stretch gap-2.5 rounded-lg">
      <span aria-hidden="true" style={{ backgroundColor: groupColor }} className="w-1 shrink-0 rounded-full" />

      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex items-center w-full justify-between py-1 active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div
              className="w-12 h-12 shrink-0 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${groupColor}22`, color: groupColor }}
            >
              <Icon name="workspaces" />
            </div>
            <div className="flex flex-col flex-1 min-w-0 text-left">
              <span className="text-base font-medium text-dn-text-main truncate">{plan.name}</span>
              <span className="text-xs font-medium" style={{ color: groupColor }}>
                {t('events.group.memberCount', { count: members.length })}
              </span>
            </div>
          </div>
          <Icon name={isExpanded ? 'expand_less' : 'expand_more'} className="text-dn-text-muted shrink-0 text-xl" />
        </button>

        {isExpanded && (
          <div className="mt-1 space-y-2 divide-y divide-white/5">
            {members.map((member) => (
              <div key={member.id} className="pt-2 first:pt-0">
                <EventCard event={member} iconSource={iconSource} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
