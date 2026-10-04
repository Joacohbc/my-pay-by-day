import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { eventCurrency, formatDateTime, formatExchangeRate, formatMoney } from '@/lib/format';
import type { FinanceEvent } from '@/models';

/**
 * The event's amount in each principal currency, with the rate frozen on it when it was recorded
 * or, for a retroactive conversion, when the currency became principal, or, for a recalculated one,
 * when the user replaced it.
 */
export function EventConversionsSection({ event }: { event: FinanceEvent }) {
  const { t } = useTranslation();
  const conversions = event.conversions ?? [];
  if (conversions.length === 0) return null;

  const recordedCurrency = eventCurrency(event);

  return (
    <div className="px-5">
      <h3 className="text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-3">
        {t('currencies.conversions.title')}
      </h3>
      <Card className="divide-y divide-white/5">
        {conversions.map((conversion) => (
          <div key={conversion.currency} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs text-dn-text-muted font-mono">
                {t('currencies.conversions.rate', {
                  from: recordedCurrency,
                  rate: formatExchangeRate(conversion.rate),
                  to: conversion.currency,
                })}
              </p>
              <p className="text-[11px] text-dn-text-muted flex items-center gap-1.5 flex-wrap">
                {t('currencies.conversions.frozenAt', { date: formatDateTime(conversion.frozenAt) })}
                {conversion.origin === 'RETROACTIVE' && (
                  <Badge variant="gray" size="sm">{t('currencies.conversions.retroactive')}</Badge>
                )}
                {conversion.origin === 'RECALCULATED' && (
                  <Badge variant="indigo" size="sm">{t('currencies.conversions.recalculated')}</Badge>
                )}
              </p>
            </div>
            <span className="text-sm font-mono text-dn-text-main shrink-0">
              {formatMoney(Math.abs(conversion.amount), conversion.currency)}
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}
