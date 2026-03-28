import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

type ParamType = 'string' | 'number' | 'boolean';

interface ParamConfig<T> {
  key: string;
  defaultValue: T;
  type?: ParamType;
}

function parseValue<T>(raw: string | null, defaultValue: T, type: ParamType): T {
  if (raw === null || raw === '') return defaultValue;
  switch (type) {
    case 'number': {
      const n = Number(raw);
      return (isNaN(n) ? defaultValue : n) as T;
    }
    case 'boolean':
      return (raw === 'true') as unknown as T;
    default:
      return raw as unknown as T;
  }
}

function serializeValue<T>(value: T, defaultValue: T): string | null {
  if (value === defaultValue || value === undefined || value === null || value === '') return null;
  return String(value);
}

/**
 * Syncs a single value with a URL search param.
 * Returns [value, setValue] like useState.
 */
export function useSearchParamState<T extends string | number | boolean | undefined>(
  key: string,
  defaultValue: T,
  type: ParamType = 'string',
): [T, (value: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get(key);
  const value = parseValue(raw, defaultValue, type);

  const setValue = useCallback(
    (newValue: T) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        const serialized = serializeValue(newValue, defaultValue);
        if (serialized === null) {
          next.delete(key);
        } else {
          next.set(key, serialized);
        }
        return next;
      }, { replace: true });
    },
    [key, defaultValue, setSearchParams],
  );

  return [value, setValue];
}

/**
 * Batch-read multiple search params at once and return a batch setter.
 * Useful when you need to clear or set multiple params atomically.
 */
export function useSearchParamsBatch<T extends Record<string, string | number | boolean | undefined>>(
  configs: { [K in keyof T]: ParamConfig<T[K]> },
): {
  values: T;
  setValues: (partial: Partial<T>) => void;
  clearAll: () => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();

  const values = {} as T;
  const configEntries = Object.entries(configs) as [keyof T, ParamConfig<T[keyof T]>][];

  for (const [field, config] of configEntries) {
    const raw = searchParams.get(config.key);
    values[field] = parseValue(raw, config.defaultValue, config.type ?? 'string');
  }

  const setValues = useCallback(
    (partial: Partial<T>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [field, newValue] of Object.entries(partial)) {
          const config = configs[field as keyof T];
          if (!config) continue;
          const serialized = serializeValue(newValue, config.defaultValue);
          if (serialized === null) {
            next.delete(config.key);
          } else {
            next.set(config.key, serialized);
          }
        }
        return next;
      }, { replace: true });
    },
    [configs, setSearchParams],
  );

  const clearAll = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [, config] of configEntries) {
        next.delete(config.key);
      }
      return next;
    }, { replace: true });
  }, [configs, setSearchParams]);

  return { values, setValues, clearAll };
}
