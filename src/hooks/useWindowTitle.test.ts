import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const setTitle = vi.fn().mockResolvedValue(undefined);
const getVersion = vi.fn();

vi.mock('@tauri-apps/api/app', () => ({
  getVersion: () => getVersion(),
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({ setTitle }),
}));

const { useWindowTitle } = await import('./useWindowTitle');

beforeEach(() => {
  setTitle.mockClear();
  getVersion.mockReset();
});

describe('useWindowTitle', () => {
  it('sets the window title to "Oxidize v<version>" on mount', async () => {
    getVersion.mockResolvedValue('1.2.3');
    renderHook(() => useWindowTitle());
    await waitFor(() => expect(setTitle).toHaveBeenCalledWith('Oxidize v1.2.3'));
  });

  it('does not call setTitle when the hook is unmounted before getVersion resolves', async () => {
    let resolveVersion!: (v: string) => void;
    getVersion.mockReturnValue(new Promise<string>((r) => (resolveVersion = r)));

    const { unmount } = renderHook(() => useWindowTitle());
    unmount();
    resolveVersion('1.0.0');
    // Give the microtask queue a chance to settle.
    await Promise.resolve();
    await Promise.resolve();
    expect(setTitle).not.toHaveBeenCalled();
  });
});
