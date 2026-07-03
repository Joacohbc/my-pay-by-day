import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Shared debounce-before-send + cancel logic for chat widgets: `schedule` starts a visible
 * countdown (for the UI to render a "sending in Ns" affordance) and fires the given callback when
 * it reaches zero; `sendNow` skips the wait. Used by every chat hook (ChatPage, the scoped
 * entity-agent widget, the form-patch widget) so the debounce behavior stays in one place.
 */
export function useSendCountdown(delaySeconds = 5) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingSendRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    pendingSendRef.current = null;
    setCountdown(null);
  }, []);

  const fireNow = useCallback(() => {
    const send = pendingSendRef.current;
    clear();
    send?.();
  }, [clear]);

  const schedule = useCallback(
    (send: () => void) => {
      clear();
      pendingSendRef.current = send;
      let timeLeft = delaySeconds;
      setCountdown(timeLeft);
      intervalRef.current = setInterval(() => {
        timeLeft -= 1;
        if (timeLeft <= 0) {
          fireNow();
        } else {
          setCountdown(timeLeft);
        }
      }, 1000);
    },
    [clear, delaySeconds, fireNow],
  );

  return { countdown, schedule, sendNow: fireNow, cancel: clear };
}
