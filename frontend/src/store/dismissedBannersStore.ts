import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const BANNER_IDS = {
  PERIODS_INFO: 'periods-info',
  SUBSCRIPTIONS_HOW_IT_WORKS: 'subscriptions-how-it-works',
  AI_SETTINGS_INFO: 'ai-settings-info',
} as const;

export type BannerId = (typeof BANNER_IDS)[keyof typeof BANNER_IDS];

interface DismissedBannersState {
  dismissedIds: BannerId[];
  dismiss: (id: BannerId) => void;
}

export const useDismissedBannersStore = create<DismissedBannersState>()(
  persist(
    (set) => ({
      dismissedIds: [],
      dismiss: (id) =>
        set((s) => ({
          dismissedIds: s.dismissedIds.includes(id)
            ? s.dismissedIds
            : [...s.dismissedIds, id],
        })),
    }),
    { name: 'mpbd-dismissed-banners' }
  )
);

export function useBanner(id: BannerId) {
  const isVisible = useDismissedBannersStore((s) => !s.dismissedIds.includes(id));
  const dismiss = useDismissedBannersStore((s) => s.dismiss);
  return { isVisible, dismiss: () => dismiss(id) };
}
