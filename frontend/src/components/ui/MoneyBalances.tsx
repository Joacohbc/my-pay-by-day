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
 * There is no combined figure to fall back on: the system stores no exchange rates, so 40.000 UYU
 * and 1.000 USD held in the same account are two separate balances, and any single number
 * claiming to represent both would be invented. Each line is coloured on its own sign, since one
 * currency can be overdrawn while another is not.
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
