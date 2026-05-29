import { useEffect, useRef } from 'react';

type ShortcutOptions = {
  /** Require Ctrl (Win/Linux) or Cmd (Mac) modifier. Default: false. */
  meta?: boolean;
  /** Only attach the listener when true. Default: true. */
  enabled?: boolean;
};

const matchesKey = (e: KeyboardEvent, key: string): boolean => {
  if (key.length === 1) return e.key.toLowerCase() === key.toLowerCase();
  return e.key === key;
};

export const useKeyboardShortcut = (
  key: string,
  handler: () => void,
  { meta = false, enabled = true }: ShortcutOptions = {}
) => {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;

    const listener = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (meta !== isMod) return;
      if (!matchesKey(e, key)) return;
      e.preventDefault();
      handlerRef.current();
    };

    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [key, meta, enabled]);
};
