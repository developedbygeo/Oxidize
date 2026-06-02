import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useForm, type UseFormReturn } from 'react-hook-form';
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

const { usePersistedFormDefaults } = await import('./usePersistedFormDefaults');

type Values = {
  targetFormat: string;
  quality: number;
  outputDir: string | null;
};

const baseDefaults: Values = {
  targetFormat: 'webp',
  quality: 85,
  outputDir: null,
};

const setup = (saved: Partial<AppSettings>) => {
  loadSettings.mockResolvedValue({
    theme: 'dark',
    lastPage: null,
    lastOutputDir: null,
    pageDefaults: {},
    ...saved,
  });

  let formRef!: UseFormReturn<Values>;
  const hook = renderHook(() => {
    const form = useForm<Values>({ defaultValues: baseDefaults, mode: 'onChange' });
    formRef = form;
    usePersistedFormDefaults({
      page: 'convert',
      form,
      baseDefaults,
      persistKeys: ['targetFormat', 'quality', 'outputDir'],
    });
    return form;
  });
  return { hook, form: () => formRef };
};

beforeEach(() => {
  loadSettings.mockReset();
  updateSettings.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('usePersistedFormDefaults', () => {
  it('hydrates the form with saved per-page defaults once settings load', async () => {
    const { form } = setup({
      pageDefaults: { convert: { targetFormat: 'png', quality: 75 } },
    });

    // Initial render: form has the hard-coded baseDefaults
    expect(form().getValues('targetFormat')).toBe('webp');

    await waitFor(() => expect(form().getValues('targetFormat')).toBe('png'));
    expect(form().getValues('quality')).toBe(75);
    expect(form().getValues('outputDir')).toBeNull();
  });

  it('falls back to lastOutputDir when no page-specific outputDir is saved', async () => {
    const { form } = setup({
      lastOutputDir: '/Users/me/global',
      pageDefaults: { convert: { targetFormat: 'jpg' } },
    });

    await waitFor(() => expect(form().getValues('outputDir')).toBe('/Users/me/global'));
    expect(form().getValues('targetFormat')).toBe('jpg');
  });

  it('prefers the page-specific outputDir over lastOutputDir', async () => {
    const { form } = setup({
      lastOutputDir: '/Users/me/global',
      pageDefaults: { convert: { outputDir: '/Users/me/convert-only' } },
    });

    await waitFor(() => expect(form().getValues('outputDir')).toBe('/Users/me/convert-only'));
  });

  it('persists changes to persistKeys via updateSettings (debounced)', async () => {
    // Hydrate with a distinguishable value so waitFor blocks until hydration
    // actually flips `hydratedRef` — see the sibling test below for context.
    const { form } = setup({ pageDefaults: { convert: { quality: 99 } } });
    await waitFor(() => expect(form().getValues('quality')).toBe(99));

    updateSettings.mockClear();
    act(() => {
      form().setValue('targetFormat', 'jpg');
      form().setValue('quality', 92);
    });

    // Wait for the real debounce — fake timers race the watch effect.
    await waitFor(
      () => {
        const patches = updateSettings.mock.calls.map((c) => c[0]);
        const convertSlots = patches
          .map((p) => p.pageDefaults?.convert)
          .filter((v): v is Record<string, unknown> => !!v);
        expect(convertSlots.some((s) => s.targetFormat === 'jpg')).toBe(true);
        expect(convertSlots.some((s) => s.quality === 92)).toBe(true);
      },
      { timeout: 1000 }
    );
  });

  it('mirrors outputDir changes to lastOutputDir', async () => {
    // Hydrate with a distinguishable value so waitFor actually waits for
    // hydration to flip `hydratedRef` — asserting on the default
    // ('webp' → 'webp') passes before hydration runs and races the watch
    // subscription, causing intermittent flakes in the full suite.
    const { form } = setup({ pageDefaults: { convert: { outputDir: '/initial' } } });
    await waitFor(() => expect(form().getValues('outputDir')).toBe('/initial'));

    updateSettings.mockClear();
    act(() => {
      form().setValue('outputDir', '/Users/me/out');
    });

    // Wait for the real debounce + state-update chain instead of juggling
    // fake timers. Fixed timeout > PERSIST_DEBOUNCE_MS (250).
    await waitFor(
      () => {
        const patches = updateSettings.mock.calls.map((c) => c[0]);
        expect(patches.some((p) => p.lastOutputDir === '/Users/me/out')).toBe(true);
        expect(
          patches.some(
            (p) =>
              (p.pageDefaults?.convert as Record<string, unknown> | undefined)?.outputDir ===
              '/Users/me/out'
          )
        ).toBe(true);
      },
      { timeout: 1000 }
    );
  });

  it('does not persist fields outside of persistKeys', async () => {
    // Hydrate with a distinguishable value to await actual hydration —
    // see "persists changes to persistKeys" for context.
    const { form } = setup({ pageDefaults: { convert: { quality: 99 } } });
    await waitFor(() => expect(form().getValues('quality')).toBe(99));

    updateSettings.mockClear();
    act(() => {
      // Unregistered field — not in persistKeys.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (form() as any).setValue('ignored', 'foo');
    });
    // Give the (would-be) debounce + state-update chain time to fire if it
    // were going to; if it doesn't, that's the assertion.
    await new Promise((r) => setTimeout(r, 400));
    expect(updateSettings).not.toHaveBeenCalled();
  });
});
