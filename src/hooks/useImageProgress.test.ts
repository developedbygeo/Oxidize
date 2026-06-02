import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

type ImageProgressPayload = { input_path: string; progress: number };
type Listener = (event: { payload: ImageProgressPayload }) => void;

let registered: Listener | undefined;
const unlisten = vi.fn();
const listen = vi.fn();

vi.mock('@tauri-apps/api/event', () => ({
  listen: (event: string, cb: Listener) => listen(event, cb),
}));

const { useImageProgress } = await import('./useImageProgress');

beforeEach(() => {
  registered = undefined;
  unlisten.mockReset();
  listen.mockReset().mockImplementation((_event: string, cb: Listener) => {
    registered = cb;
    return Promise.resolve(unlisten);
  });
});

describe('useImageProgress', () => {
  it('subscribes to the image:progress channel on mount', async () => {
    renderHook(() => useImageProgress(true));
    await waitFor(() =>
      expect(listen).toHaveBeenCalledWith('image:progress', expect.any(Function))
    );
  });

  it('records progress keyed by input_path as events arrive', async () => {
    const { result } = renderHook(() => useImageProgress(true));
    await waitFor(() => expect(registered).toBeDefined());

    act(() => {
      registered!({ payload: { input_path: '/a.png', progress: 1 } });
      registered!({ payload: { input_path: '/b.png', progress: 1 } });
    });

    expect(result.current).toEqual({ '/a.png': 1, '/b.png': 1 });
  });

  it('overwrites prior progress values for the same path (last write wins)', async () => {
    const { result } = renderHook(() => useImageProgress(true));
    await waitFor(() => expect(registered).toBeDefined());

    act(() => {
      registered!({ payload: { input_path: '/a.png', progress: 0 } });
      registered!({ payload: { input_path: '/a.png', progress: 1 } });
    });

    expect(result.current).toEqual({ '/a.png': 1 });
  });

  it('does not subscribe and resets state when enabled=false', async () => {
    const { result, rerender } = renderHook(
      ({ on }: { on: boolean }) => useImageProgress(on),
      { initialProps: { on: true } }
    );

    await waitFor(() => expect(registered).toBeDefined());
    act(() => registered!({ payload: { input_path: '/a.png', progress: 1 } }));
    expect(result.current).toEqual({ '/a.png': 1 });

    rerender({ on: false });
    expect(result.current).toEqual({});
  });

  it('detaches the listener on unmount', async () => {
    const { unmount } = renderHook(() => useImageProgress(true));
    await waitFor(() => expect(registered).toBeDefined());
    unmount();
    await waitFor(() => expect(unlisten).toHaveBeenCalledOnce());
  });
});
