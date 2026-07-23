import { QueryClient, QueryCache, MutationCache, defaultShouldDehydrateQuery } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/router';
import { AlertProvider } from '@/contexts/AlertContext';
import { AppErrorBoundary } from '@/components/ui/AppErrorBoundary';

import { apiLogger } from '@/lib/logger';
import { queryStorage } from '@/lib/idbStorage';
import {
  eventKeys,
  draftKeys,
  categoryKeys,
  tagKeys,
  tagGroupKeys,
  nodeKeys,
  timePeriodKeys,
  subscriptionKeys,
  templateKeys,
  duplicateKeys,
} from '@/lib/queryKeys';

function describeKey(key: unknown): string {
  try {
    return JSON.stringify(key);
  } catch {
    return String(key);
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// The single boundary that ships every react-query failure to Loki (kind:'api'). Call sites that
// wrap a query/mutation only handle UI here — they must not log again, or the error ships twice.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 seconds
      retry: 1,
      gcTime: 1000 * 60 * 60 * 24, // 24h — keep cache for offline use
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) =>
      apiLogger.error(`query failed: ${messageOf(error)}`, { error, queryKey: describeKey(query.queryKey) }),
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) =>
      apiLogger.error(`mutation failed: ${messageOf(error)}`, { error, mutationKey: describeKey(mutation.options.mutationKey) }),
  }),
});

const persister = createAsyncStoragePersister({
  storage: queryStorage,
  key: 'mpbd-query-cache',
});

const PERSISTED_ROOT_KEYS = new Set<unknown>([
  eventKeys.all[0],
  draftKeys.all[0],
  categoryKeys.all[0],
  tagKeys.all[0],
  tagGroupKeys.all[0],
  nodeKeys.all[0],
  timePeriodKeys.all[0],
  subscriptionKeys.all[0],
  templateKeys.all[0],
  duplicateKeys.settings[0],
]);

function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        buster: 'domain-filtered-v1',
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            defaultShouldDehydrateQuery(query) && PERSISTED_ROOT_KEYS.has(query.queryKey[0]),
        },
      }}
    >
      <AlertProvider>
        <AppErrorBoundary>
          <RouterProvider router={router} />
        </AppErrorBoundary>
      </AlertProvider>
    </PersistQueryClientProvider>
  );
}

export default App;
