import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { VideoProgressPayload } from '@/types/video';

type Listener = (event: { payload: VideoProgressPayload }) => void;
let registered: Listener | undefined;
const unlisten = vi.fn();
const listen = vi.fn();

vi.mock('@tauri-apps/api/event', () => ({
  listen: (event: string, cb: Listener) => listen(event, cb),
}));

const { useFfmpegProgress } = await import('./useFfmpegProgress');

beforeEach(() => {
  registered = undefined;
  unlisten.mockReset();
  listen.mockReset().mockImplementation((_event: string, cb: Listener) => {
    registered = cb;
    return Promise.resolve(unlisten);
  });
});

describe('useFfmpegProgress', () => {
  it('subscribes to the video:progress channel on mount', async () => {
    renderHook(() => useFfmpegProgress(true));
    await waitFor(() => expect(listen).toHaveBeenCalledWith('video:progress', expect.any(Function)));
  });

  it('records progress keyed by input_path as events arrive', async () => {
    const { result } = renderHook(() => useFfmpegProgress(true));
    await waitFor(() => expect(registered).toBeDefined());

    act(() => {
      registered!({ payload: { input_path: '/a.mp4', progress: 0.25, out_time_seconds: 1 } });
      registered!({ payload: { input_path: '/b.mp4', progress: 0.5, out_time_seconds: 2 } });
      registered!({ payload: { input_path: '/a.mp4', progress: 0.75, out_time_seconds: 3 } });
    });

    expect(result.current).toEqual({ '/a.mp4': 0.75, '/b.mp4': 0.5 });
  });

  it('does not subscribe and resets state when enabled=false', async () => {
    const { result, rerender } = renderHook(
      ({ on }: { on: boolean }) => useFfmpegProgress(on),
      { initialProps: { on: true } }
    );

    await waitFor(() => expect(registered).toBeDefined());
    act(() =>
      registered!({ payload: { input_path: '/a.mp4', progress: 0.4, out_time_seconds: 1 } })
    );
    expect(result.current).toEqual({ '/a.mp4': 0.4 });

    rerender({ on: false });
    expect(result.current).toEqual({});
  });

  it('detaches the listener on unmount', async () => {
    const { unmount } = renderHook(() => useFfmpegProgress(true));
    await waitFor(() => expect(registered).toBeDefined());
    unmount();
    await waitFor(() => expect(unlisten).toHaveBeenCalledOnce());
  });
});
