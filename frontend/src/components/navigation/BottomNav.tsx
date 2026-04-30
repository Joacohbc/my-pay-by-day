import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { Routes } from '@/lib/routes';
import { useAgentTasks } from '@/hooks/useAgentTasks';

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
  const { data: tasks } = useAgentTasks();
  
  const activeTasksCount = tasks?.filter(t => t.status === 'RUNNING' || t.actions?.some(a => a.status === 'PENDING_APPROVAL')).length ?? 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-[80px] bg-dn-surface-low border-t border-dn-surface flex items-center justify-around px-1">
      {navItems.map(({ to, labelKey, icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 w-14 group ${
              isActive ? '' : 'opacity-60 hover:opacity-100'
            } transition-opacity`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`w-12 h-7 rounded-full flex items-center justify-center transition-colors relative ${
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
                {labelKey === 'nav.chat' && activeTasksCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-dn-primary rounded-full border-2 border-dn-surface-low" />
                )}
              </div>
              <span
                className={`text-[9px] font-medium ${
                  isActive ? 'text-dn-primary' : 'text-dn-text-main'
                }`}
              >
                {t(labelKey)}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
