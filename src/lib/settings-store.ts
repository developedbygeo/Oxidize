import { BaseDirectory, readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import type { Page } from '@/pages/registry';

const SETTINGS_FILE = 'oxidize/settings.json';
const SETTINGS_DIR = 'oxidize';

export type Theme = 'light' | 'dark';

/**
 * Per-page form defaults. Each entry is the page id (matching `Page`) mapped
 * to a plain key/value blob that mirrors that page's form schema. Typed loosely
 * here because each page owns its own schema — readers are expected to merge
 * the blob over their typed defaults via `usePersistedFormDefaults`.
 */
export type PageDefaults = Record<string, Record<string, unknown>>;

export type AppSettings = {
  theme: Theme;
  lastPage: Page | null;
  lastOutputDir: string | null;
  pageDefaults: PageDefaults;
  /** The newest changelog version the user has acknowledged. Null until they
   *  see the What's-new panel once; updated when they open/close it. Drives
   *  the auto-open trigger after a version bump. */
  lastSeenVersion: string | null;
};

type SettingsData = {
  version: number;
  settings: AppSettings;
};

export const defaultSettings: AppSettings = {
  theme: 'dark',
  lastPage: null,
  lastOutputDir: null,
  pageDefaults: {},
  lastSeenVersion: null,
};

async function ensureDir(): Promise<void> {
  const dirExists = await exists(SETTINGS_DIR, { baseDir: BaseDirectory.AppData });
  if (!dirExists) {
    await mkdir(SETTINGS_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
  }
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    await ensureDir();
    const fileExists = await exists(SETTINGS_FILE, { baseDir: BaseDirectory.AppData });
    if (!fileExists) return defaultSettings;
    const content = await readTextFile(SETTINGS_FILE, { baseDir: BaseDirectory.AppData });
    const data: SettingsData = JSON.parse(content);
    // Merge over defaults so a missing field doesn't blow up downstream readers.
    return { ...defaultSettings, ...(data.settings ?? {}) };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return defaultSettings;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await ensureDir();
    const data: SettingsData = { version: 1, settings };
    await writeTextFile(SETTINGS_FILE, JSON.stringify(data, null, 2), {
      baseDir: BaseDirectory.AppData,
    });
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

// Chains updateSettings calls so concurrent patches don't lose data via the
// read-merge-write window. Each pending update awaits the previous one before
// reading from disk.
let writeQueue: Promise<unknown> = Promise.resolve();

/**
 * Atomically patch one or more settings keys. Loads the current file,
 * merges the patch, writes it back, and returns the new state. Calls are
 * serialized so concurrent patches don't clobber each other.
 */
export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const run = writeQueue.then(async () => {
    const current = await loadSettings();
    const next = { ...current, ...patch };
    await saveSettings(next);
    return next;
  });
  writeQueue = run.catch(() => undefined);
  return run;
}
