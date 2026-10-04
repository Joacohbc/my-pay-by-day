import JSZip from 'jszip';
import type { DataSection, DataExportSummaryDto, SectionCountDto } from '@/models';

const ALL_SECTIONS: DataSection[] = [
  'DUPLICATE_DETECTION_SETTINGS',
  'CURRENCIES',
  'EXCHANGE_RATES',
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
];

export interface ArchivePreview extends DataExportSummaryDto {
  /** Exported before amounts carried a currency, so the user has to say which one they were in. */
  hasAmountsWithoutCurrency: boolean;
}

interface ArchivedEvent {
  lineItems?: { currency?: string | null }[];
}

function hasAmountsWithoutCurrency(archive: { currencies?: unknown; events?: ArchivedEvent[] }): boolean {
  const predatesCurrencies = archive.currencies === undefined;
  const hasLineItemWithoutCurrency = (archive.events ?? []).some((event) =>
    (event.lineItems ?? []).some((lineItem) => !lineItem.currency)
  );
  return predatesCurrencies || hasLineItemWithoutCurrency;
}

export async function parseExportArchive(file: File | Blob): Promise<ArchivePreview> {
  const zip = await JSZip.loadAsync(file);
  const dataJsonFile = zip.file('data.json');
  if (!dataJsonFile) {
    throw new Error('Invalid export ZIP: missing data.json');
  }

  const jsonText = await dataJsonFile.async('text');
  const json = JSON.parse(jsonText);

  const sectionCounts: Record<DataSection, number> = {
    DUPLICATE_DETECTION_SETTINGS: json.duplicateDetectionSettings ? 1 : 0,
    CURRENCIES: Array.isArray(json.currencies) ? json.currencies.length : 0,
    EXCHANGE_RATES: Array.isArray(json.exchangeRates) ? json.exchangeRates.length : 0,
    TAGS: Array.isArray(json.tags) ? json.tags.length : 0,
    CATEGORIES: Array.isArray(json.categories) ? json.categories.length : 0,
    FINANCE_NODES: Array.isArray(json.financeNodes) ? json.financeNodes.length : 0,
    FILES: Array.isArray(json.files) ? json.files.length : 0,
    TAG_GROUPS: Array.isArray(json.tagGroups) ? json.tagGroups.length : 0,
    SUBSCRIPTIONS: Array.isArray(json.subscriptions) ? json.subscriptions.length : 0,
    TEMPLATES: Array.isArray(json.templates) ? json.templates.length : 0,
    TIME_PERIODS: Array.isArray(json.timePeriods) ? json.timePeriods.length : 0,
    EVENTS: Array.isArray(json.events) ? json.events.length : 0,
    DRAFTS: Array.isArray(json.drafts) ? json.drafts.length : 0,
    PAYMENT_PLANS: Array.isArray(json.paymentPlans) ? json.paymentPlans.length : 0,
  };

  let binaryFileCount = 0;
  zip.folder('files')?.forEach(() => {
    binaryFileCount++;
  });

  const sections: SectionCountDto[] = ALL_SECTIONS.map((sec) => ({
    section: sec,
    count: sectionCounts[sec] || 0,
  }));

  return {
    version: json.version || '1.0',
    generatedAt: json.exportedAt || new Date().toISOString(),
    sections,
    binaryFileCount,
    hasAmountsWithoutCurrency: hasAmountsWithoutCurrency(json),
  };
}
