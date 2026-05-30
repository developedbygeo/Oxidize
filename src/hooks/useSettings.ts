import { useCallback, useEffect, useState } from 'react';
import {
  defaultSettings,
  loadSettings,
  updateSettings,
  type AppSettings,
} from '@/lib/settings-store';
import type { Page } from '@/pages/registry';

type UseSettings = {
  settings: AppSettings;
  /** Whether the initial load from disk has completed. */
  isLoaded: boolean;
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  /**
   * Patch a single field inside `pageDefaults[page]`. Used by per-page form
   * persistence to remember the user's last-chosen format / quality / etc.
   */
  setPageDefault: (page: Page, field: string, value: unknown) => void;
};

/**
 * Reads `settings.json` on mount and exposes a typed setter that persists
 * changes back to disk. Updates are fire-and-forget — UI doesn't block on the
 * write — and the in-memory state is updated optimistically so consumers see
 * the new value immediately.
 */
export const useSettings = (): UseSettings => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadSettings().then((loaded) => {
      if (cancelled) return;
      setSettings(loaded);
      setIsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setSetting = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      void updateSettings({ [key]: value } as Partial<AppSettings>);
    },
    []
  );

  const setPageDefault = useCallback((page: Page, field: string, value: unknown) => {
    setSettings((prev) => {
      const nextPageDefaults = {
        ...prev.pageDefaults,
        [page]: { ...(prev.pageDefaults[page] ?? {}), [field]: value },
      };
      void updateSettings({ pageDefaults: nextPageDefaults });
      return { ...prev, pageDefaults: nextPageDefaults };
    });
  }, []);

  return { settings, isLoaded, setSetting, setPageDefault };
};
