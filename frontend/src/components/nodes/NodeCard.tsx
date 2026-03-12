import { useTranslation } from 'react-i18next';
import type { FinanceNode } from '@/models';
import { formatCurrency, formatCompactCurrency } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';

interface NodeCardProps {
  node: FinanceNode;
  balance?: number;
  onClick?: () => void;
  actions?: React.ReactNode;
}

const nodeTypeConfig = {
  OWN: {
    icon: 'account_balance_wallet',
    iconBg: 'bg-dn-primary/10 text-dn-primary',
    labelKey: 'nodeType.OWN',
    badgeVariant: 'indigo' as const,
  },
  EXTERNAL: {
    icon: 'storefront',
    iconBg: 'bg-dn-tertiary/10 text-dn-tertiary',
    labelKey: 'nodeType.EXTERNAL',
    badgeVariant: 'neutral' as const,
  },
  CONTACT: {
    icon: 'group',
    iconBg: 'bg-dn-success/10 text-dn-success',
    labelKey: 'nodeType.CONTACT',
    badgeVariant: 'income' as const,
  },
};

export function NodeCard({ node, balance, onClick, actions }: NodeCardProps) {
  const { t } = useTranslation();
  const cfg = nodeTypeConfig[node.type];

  return (
    <div
      className={[
        'flex items-center gap-4 p-4 bg-dn-surface rounded-card transition-all',
        node.archived ? 'bg-dn-surface/50' : '',
        onClick ? 'cursor-pointer active:scale-[0.99]' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
    >
      <div className={`shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl ${cfg.iconBg}`}>
        {node.archived ? (
          <Icon name="archive" className="text-dn-text-muted" />
        ) : (
          <Icon name={cfg.icon} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-base font-medium text-dn-text-main break-words">{node.name}</p>
          <div className="flex gap-2">
            <Badge variant={cfg.badgeVariant}>{t(cfg.labelKey)}</Badge>
            {node.archived && <Badge variant="default">{t('common.archived')}</Badge>}
          </div>
        </div>
        {balance !== undefined && (
          <p className={`text-sm mt-0.5 font-mono ${balance >= 0 ? 'text-dn-success' : 'text-dn-error'}`}>
            <span className="inline sm:hidden">{formatCompactCurrency(balance)}</span>
            <span className="hidden sm:inline">{balance >= 0 ? '+' : ''}{formatCurrency(balance)}</span>
          </p>
        )}
      </div>

      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
