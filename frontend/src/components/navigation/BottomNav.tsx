import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { Routes } from '@/lib/routes';

const navItems = [
  { to: Routes.DASHBOARD, labelKey: 'nav.home', icon: 'home', end: true },
  { to: Routes.EVENTS, labelKey: 'nav.activity', icon: 'pie_chart' },
  { to: Routes.CHAT, labelKey: 'nav.chat', icon: 'chat' },
  { to: Routes.PERIODS, labelKey: 'nav.periods', icon: 'calendar_month' },
  { to: Routes.SUBSCRIPTIONS, labelKey: 'nav.subs', icon: 'repeat' },
  { to: Routes.SETTINGS, labelKey: 'nav.profile', icon: 'person' },
];

export function BottomNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-[80px] bg-dn-surface-low border-t border-dn-surface flex items-center justify-around px-1">
      {navItems.map(({ to, labelKey, icon, end }) => {
        const isActive = end ? location.pathname === to : location.pathname.startsWith(to);

        return (
          <button
            key={to}
            onClick={() => {
              // Always trigger navigation on bottom nav to ensure new tabs are opened if requested
              navigate(to);
            }}
            className={`flex flex-col items-center justify-center gap-1 w-14 group ${
              isActive ? '' : 'opacity-60 hover:opacity-100'
            } transition-opacity`}
          >
            <div
              className={`w-12 h-7 rounded-full flex items-center justify-center transition-colors ${
                isActive
                  ? 'bg-dn-primary/20'
                  : 'group-active:bg-dn-surface'
              }`}
            >
              <Icon
                name={icon}
                className={`text-[22px] ${
                  isActive ? 'text-dn-primary' : 'text-dn-text-main'
                }`}
              />
            </div>
            <span
              className={`text-[9px] font-medium ${
                isActive ? 'text-dn-primary' : 'text-dn-text-main'
              }`}
            >
              {t(labelKey)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
