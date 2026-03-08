import { useSyncExternalStore, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { usePendingEventsStore, type PendingEvent } from '@/store/pendingEventsStore';
import { eventsService } from '@/services/events.service';
import { EVENTS_KEY } from '@/hooks/useEvents';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { formatCurrency, formatDate } from '@/lib/format';
import type { CreateEventDto } from '@/models';

function subscribe(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

function pendingNetAmount(dto: CreateEventDto): number {
  const items = dto.transaction.lineItems;
  if (!items.length) return 0;
  if (dto.type === 'INBOUND') {
    return items.filter((i) => i.amount > 0).reduce((s, i) => s + i.amount, 0);
  }
  if (dto.type === 'OUTBOUND') {
    return Math.abs(items.filter((i) => i.amount < 0).reduce((s, i) => s + i.amount, 0));
  }
  return items.reduce((s, i) => s + Math.abs(i.amount), 0) / 2;
}

const typeIconConfig = {
  INBOUND: { icon: 'arrow_downward', amountClass: 'text-dn-success', sign: '+' },
  OUTBOUND: { icon: 'arrow_upward', amountClass: 'text-dn-text-main', sign: '-' },
  OTHER: { icon: 'swap_horiz', amountClass: 'text-dn-secondary', sign: '' },
};

export function PendingEventsSync() {
  const { t } = useTranslation();
  const online = useSyncExternalStore(subscribe, () => navigator.onLine);
  const { pending, removePending, clearAll } = usePendingEventsStore();
  const qc = useQueryClient();

  const [sending, setSending] = useState<Set<string>>(new Set());
  const [sendingAll, setSendingAll] = useState(false);

  if (pending.length === 0) return null;

  const markSending = (id: string) =>
    setSending((prev) => new Set(prev).add(id));
  const unmarkSending = (id: string) =>
    setSending((prev) => { const next = new Set(prev); next.delete(id); return next; });

  const sendOne = async (p: PendingEvent) => {
    markSending(p.localId);
    try {
      await eventsService.create(p.dto);
      removePending(p.localId);
      qc.invalidateQueries({ queryKey: EVENTS_KEY });
    } finally {
      unmarkSending(p.localId);
    }
  };

  const sendAll = async () => {
    setSendingAll(true);
    for (const p of [...pending]) {
      try {
        await eventsService.create(p.dto);
        removePending(p.localId);
      } catch {
        /* keep failed ones in the queue */
      }
    }
    qc.invalidateQueries({ queryKey: EVENTS_KEY });
    setSendingAll(false);
  };

  return (
    <div className="px-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-dn-warning">
            {t('offline.pendingTitle', { count: pending.length })}
          </p>
          <p className="text-xs text-dn-text-muted mt-0.5">{t('offline.pendingSub')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={clearAll}
            disabled={sendingAll}
          >
            {t('offline.discardAll')}
          </Button>
          <Button
            size="sm"
            onClick={sendAll}
            loading={sendingAll}
            disabled={!online || sendingAll}
            title={!online ? t('offline.noConnectionToSend') : undefined}
          >
            <Icon name="cloud_upload" className="text-sm" />
            {t('offline.sendAll')}
          </Button>
        </div>
      </div>

      {/* Pending event rows */}
      <Card padding={false}>
        {pending.map((p, idx) => {
          const cfg = typeIconConfig[p.dto.type ?? 'OTHER'];
          const amount = pendingNetAmount(p.dto);
          const isBusy = sending.has(p.localId) || sendingAll;

          return (
            <div
              key={p.localId}
              className={[
                'flex items-center justify-between px-5 py-3',
                idx < pending.length - 1 ? 'border-b border-white/5' : '',
              ].join(' ')}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-dn-surface-low flex items-center justify-center shrink-0">
                  <Icon name={cfg.icon} className="text-base text-dn-text-muted" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-dn-text-main truncate">
                    {p.dto.name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="gray">
                      <Icon name="cloud_off" className="text-xs mr-1" />
                      {t('offline.savedLocally')}
                    </Badge>
                    <span className="text-xs text-dn-text-muted">
                      {formatDate(p.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-2 shrink-0">
                <span className={`font-mono text-sm ${cfg.amountClass}`}>
                  {cfg.sign}{formatCurrency(amount)}
                </span>
                <button
                  onClick={() => removePending(p.localId)}
                  disabled={isBusy}
                  className="text-dn-text-muted hover:text-dn-error transition-colors disabled:opacity-40 cursor-pointer"
                  title={t('offline.discard')}
                >
                  <Icon name="delete_outline" className="text-base" />
                </button>
                <Button
                  size="sm"
                  onClick={() => sendOne(p)}
                  loading={sending.has(p.localId)}
                  disabled={!online || isBusy}
                  title={!online ? t('offline.noConnectionToSend') : undefined}
                >
                  {t('offline.send')}
                </Button>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
