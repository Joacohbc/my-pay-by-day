import { useTranslation } from 'react-i18next';
import type { DataSection, SectionCountDto, SectionImportResult } from '@/models';
import { DATA_SECTIONS_METADATA } from '@/lib/dataTransfer/sections';
import { Icon } from '@/components/ui/Icon';

import { ALL_DATA_SECTIONS } from '@/lib/dataTransfer/config';

interface SectionCountListProps {
  counts?: SectionCountDto[];
  results?: SectionImportResult[];
  compact?: boolean;
}

interface SectionGroup {
  id: string;
  labelKey: string;
  sections: DataSection[];
}

const SECTION_GROUPS: SectionGroup[] = [
  {
    id: 'core',
    labelKey: 'dataTransfer.groups.core',
    sections: ['FINANCE_NODES', 'CATEGORIES', 'TAGS', 'TAG_GROUPS'],
  },
  {
    id: 'activity',
    labelKey: 'dataTransfer.groups.activity',
    sections: ['EVENTS', 'DRAFTS', 'TEMPLATES', 'SUBSCRIPTIONS', 'PAYMENT_PLANS'],
  },
  {
    id: 'system',
    labelKey: 'dataTransfer.groups.system',
    sections: ['FILES', 'TIME_PERIODS', 'DUPLICATE_DETECTION_SETTINGS'],
  },
];

export function SectionCountList({ counts, results, compact = false }: SectionCountListProps) {
  const { t } = useTranslation();

  const effectiveCounts = counts && counts.length > 0 ? counts : ALL_DATA_SECTIONS.map((sec) => ({ section: sec, count: 0 }));
  const countMap = new Map<DataSection, number>(effectiveCounts.map((c) => [c.section, c.count]));
  const resultMap = new Map<DataSection, SectionImportResult>(results?.map((r) => [r.section, r]));

  if (results) {
    const totalImported = results.reduce((acc, r) => acc + r.imported, 0);
    const totalSkipped = results.reduce((acc, r) => acc + (r.skipped?.length || 0), 0);

    return (
      <div className="space-y-4">
        {/* Total Summary Bar */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-dn-surface/80 border border-dn-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-dn-accent/15 text-dn-accent flex items-center justify-center">
              <Icon name="verified" className="text-xl" />
            </div>
            <div>
              <p className="text-sm font-semibold text-dn-text-main">
                {t('dataTransfer.resultsSummaryTitle', 'Import Process Finished')}
              </p>
              <p className="text-xs text-dn-text-muted">
                {totalImported} {t('dataTransfer.itemsImported', 'items restored successfully')}
              </p>
            </div>
          </div>
          {totalSkipped > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-dn-warning/15 text-dn-warning border border-dn-warning/20">
              {totalSkipped} {t('dataTransfer.skippedCount', 'skipped')}
            </span>
          )}
        </div>

        {/* Detailed Results Grid */}
        <div className="space-y-3">
          {SECTION_GROUPS.map((group) => {
            const groupResults = group.sections.map((s) => resultMap.get(s)).filter(Boolean) as SectionImportResult[];
            if (groupResults.length === 0) return null;

            return (
              <div key={group.id} className="space-y-1.5">
                <p className="text-[11px] font-semibold text-dn-text-muted/70 uppercase tracking-wider px-1">
                  {t(group.labelKey)}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {groupResults.map((res) => {
                    const meta = DATA_SECTIONS_METADATA[res.section];
                    const hasSkipped = res.skipped && res.skipped.length > 0;
                    return (
                      <div
                        key={res.section}
                        className="flex items-center justify-between p-3 rounded-2xl bg-dn-surface-low/80 border border-white/5 text-sm hover:border-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-dn-surface text-dn-accent flex items-center justify-center shrink-0">
                            <Icon name={meta?.iconName || 'folder'} className="text-base" />
                          </div>
                          <span className="truncate font-medium text-dn-text-main">
                            {meta ? t(meta.labelKey) : res.section}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-dn-accent/15 text-dn-accent border border-dn-accent/20">
                            +{res.imported}
                          </span>
                          {hasSkipped && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-dn-warning/15 text-dn-warning border border-dn-warning/20">
                              {res.skipped.length}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Skipped Details Log */}
        {results.some((r) => r.skipped?.length > 0) && (
          <div className="p-3.5 rounded-2xl bg-dn-warning/10 border border-dn-warning/25 text-xs text-dn-warning space-y-1.5">
            <p className="font-semibold flex items-center gap-1.5">
              <Icon name="warning" className="text-sm" />
              {t('dataTransfer.skippedNotice', 'Skipped Items Log:')}
            </p>
            <ul className="list-disc list-inside space-y-1 max-h-36 overflow-y-auto text-[11px] opacity-90 pl-1">
              {results.flatMap((r) => r.skipped.map((s, idx) => <li key={idx}>{s}</li>))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {SECTION_GROUPS.map((group) => {
        const groupItems = group.sections.map((sec) => ({ section: sec, count: countMap.get(sec) || 0 }));
        return (
          <div key={group.id} className="space-y-1.5">
            <p className="text-[11px] font-semibold text-dn-text-muted/70 uppercase tracking-wider px-1">
              {t(group.labelKey)}
            </p>
            <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'} gap-2`}>
              {groupItems.map((item) => {
                const meta = DATA_SECTIONS_METADATA[item.section];
                const isNonZero = item.count > 0;

                return (
                  <div
                    key={item.section}
                    className={`flex items-center justify-between p-2.5 px-3 rounded-2xl border text-sm transition-all ${
                      isNonZero
                        ? 'bg-dn-surface/90 border-white/10 text-dn-text-main shadow-sm hover:border-dn-accent/40'
                        : 'bg-dn-surface-low/40 border-white/5 text-dn-text-muted/60 opacity-65'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isNonZero ? 'bg-dn-accent/15 text-dn-accent' : 'bg-dn-surface-low text-dn-text-muted/40'
                        }`}
                      >
                        <Icon name={meta?.iconName || 'folder'} className="text-base" />
                      </div>
                      <span className="truncate font-medium text-xs sm:text-sm">
                        {meta ? t(meta.labelKey) : item.section}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold shrink-0 ${
                        isNonZero
                          ? 'bg-dn-accent/15 text-dn-accent border border-dn-accent/20'
                          : 'bg-dn-surface-low text-dn-text-muted/50'
                      }`}
                    >
                      {item.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
