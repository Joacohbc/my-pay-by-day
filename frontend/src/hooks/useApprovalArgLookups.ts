import { useTranslation } from 'react-i18next';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { useNodes } from '@/hooks/useNodes';
import { usePaymentPlan } from '@/hooks/usePaymentPlans';
import { useTemplates } from '@/hooks/useTemplates';
import { formatDate } from '@/lib/format';
import type { ApprovalArgLookups } from '@/lib/chat/approvalArgs';

const TEMPLATE_PAGE_SIZE = 100;

const unresolvedId = (id: unknown) => `#${String(id)}`;

/** Resolves the ids inside a tool's approval arguments into names, for the one payment plan the
 * call targets (`planId`, 0 when the call has none) plus the reference data every chat already keeps
 * cached. */
export function useApprovalArgLookups(planId: number): ApprovalArgLookups {
  const { t, i18n } = useTranslation();
  const { data: categories } = useCategories();
  const { data: tags } = useTags();
  const { data: nodes } = useNodes();
  const { data: plan } = usePaymentPlan(planId);
  const { data: templates } = useTemplates(0, TEMPLATE_PAGE_SIZE);

  return {
    translate: (translationKey, values) => t(translationKey, values ?? {}),

    enumLabel: (namespace, value) => {
      const translationKey = `${namespace}.${String(value)}`;
      return i18n.exists(translationKey) ? t(translationKey) : String(value);
    },

    categoryName: (categoryId) => categories?.find((category) => category.id === categoryId)?.name ?? unresolvedId(categoryId),

    tagName: (tagId) => tags?.find((tag) => tag.id === tagId)?.name ?? unresolvedId(tagId),

    nodeName: (nodeId) => nodes?.find((node) => node.id === nodeId)?.name ?? unresolvedId(nodeId),

    planName: (id) => plan?.name ?? unresolvedId(id),

    planItemLabel: (itemId) => {
      const item = plan?.items?.find((planItem) => planItem.id === itemId);
      if (!item) return unresolvedId(itemId);
      return t('chat.approval.installmentOf', {
        number: item.installmentNumber,
        date: formatDate(item.expectedDate),
      });
    },

    templateName: (templateId) =>
      templates?.content.find((template) => template.id === templateId)?.name ?? unresolvedId(templateId),
  };
}
