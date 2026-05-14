import { useState, useCallback } from 'react';

export type PaginationMode = 'pagination' | 'load-more';

const STORAGE_KEY = 'app-pagination-mode';

export function usePaginationMode() {
  const [mode, setMode] = useState<PaginationMode>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as PaginationMode) ?? 'pagination';
    } catch {
      return 'pagination';
    }
  });

  const toggleMode = useCallback(() => {
    const next = mode === 'pagination' ? 'load-more' : 'pagination';
    setMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, [mode]);

  return { mode, toggleMode, setMode };
}
