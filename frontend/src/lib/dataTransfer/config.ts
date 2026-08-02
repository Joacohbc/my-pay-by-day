import type { DataExportSummaryDto, DataSection } from '@/models';

/**
 * Easily modifiable Data Transfer & Backup archive schema version.
 */
export const DATA_TRANSFER_VERSION = '1.1';

export const DATA_TRANSFER_CONFIG = {
  version: DATA_TRANSFER_VERSION,
  exportFilenamePrefix: 'mypaybyday-export',
};

export const ALL_DATA_SECTIONS: DataSection[] = [
  'TAGS',
  'CATEGORIES',
  'FINANCE_NODES',
  'FILES',
  'TAG_GROUPS',
  'SUBSCRIPTIONS',
  'TEMPLATES',
  'TIME_PERIODS',
  'EVENTS',
  'DRAFTS',
  'PAYMENT_PLANS',
  'DUPLICATE_DETECTION_SETTINGS',
];

/**
 * Generates a client-side fallback summary when offline or when initial API response is loading.
 */
export function buildEmptyExportSummary(): DataExportSummaryDto {
  return {
    version: DATA_TRANSFER_VERSION,
    generatedAt: new Date().toISOString(),
    binaryFileCount: 0,
    sections: ALL_DATA_SECTIONS.map((section) => ({ section, count: 0 })),
  };
}
