import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

type DragPayload =
  | { type: 'enter' | 'over'; paths: string[] }
  | { type: 'leave' }
  | { type: 'drop'; paths: string[] };

type Listener = (event: { payload: DragPayload }) => void;

let registered: Listener | undefined;
const unlisten = vi.fn();
const onDragDropEvent = vi.fn();

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    onDragDropEvent: (cb: Listener) => onDragDropEvent(cb),
  }),
}));

const { useOsDrag } = await import('./useOsDrag');

beforeEach(() => {
  registered = undefined;
  unlisten.mockReset();
  onDragDropEvent.mockReset().mockImplementation((cb: Listener) => {
    registered = cb;
    return Promise.resolve(unlisten);
  });
});

const fire = (payload: DragPayload) => {
  if (!registered) throw new Error('listener not registered');
  registered({ payload });
};

describe('useOsDrag', () => {
  it('registers a window drag-drop listener on mount', async () => {
    renderHook(() => useOsDrag({ onDrop: () => {} }));
    await waitFor(() => expect(onDragDropEvent).toHaveBeenCalledOnce());
  });

  it('sets isOsDragOver to true on enter and over', async () => {
    const { result } = renderHook(() => useOsDrag({ onDrop: () => {} }));
    await waitFor(() => expect(registered).toBeDefined());

    expect(result.current.isOsDragOver).toBe(false);
    act(() => fire({ type: 'enter', paths: ['/a.png'] }));
    expect(result.current.isOsDragOver).toBe(true);

    act(() => fire({ type: 'leave' }));
    expect(result.current.isOsDragOver).toBe(false);

    act(() => fire({ type: 'over', paths: ['/a.png'] }));
    expect(result.current.isOsDragOver).toBe(true);
  });

  it('calls onDrop with all paths when accept is not provided', async () => {
    const onDrop = vi.fn<(paths: string[]) => void>();
    renderHook(() => useOsDrag({ onDrop }));
    await waitFor(() => expect(registered).toBeDefined());

    act(() => fire({ type: 'drop', paths: ['/a.png', '/b.mp4'] }));
    expect(onDrop).toHaveBeenCalledWith(['/a.png', '/b.mp4']);
  });

  it('filters drop paths through accept', async () => {
    const onDrop = vi.fn<(paths: string[]) => void>();
    renderHook(() =>
      useOsDrag({ onDrop, accept: (p) => p.toLowerCase().endsWith('.png') })
    );
    await waitFor(() => expect(registered).toBeDefined());

    act(() => fire({ type: 'drop', paths: ['/a.png', '/b.mp4', '/C.PNG'] }));
    expect(onDrop).toHaveBeenCalledWith(['/a.png', '/C.PNG']);
  });

  it('does not invoke onDrop when accept filters all paths out', async () => {
    const onDrop = vi.fn<(paths: string[]) => void>();
    renderHook(() => useOsDrag({ onDrop, accept: () => false }));
    await waitFor(() => expect(registered).toBeDefined());

    act(() => fire({ type: 'drop', paths: ['/a.png'] }));
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('clears isOsDragOver on drop', async () => {
    const { result } = renderHook(() => useOsDrag({ onDrop: () => {} }));
    await waitFor(() => expect(registered).toBeDefined());

    act(() => fire({ type: 'enter', paths: [] }));
    expect(result.current.isOsDragOver).toBe(true);

    act(() => fire({ type: 'drop', paths: ['/a.png'] }));
    expect(result.current.isOsDragOver).toBe(false);
  });

  it('uses the latest onDrop reference without re-registering the listener', async () => {
    const first = vi.fn<(paths: string[]) => void>();
    const second = vi.fn<(paths: string[]) => void>();
    const { rerender } = renderHook(
      ({ fn }: { fn: (paths: string[]) => void }) => useOsDrag({ onDrop: fn }),
      { initialProps: { fn: first } }
    );
    await waitFor(() => expect(registered).toBeDefined());

    rerender({ fn: second });
    act(() => fire({ type: 'drop', paths: ['/a.png'] }));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(['/a.png']);
    // listener was only registered once
    expect(onDragDropEvent).toHaveBeenCalledOnce();
  });

  it('detaches the listener on unmount', async () => {
    const { unmount } = renderHook(() => useOsDrag({ onDrop: () => {} }));
    await waitFor(() => expect(registered).toBeDefined());
    unmount();
    await waitFor(() => expect(unlisten).toHaveBeenCalledOnce());
  });
});
