const TEN_MINUTES_MS = 10 * 60 * 1000;
const THIRTY_SECONDS_MS = 30 * 1000;

export const cachePolicy = {
  reference: {
    staleTime: TEN_MINUTES_MS,
    refetchOnWindowFocus: false,
  },
  transactional: {
    staleTime: THIRTY_SECONDS_MS,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
  },
  derived: {
    staleTime: THIRTY_SECONDS_MS,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
  },
  realtime: {
    staleTime: 0,
  },
} as const;
