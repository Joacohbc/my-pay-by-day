import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

// The three primitive types a URL param can represent after parsing.
// We keep it narrow on purpose: dates, arrays, objects etc. don't round-trip
// cleanly through a URL string, so we don't pretend to support them.
type ParamType = 'string' | 'number' | 'boolean';

// A single parsed param value. `undefined` means "not present / use default".
export type SearchParamValue = string | number | boolean | undefined;

// Configuration for a single URL search param.
export interface ParamConfig {
  key: string;          // the URL param name, e.g. "page"
  defaultValue: SearchParamValue;  // value to use when the param is absent
  type?: ParamType;     // how to parse the raw string (defaults to 'string')
}

// A record of field names to their parsed values.
export type SearchParamsRecord = Record<string, SearchParamValue>;

function parseValue(raw: string | null, defaultValue: SearchParamValue, type: ParamType): SearchParamValue {
  if (raw === null || raw === '') return defaultValue;
  switch (type) {
    case 'number': {
      const n = Number(raw);
      return isNaN(n) ? defaultValue : n;
    }
    case 'boolean':
      return raw === 'true';
    default:
      return raw;
  }
}

function serializeValue(value: SearchParamValue, defaultValue: SearchParamValue): string | null {
  if (value === defaultValue || value === undefined || value === null || value === '') return null;
  return String(value);
}

/**
 * Syncs a single value with a URL search param.
 * Returns [value, setValue] like useState.
 */
export function useSearchParamState(
  key: string,
  defaultValue: SearchParamValue,
  type: ParamType = 'string',
): [SearchParamValue, (value: SearchParamValue) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get(key);
  const value = parseValue(raw, defaultValue, type);

  const setValue = useCallback(
    (newValue: SearchParamValue) => {
      setSearchParams((prev) => {
        const serialized = serializeValue(newValue, defaultValue);
        const current = prev.get(key);
        if (serialized === current) return prev;

        const next = new URLSearchParams(prev);
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
export function useSearchParamsBatch(
  configs: Record<string, ParamConfig>,
): {
  values: SearchParamsRecord;
  setValues: (partial: Partial<SearchParamsRecord>) => void;
  clearAll: () => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();

  const configEntries = useMemo(
    () => Object.entries(configs),
    [configs],
  );

  const values: SearchParamsRecord = {};

  for (const [field, config] of configEntries) {
    const raw = searchParams.get(config.key);
    values[field] = parseValue(raw, config.defaultValue, config.type ?? 'string');
  }

  const setValues = useCallback(
    (partial: Partial<SearchParamsRecord>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        let changed = false;

        for (const [field, newValue] of Object.entries(partial)) {
          const config = configs[field];
          if (!config) continue;
          const serialized = serializeValue(newValue, config.defaultValue);
          const current = prev.get(config.key);
          if (serialized !== current) {
            if (serialized === null) {
              next.delete(config.key);
            } else {
              next.set(config.key, serialized);
            }
            changed = true;
          }
        }
        return changed ? next : prev;
      }, { replace: true });
    },
    [configs, setSearchParams],
  );

  const clearAll = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      let changed = false;
      for (const [, config] of configEntries) {
        if (prev.has(config.key)) {
          next.delete(config.key);
          changed = true;
        }
      }
      return changed ? next : prev;
    }, { replace: true });
  }, [configEntries, setSearchParams]);

  return { values, setValues, clearAll };
}
