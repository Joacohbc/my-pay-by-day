import type { Money } from '@/models';
import { formatCompactMoney, formatMoney } from '@/lib/format';

interface MoneyBalancesProps {
  balances: Money[];
  /** Renders the abbreviated form (1,2 mil) on narrow screens, the full amount from `sm` up. */
  responsive?: boolean;
  showSign?: boolean;
  className?: string;
}

/**
 * Renders a balance that may span several currencies, one line per currency.
 *
 * Two currencies are never added here: a combined figure only exists when the backend converted
 * each movement with the rate frozen on it, and then it arrives as a single line. Each line is
 * coloured on its own sign, since one currency can be overdrawn while another is not.
 */
export function MoneyBalances({ balances, responsive, showSign, className }: MoneyBalancesProps) {
  if (balances.length === 0) return null;

  return (
    <span className={className}>
      {balances.map(({ amount, currency }) => (
        <span
          key={currency}
          className={`block font-mono ${amount >= 0 ? 'text-dn-success' : 'text-dn-error'}`}
        >
          {responsive ? (
            <>
              <span className="inline sm:hidden">{formatCompactMoney(amount, currency)}</span>
              <span className="hidden sm:inline">
                {showSign && amount >= 0 ? '+' : ''}
                {formatMoney(amount, currency)}
              </span>
            </>
          ) : (
            <>
              {showSign && amount >= 0 ? '+' : ''}
              {formatMoney(amount, currency)}
            </>
          )}
        </span>
      ))}
    </span>
  );
}
