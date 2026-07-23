import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CreateEventDto } from '@/models';
import { zustandStorage } from '@/lib/idbStorage';
import { reportOfflineQueue } from '@/lib/rumReporter';

export interface PendingEvent {
  localId: string;
  dto: CreateEventDto;
  createdAt: string; // ISO string
}

interface PendingEventsState {
  pending: PendingEvent[];
  addPending: (dto: CreateEventDto) => void;
  removePending: (localId: string) => void;
  clearAll: () => void;
}

export const usePendingEventsStore = create<PendingEventsState>()(
  persist(
    (set) => ({
      pending: [],
      addPending: (dto) =>
        set((s) => ({
          pending: [
            ...s.pending,
            {
              localId: crypto.randomUUID(),
              dto,
              createdAt: new Date().toISOString(), // pending local state, can remain standard ISO
            },
          ],
        })),
      removePending: (localId) =>
        set((s) => ({ pending: s.pending.filter((p) => p.localId !== localId) })),
      clearAll: () => set({ pending: [] }),
    }),
    {
      name: 'mpbd-pending-events',
      storage: createJSONStorage(() => zustandStorage),
      // Rehydration is the one moment the whole queue is known regardless of which page the user
      // lands on, so it is where a queue that survived previous sessions gets reported.
      onRehydrateStorage: () => (state) => {
        const queue = state?.pending ?? [];
        const oldest = queue.reduce<string | undefined>(
          (earliest, event) => (!earliest || event.createdAt < earliest ? event.createdAt : earliest),
          undefined
        );
        reportOfflineQueue(queue.length, oldest);
      },
    }
  )
);
