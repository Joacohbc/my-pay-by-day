import { Icon } from '@/components/ui/Icon';
import type { FinanceLineItem, FinanceNode } from '@/models';
import { twMerge } from 'tailwind-merge';

interface NodeIconProps {
  node?: FinanceNode | FinanceLineItem;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'rounded' | 'rounded-md' | 'rounded-lg' | 'rounded-xl' | 'rounded-2xl' | 'rounded-full' | 'rounded-none';
  /** Overrides the type-based color. */
  colorClass?: string;
  className?: string;
  style?: React.CSSProperties;
}

const sizeMap = {
  sm: { container: 'w-8 h-8', icon: 'text-sm' },
  md: { container: 'w-10 h-10', icon: 'text-base' },
  lg: { container: 'w-12 h-12', icon: 'text-xl' },
};

const nodeTypeConfig = {
  OWN:      { icon: 'account_balance_wallet', colorClass: 'bg-dn-primary/10 text-dn-primary' },
  EXTERNAL: { icon: 'storefront',             colorClass: 'bg-dn-tertiary/10 text-dn-tertiary' },
  CONTACT:  { icon: 'group',                  colorClass: 'bg-dn-success/10 text-dn-success' },
  DEFAULT:  { icon: 'payments',               colorClass: 'bg-dn-surface-alt text-dn-text-muted' },
};

function isFinanceNode(node: FinanceNode | FinanceLineItem): node is FinanceNode {
  return 'type' in node;
}

export function NodeIcon({
  node,
  size = 'md',
  shape = 'rounded-2xl',
  colorClass,
  className = '',
  style,
}: NodeIconProps) {
  const { container, icon: iconSize } = sizeMap[size];

  const cfg = node && isFinanceNode(node)
    ? nodeTypeConfig[node.type]
    : nodeTypeConfig.DEFAULT;

  
  const isFinanceNodeWithCustomIcon = node && isFinanceNode(node) && node.icon;
  const isFinanceLineItemWithCustomIcon = node && !isFinanceNode(node) && node.financeNodeIcon;

  const iconName = isFinanceNodeWithCustomIcon 
    ? node.icon!
    : isFinanceLineItemWithCustomIcon
      ? node.financeNodeIcon!
      : cfg.icon;

  const archived = !!node && isFinanceNode(node) && node.archived;

  const customColor = node && isFinanceNode(node) ? node.color : undefined;
  const customColorStyle = !archived && customColor
    ? { color: customColor, backgroundColor: `${customColor}1A` }
    : undefined;

  return (
    <div
      className={twMerge(
        `${container} flex items-center justify-center ${shape} shrink-0`,
        customColorStyle ? '' : (colorClass ?? cfg.colorClass),
        className
      )}
      style={{ ...customColorStyle, ...style }}
    >
      {archived ? (
        <Icon name="archive" className={`${iconSize} text-dn-text-muted`} />
      ) : (
        <Icon name={iconName} className={iconSize} />
      )}
    </div>
  );
}
