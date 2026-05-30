import { beforeEach, describe, expect, it, vi } from 'vitest';

const readTextFile = vi.fn();
const writeTextFile = vi.fn();
const mkdir = vi.fn();
const exists = vi.fn();

vi.mock('@tauri-apps/plugin-fs', () => ({
  BaseDirectory: { AppData: 'AppData' },
  readTextFile: (...args: unknown[]) => readTextFile(...args),
  writeTextFile: (...args: unknown[]) => writeTextFile(...args),
  mkdir: (...args: unknown[]) => mkdir(...args),
  exists: (...args: unknown[]) => exists(...args),
}));

const { defaultSettings, loadSettings, saveSettings, updateSettings } = await import(
  './settings-store'
);

beforeEach(() => {
  readTextFile.mockReset();
  writeTextFile.mockReset();
  mkdir.mockReset();
  exists.mockReset();
});

describe('loadSettings', () => {
  it('returns defaults when the settings file does not exist', async () => {
    exists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect(await loadSettings()).toEqual(defaultSettings);
    expect(readTextFile).not.toHaveBeenCalled();
  });

  it('parses persisted settings', async () => {
    exists.mockResolvedValue(true);
    readTextFile.mockResolvedValue(
      JSON.stringify({
        version: 1,
        settings: { theme: 'light', lastPage: 'effects', lastOutputDir: '/out' },
      })
    );
    expect(await loadSettings()).toEqual({
      theme: 'light',
      lastPage: 'effects',
      lastOutputDir: '/out',
    });
  });

  it('merges defaults over a partial saved file (forward compat)', async () => {
    exists.mockResolvedValue(true);
    readTextFile.mockResolvedValue(JSON.stringify({ version: 1, settings: { theme: 'light' } }));
    const loaded = await loadSettings();
    expect(loaded.theme).toBe('light');
    expect(loaded.lastPage).toBe(defaultSettings.lastPage);
    expect(loaded.lastOutputDir).toBe(defaultSettings.lastOutputDir);
  });

  it('returns defaults when the file is malformed', async () => {
    exists.mockResolvedValue(true);
    readTextFile.mockResolvedValue('not json');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await loadSettings()).toEqual(defaultSettings);
  });
});

describe('saveSettings', () => {
  it('writes the version header + the full settings blob', async () => {
    exists.mockResolvedValue(true);
    await saveSettings({ theme: 'light', lastPage: 'crop', lastOutputDir: null });
    const [, content] = writeTextFile.mock.calls[0];
    expect(JSON.parse(content as string)).toEqual({
      version: 1,
      settings: { theme: 'light', lastPage: 'crop', lastOutputDir: null },
    });
  });
});

describe('updateSettings', () => {
  it('merges a partial patch over the loaded state and persists the result', async () => {
    exists.mockResolvedValue(true);
    readTextFile.mockResolvedValue(
      JSON.stringify({
        version: 1,
        settings: { theme: 'dark', lastPage: null, lastOutputDir: null },
      })
    );

    const next = await updateSettings({ lastPage: 'pipeline' });
    expect(next).toEqual({ theme: 'dark', lastPage: 'pipeline', lastOutputDir: null });

    const written = JSON.parse(writeTextFile.mock.calls[0][1] as string);
    expect(written.settings.lastPage).toBe('pipeline');
    expect(written.settings.theme).toBe('dark');
  });
});
