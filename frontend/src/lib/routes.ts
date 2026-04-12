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
  SETTINGS_TEMPLATES: '/settings/templates',
  SETTINGS_NODES: '/settings/nodes',
  SETTINGS_FILES: '/settings/files',
} as const;
