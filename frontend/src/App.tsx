import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/router';
import { AlertProvider } from '@/contexts/AlertContext';

import { queryStorage } from '@/lib/idbStorage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      gcTime: 1000 * 60 * 60 * 24, // 24h — keep cache for offline use
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: queryStorage,
  key: 'mpbd-query-cache',
});

function App() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <AlertProvider>
        <RouterProvider router={router} />
      </AlertProvider>
    </PersistQueryClientProvider>
  );
}

export default App;
