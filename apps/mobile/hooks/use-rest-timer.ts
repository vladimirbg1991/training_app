import { useState, useEffect, useRef } from 'react';

interface RestTimerResult {
  /** Seconds remaining (0 if expired). */
  remaining: number;
  /** 0 to 1 progress value (for ring animation). */
  progress: number;
  /** Whether the timer has expired. */
  isExpired: boolean;
  /** Human-readable remaining time, e.g. "1:24". */
  formattedTime: string;
}

/**
 * Wall-clock-anchored rest timer. Reads Date.now() on every tick.
 * Survives app backgrounding, phone lock, incoming calls.
 * Updates at 250ms intervals for smooth progress ring animation.
 */
export function useRestTimer(
  isActive: boolean,
  startedAt: number | null,
  targetSeconds: number,
): RestTimerResult {
  const [now, setNow] = useState(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isActive || !startedAt) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const tick = () => setNow(Date.now());
    tick();
    intervalRef.current = setInterval(tick, 250);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, startedAt]);

  if (!isActive || !startedAt || targetSeconds <= 0) {
    return { remaining: 0, progress: 0, isExpired: true, formattedTime: '0:00' };
  }

  const elapsed = (now - startedAt) / 1000;
  const remaining = Math.max(0, targetSeconds - elapsed);
  const progress = Math.min(1, elapsed / targetSeconds);
  const isExpired = remaining <= 0;

  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  const formattedTime = `${mins}:${String(secs).padStart(2, '0')}`;

  return { remaining, progress, isExpired, formattedTime };
}
