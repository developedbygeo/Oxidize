import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { AppSettings } from '@/lib/settings-store';

const loadSettings = vi.fn();
const updateSettings = vi.fn();

vi.mock('@/lib/settings-store', async () => {
  const actual = await vi.importActual<typeof import('@/lib/settings-store')>(
    '@/lib/settings-store'
  );
  return {
    ...actual,
    loadSettings: () => loadSettings(),
    updateSettings: (patch: Partial<AppSettings>) => updateSettings(patch),
  };
});

const { useSettings } = await import('./useSettings');

beforeEach(() => {
  loadSettings.mockReset();
  updateSettings.mockReset().mockResolvedValue(undefined);
});

describe('useSettings', () => {
  it('returns defaults before the load resolves, then the loaded values', async () => {
    loadSettings.mockResolvedValue({
      theme: 'light',
      lastPage: 'effects',
      lastOutputDir: '/out',
      pageDefaults: {},
    });

    const { result } = renderHook(() => useSettings());
    // Initial snapshot is the default theme: 'dark'
    expect(result.current.settings.theme).toBe('dark');
    expect(result.current.isLoaded).toBe(false);

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.settings).toEqual({
      theme: 'light',
      lastPage: 'effects',
      lastOutputDir: '/out',
      pageDefaults: {},
    });
  });

  it('updates the in-memory state optimistically and forwards the patch to disk', async () => {
    loadSettings.mockResolvedValue({
      theme: 'dark',
      lastPage: null,
      lastOutputDir: null,
      pageDefaults: {},
    });

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => result.current.setSetting('theme', 'light'));
    expect(result.current.settings.theme).toBe('light');
    expect(updateSettings).toHaveBeenCalledWith({ theme: 'light' });
  });

  it('setPageDefault merges into the existing page slot and persists the whole pageDefaults blob', async () => {
    loadSettings.mockResolvedValue({
      theme: 'dark',
      lastPage: null,
      lastOutputDir: null,
      pageDefaults: { convert: { targetFormat: 'png' } },
    });

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => result.current.setPageDefault('convert', 'quality', 90));

    expect(result.current.settings.pageDefaults).toEqual({
      convert: { targetFormat: 'png', quality: 90 },
    });
    expect(updateSettings).toHaveBeenCalledWith({
      pageDefaults: { convert: { targetFormat: 'png', quality: 90 } },
    });
  });

  it('setPageDefault on a fresh page creates a new slot', async () => {
    loadSettings.mockResolvedValue({
      theme: 'dark',
      lastPage: null,
      lastOutputDir: null,
      pageDefaults: {},
    });

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => result.current.setPageDefault('effects', 'intensity', 70));

    expect(result.current.settings.pageDefaults).toEqual({ effects: { intensity: 70 } });
  });

  it('does not overwrite the in-memory state when the load resolves after unmount', async () => {
    let resolveLoad!: (s: AppSettings) => void;
    loadSettings.mockReturnValue(new Promise<AppSettings>((r) => (resolveLoad = r)));

    const { result, unmount } = renderHook(() => useSettings());
    unmount();
    resolveLoad({ theme: 'light', lastPage: 'crop', lastOutputDir: null, pageDefaults: {}, lastSeenVersion: null });
    await Promise.resolve();
    await Promise.resolve();
    expect(result.current.isLoaded).toBe(false);
  });
});
