import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { PaymentPlan } from '@/models';
import { Icon } from '@/components/ui/Icon';
import { getGroupColor } from '@/lib/groupColors';
import { planTypeIcons } from '@/components/paymentPlans/planPresentation';

interface EventGroupFolderCardProps<T> {
  readonly plan: PaymentPlan;
  /** A consecutive run of this plan's members as they appear in the loaded list — not necessarily every member the plan has. */
  readonly members: T[];
  readonly getId: (item: T) => number;
  readonly renderMember: (item: T) => ReactNode;
  readonly icon?: string;
}

/**
 * A run of two or more consecutive rows that belong to the same plan collapses into one closed
 * folder — that is the case a color stripe alone reads poorly for (a string of related expenses
 * back to back). Members of the same plan that are *not* adjacent stay as individual rows
 * elsewhere in the list, tied together only by the shared stripe color. Generic over the row type
 * so both confirmed events and drafts can fold into the same visual without duplicating it.
 */
export function EventGroupFolderCard<T>({ plan, members, getId, renderMember, icon }: EventGroupFolderCardProps<T>) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const groupColor = getGroupColor(plan.id);
  const anchorId = getId(members[0]);
  const resolvedIcon = icon || planTypeIcons[plan.planType] || 'payments';

  return (
    <div data-event-id={anchorId} className="flex items-stretch gap-2.5 rounded-lg">
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
              <Icon name={resolvedIcon} />
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
              <div key={getId(member)} className="pt-2 first:pt-0">
                {renderMember(member)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
