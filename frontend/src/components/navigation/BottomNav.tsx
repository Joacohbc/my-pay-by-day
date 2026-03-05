import { NavLink } from 'react-router-dom';
import { LayoutDashboard, List, Wallet, RefreshCcw, Settings } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Home', Icon: LayoutDashboard, end: true },
  { to: '/events', label: 'Events', Icon: List },
  { to: '/nodes', label: 'Accounts', Icon: Wallet },
  { to: '/subscriptions', label: 'Recurring', Icon: RefreshCcw },
  { to: '/settings', label: 'Settings', Icon: Settings },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800">
      <ul className="flex items-center justify-around max-w-md mx-auto px-2 h-16">
        {navItems.map(({ to, label, Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-xl transition-colors',
                  isActive
                    ? 'text-indigo-400'
                    : 'text-zinc-500 hover:text-zinc-300',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span className="text-[10px] font-medium">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
