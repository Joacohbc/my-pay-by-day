import { Routes } from '@/lib/routes';

export function getTitleFromPath(pathname: string): string {
  if (pathname === Routes.DASHBOARD) return 'Dashboard';
  if (pathname === Routes.EVENTS) return 'Activity';
  if (pathname === Routes.EVENT_DRAFTS) return 'Drafts';
  if (pathname === Routes.EVENT_NEW) return 'New Event';
  if (pathname.startsWith('/events/') && pathname.endsWith('/edit')) return 'Edit Event';
  if (pathname.startsWith('/events/')) return 'Event Detail';
  if (pathname === Routes.SUBSCRIPTIONS) return 'Subscriptions';
  if (pathname === Routes.CHAT) return 'AI Chat';
  if (pathname === Routes.PERIODS) return 'Periods';
  if (pathname.startsWith('/periods/')) return 'Period Detail';
  if (pathname === Routes.SETTINGS) return 'Settings';
  if (pathname === Routes.SETTINGS_CATEGORIES) return 'Categories';
  if (pathname === Routes.SETTINGS_TAGS) return 'Tags';
  if (pathname === Routes.SETTINGS_TAG_GROUPS) return 'Tag Groups';
  if (pathname === Routes.SETTINGS_TEMPLATES) return 'Templates';
  if (pathname === Routes.SETTINGS_NODES) return 'Nodes';
  if (pathname === Routes.SETTINGS_FILES) return 'Files';
  if (pathname === Routes.SETTINGS_AI) return 'AI Settings';

  return 'App';
}
