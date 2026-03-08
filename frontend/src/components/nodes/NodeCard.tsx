import { useTranslation } from 'react-i18next';
import type { FinanceNode } from '@/models';
import { formatCurrency } from '@/lib/format';
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
        node.archived ? 'opacity-50' : '',
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
        <div className="flex items-center gap-2">
          <p className="text-base font-medium text-dn-text-main truncate">{node.name}</p>
          <Badge variant={cfg.badgeVariant}>{t(cfg.labelKey)}</Badge>
          {node.archived && <Badge variant="default">{t('common.archived')}</Badge>}
        </div>
        {balance !== undefined && (
          <p className={`text-sm mt-0.5 font-mono ${balance >= 0 ? 'text-dn-success' : 'text-dn-error'}`}>
            {balance >= 0 ? '+' : ''}
            {formatCurrency(balance)}
          </p>
        )}
      </div>

      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
