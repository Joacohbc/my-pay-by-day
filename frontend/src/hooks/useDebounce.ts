import { useState, useEffect, useRef, useMemo } from 'react';

/**
 * Hook to debounce a value.
 * Returns the debounced value after the specified delay.
 *
 * Technical note: Uses useState + useEffect to trigger a re-render when the debounced
 * value finally updates, allowing the UI to react to the delay.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook to debounce a callback function.
 * Returns a stable debounced version of the provided function.
 *
 * Technical note: Uses useRef + useMemo to provide a stable function that manages an
 * internal timer (timeoutRef) without causing re-renders when the timer state changes.
 * UseRef (callbackRef) ensures the latest version of the callback is always used.
 */
export function useDebounceCallback<Args extends unknown[]>(
  callback: (...args: Args) => unknown,
  delay: number
) {
  const callbackRef = useRef<(...args: Args) => unknown>(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Always point to the latest version of the passed function
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Create a stable debounced wrapper
  const debouncedFunc = useMemo(() => {
    return (...args: Args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    };
  }, [delay]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedFunc;
}

