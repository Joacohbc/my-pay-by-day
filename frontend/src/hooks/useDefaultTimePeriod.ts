import { useState, useCallback } from 'react';

const STORAGE_KEY = 'defaultTimePeriodId';

export function useDefaultTimePeriod() {
  const [defaultId, setDefaultIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = parseInt(stored, 10);
    return isNaN(parsed) ? null : parsed;
  });

  const setDefaultId = useCallback((id: number | null) => {
    if (id === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, String(id));
    }
    setDefaultIdState(id);
  }, []);

  return { defaultId, setDefaultId };
}
