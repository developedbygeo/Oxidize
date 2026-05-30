import { useEffect, useRef, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { DragDropEvent } from '@tauri-apps/api/webview';

type UseOsDragArgs = {
  /** Called once for each drop. Paths are filtered by `accept` first. */
  onDrop: (paths: string[]) => void;
  /** Returns true to keep a path; defaults to accepting everything. */
  accept?: (path: string) => boolean;
};

/**
 * Watches the Tauri window's drag-drop channel so dropzones can both:
 *   - light up while the user is dragging files over the window from the OS
 *     (HTML drag events don't fire for native OS drags), and
 *   - receive the dropped paths even though the webview never sees them.
 */
export const useOsDrag = ({ onDrop, accept }: UseOsDragArgs) => {
  const [isOsDragOver, setIsOsDragOver] = useState(false);

  // Stash refs so the effect doesn't need onDrop/accept as deps — keeps the
  // Tauri listener stable for the whole component lifetime.
  const onDropRef = useRef(onDrop);
  const acceptRef = useRef(accept);

  useEffect(() => {
    onDropRef.current = onDrop;
  }, [onDrop]);

  useEffect(() => {
    acceptRef.current = accept;
  }, [accept]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    getCurrentWindow()
      .onDragDropEvent((event) => {
        const payload: DragDropEvent = event.payload;
        if (payload.type === 'enter' || payload.type === 'over') {
          setIsOsDragOver(true);
          return;
        }
        if (payload.type === 'leave') {
          setIsOsDragOver(false);
          return;
        }
        if (payload.type === 'drop') {
          setIsOsDragOver(false);
          const filter = acceptRef.current;
          const paths = filter ? payload.paths.filter(filter) : payload.paths;
          if (paths.length > 0) onDropRef.current(paths);
        }
      })
      .then((fn) => {
        if (cancelled) fn();
        else unlisten = fn;
      })
      .catch((err) => console.error('Failed to register drag-drop listener:', err));

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  return { isOsDragOver };
};
