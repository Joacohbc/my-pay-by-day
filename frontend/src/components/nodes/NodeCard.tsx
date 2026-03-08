import type { FinanceNode } from '@/models';
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
    label: 'Own Account',
    badgeVariant: 'indigo' as const,
  },
  EXTERNAL: {
    icon: 'storefront',
    iconBg: 'bg-dn-tertiary/10 text-dn-tertiary',
    label: 'External',
    badgeVariant: 'neutral' as const,
  },
  CONTACT: {
    icon: 'group',
    iconBg: 'bg-dn-success/10 text-dn-success',
    label: 'Contact',
    badgeVariant: 'income' as const,
  },
};

export function NodeCard({ node, balance, onClick, actions }: NodeCardProps) {
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
          <Badge variant={cfg.badgeVariant}>{cfg.label}</Badge>
          {node.archived && <Badge variant="default">Archived</Badge>}
        </div>
        {balance !== undefined && (
          <p className={`text-sm mt-0.5 font-mono ${balance >= 0 ? 'text-dn-success' : 'text-dn-error'}`}>
            {balance >= 0 ? '+' : ''}
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(balance)}
          </p>
        )}
      </div>

      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
