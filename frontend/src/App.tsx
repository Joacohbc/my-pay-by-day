import { QueryClient, defaultShouldDehydrateQuery } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/router';
import { AlertProvider } from '@/contexts/AlertContext';
import { AppErrorBoundary } from '@/components/ui/AppErrorBoundary';

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 seconds
      retry: 1,
      gcTime: 1000 * 60 * 60 * 24, // 24h — keep cache for offline use
    },
  },
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
