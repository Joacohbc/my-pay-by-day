import { Archive, Wallet, Users, Building2 } from 'lucide-react';
import type { FinanceNode } from '@/models';
import { Badge } from '@/components/ui/Badge';

interface NodeCardProps {
  node: FinanceNode;
  balance?: number;
  onClick?: () => void;
  actions?: React.ReactNode;
}

const nodeTypeConfig = {
  OWN: {
    Icon: Wallet,
    iconBg: 'bg-indigo-950 text-indigo-400',
    label: 'Own Account',
    badgeVariant: 'indigo' as const,
  },
  EXTERNAL: {
    Icon: Building2,
    iconBg: 'bg-amber-950 text-amber-400',
    label: 'External',
    badgeVariant: 'neutral' as const,
  },
  CONTACT: {
    Icon: Users,
    iconBg: 'bg-emerald-950 text-emerald-400',
    label: 'Contact',
    badgeVariant: 'income' as const,
  },
};

export function NodeCard({ node, balance, onClick, actions }: NodeCardProps) {
  const cfg = nodeTypeConfig[node.type];
  const { Icon } = cfg;

  return (
    <div
      className={[
        'flex items-center gap-3 px-4 py-3.5 bg-zinc-900 border rounded-2xl transition-colors',
        node.archived ? 'opacity-50 border-zinc-800' : 'border-zinc-800 hover:border-zinc-700',
        onClick ? 'cursor-pointer' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
    >
      <div className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-xl ${cfg.iconBg}`}>
        {node.archived ? <Archive size={18} className="text-zinc-500" /> : <Icon size={18} />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-zinc-100 truncate">{node.name}</p>
          <Badge variant={cfg.badgeVariant}>{cfg.label}</Badge>
          {node.archived && (
            <Badge variant="default">Archived</Badge>
          )}
        </div>
        {balance !== undefined && (
          <p className={`text-xs mt-0.5 font-medium tabular-nums ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {balance >= 0 ? '+' : ''}
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(balance)}
          </p>
        )}
      </div>

      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
