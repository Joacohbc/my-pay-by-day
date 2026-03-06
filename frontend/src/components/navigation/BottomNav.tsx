import { NavLink } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';

const navItems = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/events', label: 'Activity', icon: 'pie_chart' },
  { to: '/nodes', label: 'Wallet', icon: 'account_balance_wallet' },
  { to: '/subscriptions', label: 'Subs', icon: 'credit_card' },
  { to: '/settings', label: 'Profile', icon: 'person' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-[80px] bg-dn-surface-low border-t border-dn-surface flex items-center justify-around px-2">
      {navItems.map(({ to, label, icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 w-16 group ${
              isActive ? '' : 'opacity-60 hover:opacity-100'
            } transition-opacity`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`w-16 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isActive
                    ? 'bg-dn-primary/20'
                    : 'group-active:bg-dn-surface'
                }`}
              >
                <Icon
                  name={icon}
                  className={`text-[24px] ${
                    isActive ? 'text-dn-primary' : 'text-dn-text-main'
                  }`}
                />
              </div>
              <span
                className={`text-[10px] font-medium ${
                  isActive ? 'text-dn-primary' : 'text-dn-text-main'
                }`}
              >
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
