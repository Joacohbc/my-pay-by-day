import type { DataSection } from '@/models';

export interface SectionMetadata {
  section: DataSection;
  iconName: string;
  labelKey: string;
  descKey: string;
}

export const DATA_SECTIONS_METADATA: Record<DataSection, SectionMetadata> = {
  DUPLICATE_DETECTION_SETTINGS: {
    section: 'DUPLICATE_DETECTION_SETTINGS',
    iconName: 'find_replace',
    labelKey: 'dataTransfer.sections.DUPLICATE_DETECTION_SETTINGS',
    descKey: 'dataTransfer.sectionDescs.DUPLICATE_DETECTION_SETTINGS',
  },
  TAGS: {
    section: 'TAGS',
    iconName: 'tag',
    labelKey: 'dataTransfer.sections.TAGS',
    descKey: 'dataTransfer.sectionDescs.TAGS',
  },
  CATEGORIES: {
    section: 'CATEGORIES',
    iconName: 'category',
    labelKey: 'dataTransfer.sections.CATEGORIES',
    descKey: 'dataTransfer.sectionDescs.CATEGORIES',
  },
  FINANCE_NODES: {
    section: 'FINANCE_NODES',
    iconName: 'account_balance',
    labelKey: 'dataTransfer.sections.FINANCE_NODES',
    descKey: 'dataTransfer.sectionDescs.FINANCE_NODES',
  },
  FILES: {
    section: 'FILES',
    iconName: 'attach_file',
    labelKey: 'dataTransfer.sections.FILES',
    descKey: 'dataTransfer.sectionDescs.FILES',
  },
  TAG_GROUPS: {
    section: 'TAG_GROUPS',
    iconName: 'folder',
    labelKey: 'dataTransfer.sections.TAG_GROUPS',
    descKey: 'dataTransfer.sectionDescs.TAG_GROUPS',
  },
  SUBSCRIPTIONS: {
    section: 'SUBSCRIPTIONS',
    iconName: 'autorenew',
    labelKey: 'dataTransfer.sections.SUBSCRIPTIONS',
    descKey: 'dataTransfer.sectionDescs.SUBSCRIPTIONS',
  },
  TEMPLATES: {
    section: 'TEMPLATES',
    iconName: 'dashboard_customize',
    labelKey: 'dataTransfer.sections.TEMPLATES',
    descKey: 'dataTransfer.sectionDescs.TEMPLATES',
  },
  TIME_PERIODS: {
    section: 'TIME_PERIODS',
    iconName: 'calendar_month',
    labelKey: 'dataTransfer.sections.TIME_PERIODS',
    descKey: 'dataTransfer.sectionDescs.TIME_PERIODS',
  },
  EVENTS: {
    section: 'EVENTS',
    iconName: 'receipt_long',
    labelKey: 'dataTransfer.sections.EVENTS',
    descKey: 'dataTransfer.sectionDescs.EVENTS',
  },
  DRAFTS: {
    section: 'DRAFTS',
    iconName: 'edit_note',
    labelKey: 'dataTransfer.sections.DRAFTS',
    descKey: 'dataTransfer.sectionDescs.DRAFTS',
  },
  PAYMENT_PLANS: {
    section: 'PAYMENT_PLANS',
    iconName: 'payments',
    labelKey: 'dataTransfer.sections.PAYMENT_PLANS',
    descKey: 'dataTransfer.sectionDescs.PAYMENT_PLANS',
  },
};
