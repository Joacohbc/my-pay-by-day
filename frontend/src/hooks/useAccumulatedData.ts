/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';

export function useAccumulatedData<T extends { id: number | string }>(
  data: T[] | undefined,
  page: number,
  setPage: (page: number) => void,
  dependencies: unknown[]
) {
  const [accumulatedData, setAccumulatedData] = useState<T[]>([]);

  // Reset when filters or mode change
  useEffect(() => {
    setAccumulatedData((prev) => (prev.length === 0 ? prev : []));
    if (page !== 0) {
      setPage(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies]);

  useEffect(() => {
    if (data) {
      if (page === 0) {
        setAccumulatedData(data);
      } else {
        setAccumulatedData((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const newItems = data.filter((i) => !existingIds.has(i.id));
          return [...prev, ...newItems];
        });
      }
    }
  }, [data, page]);

  const displayedData = accumulatedData;

  return {
    displayedData,
  };
}
