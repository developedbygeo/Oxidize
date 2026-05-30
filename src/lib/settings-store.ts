import { BaseDirectory, readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import type { Page } from '@/pages/registry';

const SETTINGS_FILE = 'oxidize/settings.json';
const SETTINGS_DIR = 'oxidize';

export type Theme = 'light' | 'dark';

export type AppSettings = {
  theme: Theme;
  lastPage: Page | null;
  lastOutputDir: string | null;
};

type SettingsData = {
  version: number;
  settings: AppSettings;
};

export const defaultSettings: AppSettings = {
  theme: 'dark',
  lastPage: null,
  lastOutputDir: null,
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

/**
 * Atomically patch one or more settings keys. Loads the current file,
 * merges the patch, writes it back, and returns the new state.
 */
export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await loadSettings();
  const next = { ...current, ...patch };
  await saveSettings(next);
  return next;
}
