import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/router';

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
  storage: {
    getItem: (key) => Promise.resolve(localStorage.getItem(key)),
    setItem: (key, value) => Promise.resolve(localStorage.setItem(key, value)),
    removeItem: (key) => Promise.resolve(localStorage.removeItem(key)),
  },
  key: 'mpbd-query-cache',
});

function App() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <RouterProvider router={router} />
    </PersistQueryClientProvider>
  );
}

export default App;
