import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/idbStorage';

/**
 * The currency every view reports in. `null` lists each currency on its own; a principal currency
 * converts every event with the rate frozen on it; any other currency keeps only the events
 * recorded in it.
 */
interface DisplayCurrencyState {
  displayCurrency: string | null;
  setDisplayCurrency: (currency: string | null) => void;
}

export const useDisplayCurrencyStore = create<DisplayCurrencyState>()(
  persist(
    (set) => ({
      displayCurrency: null,
      setDisplayCurrency: (currency) => set({ displayCurrency: currency }),
    }),
    { name: 'mpbd-display-currency', storage: createJSONStorage(() => zustandStorage) }
  )
);

export function useDisplayCurrency(): string | null {
  return useDisplayCurrencyStore((state) => state.displayCurrency);
}
