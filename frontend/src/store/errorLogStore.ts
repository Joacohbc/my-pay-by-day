import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/idbStorage';

export type ClientErrorKind = 'error' | 'unhandledrejection' | 'react';

/**
 * A single unhandled frontend error, carrying its full signature so it can be traced in Loki.
 * `level` is always `error` (only unhandled errors are captured) and `source` is always `frontend`
 * so the Alloy pipeline tags it consistently with the other services.
 */
export interface ClientErrorEntry {
  level: 'error';
  source: 'frontend';
  ts: string;
  kind: ClientErrorKind;
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  line?: number;
  col?: number;
  route: string;
  userAgent: string;
  requestId: string;
  appVersion: string;
}

/** Cap so a crash loop can never grow the buffer without bound. */
const MAX_BUFFERED_ERRORS = 50;

interface ErrorLogState {
  entries: ClientErrorEntry[];
  enqueue: (entry: ClientErrorEntry) => void;
  drain: () => ClientErrorEntry[];
}

export const useErrorLogStore = create<ErrorLogState>()(
  persist(
    (set, get) => ({
      entries: [],
      enqueue: (entry) =>
        set((s) => ({
          entries: [...s.entries, entry].slice(-MAX_BUFFERED_ERRORS),
        })),
      drain: () => {
        const drained = get().entries;
        if (drained.length > 0) set({ entries: [] });
        return drained;
      },
    }),
    { name: 'mpbd-error-buffer', storage: createJSONStorage(() => zustandStorage) }
  )
);
