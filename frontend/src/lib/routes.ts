export const Routes = {
  DASHBOARD: '/',

  EVENTS: '/events',
  EVENT_NEW: '/events/new',
  EVENT_DETAIL: (id: number | string) => `/events/${id}`,
  EVENT_EDIT: (id: number | string) => `/events/${id}/edit`,

  SUBSCRIPTIONS: '/subscriptions',

  CHAT: '/chat',

  PERIODS: '/periods',
  PERIOD_DETAIL: (id: number | string) => `/periods/${id}`,

  SETTINGS: '/settings',
  SETTINGS_CATEGORIES: '/settings/categories',
  SETTINGS_TAGS: '/settings/tags',
  SETTINGS_TAG_GROUPS: '/settings/tag-groups',
  SETTINGS_TEMPLATES: '/settings/templates',
  SETTINGS_NODES: '/settings/nodes',
  SETTINGS_FILES: '/settings/files',
  SETTINGS_AI: '/settings/ai',
} as const;

const EVENTS_SEARCH_KEY = 'events.lastSearch';

export function saveEventsSearch(search: string) {
  sessionStorage.setItem(EVENTS_SEARCH_KEY, search);
}

/** Returns the events list URL restoring the last active filters, or plain /events. */
export function eventsRoute(): string {
  const saved = sessionStorage.getItem(EVENTS_SEARCH_KEY);
  return `${Routes.EVENTS}${saved || ''}`;
}
