import { useEffect, useRef, useState } from 'react';

/**
 * Tracks elapsed seconds while `running` is true. Resets to 0 when running
 * flips back to false. Ticks every 500ms.
 */
export const useJobTimer = (running: boolean): number => {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) {
      startRef.current = null;
      setElapsed(0);
      return;
    }

    startRef.current = Date.now();
    setElapsed(0);
    const interval = window.setInterval(() => {
      if (startRef.current != null) {
        setElapsed((Date.now() - startRef.current) / 1000);
      }
    }, 500);

    return () => window.clearInterval(interval);
  }, [running]);

  return elapsed;
};
