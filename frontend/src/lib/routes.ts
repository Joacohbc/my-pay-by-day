import type { FinanceEvent } from '@/models';

export const Routes = {
  DASHBOARD: '/',

  EVENTS: '/events',
  EVENT_DRAFTS: '/events/drafts',
  EVENT_NEW: '/events/new',
  EVENTS_DUPLICATES: '/events/duplicates',
  EVENT_DETAIL: (id: number | string) => `/events/${id}`,
  EVENT_EDIT: (id: number | string) => `/events/${id}/edit`,

  SUBSCRIPTIONS: '/subscriptions',

  CHAT: '/chat',

  AGENT_TASKS: '/chat?panel=tasks',
  AGENT_TASK_DETAIL: (id: string) => `/agent-tasks/${id}`,

  PERIODS: '/periods',
  PERIOD_DETAIL: (id: number | string) => `/periods/${id}`,

  SETTINGS: '/settings',
  SETTINGS_CATEGORIES: '/settings/categories',
  SETTINGS_TAGS: '/settings/tags',
  CATEGORY_DETAIL: (id: number | string) => `/settings/categories?highlight=${id}`,
  TAG_DETAIL: (id: number | string) => `/settings/tags?highlight=${id}`,
  SETTINGS_TAG_GROUPS: '/settings/tag-groups',
  SETTINGS_TEMPLATES: '/settings/templates',
  SETTINGS_NODES: '/settings/nodes',
  SETTINGS_FILES: '/settings/files',
  SETTINGS_AI: '/settings/ai',
  SETTINGS_DUPLICATES: '/settings/duplicates',
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

/**
 * Builds the events list URL pre-filtered to surface events similar to the given one.
 * "Similar" is defined by the event's classification — its type, category and tags —
 * which are the filters a user would otherwise have to set by hand. The query keys
 * must stay in sync with FILTER_PARAMS in EventsPage.
 */
export function similarEventsRoute(event: Pick<FinanceEvent, 'type' | 'category' | 'tags'>): string {
  const params = new URLSearchParams();

  if (event.type) params.set('type', event.type);
  if (event.category?.id) params.set('cats', String(event.category.id));

  const tagIds = event.tags?.map((tag) => tag.id).filter(Boolean) ?? [];
  if (tagIds.length) params.set('tags', tagIds.join(','));

  const query = params.toString();
  return query ? `${Routes.EVENTS}?${query}` : Routes.EVENTS;
}
