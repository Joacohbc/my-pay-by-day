import { useTranslation } from 'react-i18next';
import type { FinanceNode, Money } from '@/models';
import { MoneyBalances } from '@/components/ui/MoneyBalances';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { NodeIcon } from '@/components/ui/NodeIcon';

interface NodeCardProps {
  node: FinanceNode;
  /** One entry per currency the node holds; amounts are never combined across currencies. */
  balance?: Money[];
  onClick?: () => void;
  actions?: React.ReactNode;
  hideTypeBadge?: boolean;
}

const nodeTypeConfig = {
  OWN: {
    labelKey: 'nodeType.OWN',
    badgeVariant: 'indigo' as const,
  },
  EXTERNAL: {
    labelKey: 'nodeType.EXTERNAL',
    badgeVariant: 'neutral' as const,
  },
  CONTACT: {
    labelKey: 'nodeType.CONTACT',
    badgeVariant: 'income' as const,
  },
};

export function NodeCard({ node, balance, onClick, actions, hideTypeBadge }: NodeCardProps) {
  const { t } = useTranslation();
  const cfg = nodeTypeConfig[node.type];

  return (
    <div
      className={[
        'flex flex-col p-4 bg-dn-surface rounded-card transition-all',
        node.archived ? 'bg-dn-surface/50' : '',
        onClick ? 'cursor-pointer active:scale-[0.99]' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
    >
      {/* Card Content */}
      <div className="flex items-center gap-4 w-full">
        <div className={`shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl`}>
          {node.archived ? (
            <Icon name="archive" className="text-dn-text-muted" />
          ) : (
            <NodeIcon node={node} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-base font-medium text-dn-text-main break-words">{node.name}</p>
            <div className="flex gap-2">
              {!hideTypeBadge && <Badge variant={cfg.badgeVariant}>{t(cfg.labelKey)}</Badge>}
              {node.archived && <Badge variant="default">{t('common.archived')}</Badge>}
            </div>
          </div>
          {balance !== undefined && (
            <MoneyBalances balances={balance} responsive showSign className="text-sm mt-0.5" />
          )}
        </div>

        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      {node.description && (
        <p className="text-xs text-dn-text-muted mt-2 pb-2 pr-2 pl-2 text-pretty">{node.description}</p>
      )}
    </div>
  );
}
