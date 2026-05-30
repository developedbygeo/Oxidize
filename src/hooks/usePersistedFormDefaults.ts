import { useEffect, useMemo, useRef } from 'react';
import { debounce } from 'lodash-es';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { useSettings } from '@/hooks/useSettings';
import type { Page } from '@/pages/registry';

type Options<T extends FieldValues> = {
  page: Page;
  form: UseFormReturn<T>;
  baseDefaults: T;
  /**
   * Field names to persist back to `pageDefaults[page]`. Fields like per-image
   * crop coords or beautify sliders should be omitted — those aren't meaningful
   * as user-wide defaults.
   */
  persistKeys: readonly string[];
};

const OUTPUT_DIR_KEY = 'outputDir';
const PERSIST_DEBOUNCE_MS = 250;

/**
 * Hydrates `form` with per-page saved defaults on mount, then mirrors future
 * changes to the persisted settings store. `outputDir` is double-written:
 * to the page slot and to the global `lastOutputDir` so it acts as the
 * fallback the first time the user visits a different page.
 */
export const usePersistedFormDefaults = <T extends FieldValues>({
  page,
  form,
  baseDefaults,
  persistKeys,
}: Options<T>) => {
  const { settings, isLoaded, setSetting, setPageDefault } = useSettings();
  const hydratedRef = useRef(false);
  const pendingRef = useRef<Map<string, unknown>>(new Map());

  const persistKeySet = useMemo(() => new Set(persistKeys), [persistKeys]);
  const baseHasOutputDir = OUTPUT_DIR_KEY in (baseDefaults as object);

  useEffect(() => {
    if (!isLoaded || hydratedRef.current) return;
    const saved = (settings.pageDefaults[page] ?? {}) as Record<string, unknown>;
    const next = { ...baseDefaults, ...saved } as T;
    if (
      baseHasOutputDir &&
      saved[OUTPUT_DIR_KEY] == null &&
      settings.lastOutputDir != null
    ) {
      (next as Record<string, unknown>)[OUTPUT_DIR_KEY] = settings.lastOutputDir;
    }
    form.reset(next);
    hydratedRef.current = true;
  }, [
    isLoaded,
    settings.pageDefaults,
    settings.lastOutputDir,
    page,
    baseDefaults,
    baseHasOutputDir,
    form,
  ]);

  const flush = useMemo(() => {
    const drain = () => {
      const pending = pendingRef.current;
      if (pending.size === 0) return;
      pendingRef.current = new Map();
      for (const [field, value] of pending) {
        setPageDefault(page, field, value);
        if (field === OUTPUT_DIR_KEY) {
          setSetting('lastOutputDir', (value as string | null) ?? null);
        }
      }
    };
    return debounce(drain, PERSIST_DEBOUNCE_MS);
  }, [page, setPageDefault, setSetting]);

  useEffect(
    () => () => {
      flush.flush();
    },
    [flush]
  );

  useEffect(() => {
    if (!isLoaded) return;
    const subscription = form.watch((values, info) => {
      if (!hydratedRef.current) return;
      // info.name is undefined for whole-form events (reset, programmatic) —
      // ignore those; we only want individual field updates.
      if (!info.name) return;
      if (!persistKeySet.has(info.name)) return;
      const value = (values as Record<string, unknown>)[info.name];
      pendingRef.current.set(info.name, value);
      flush();
    });
    return () => subscription.unsubscribe();
  }, [isLoaded, form, persistKeySet, flush]);
};
