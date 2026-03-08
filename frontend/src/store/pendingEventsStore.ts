import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CreateEventDto } from '@/models';

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
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      removePending: (localId) =>
        set((s) => ({ pending: s.pending.filter((p) => p.localId !== localId) })),
      clearAll: () => set({ pending: [] }),
    }),
    { name: 'mpbd-pending-events' }
  )
);
