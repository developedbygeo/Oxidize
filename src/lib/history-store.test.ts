import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OperationHistoryItem } from '@/types/image';

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

const { loadHistory, saveHistory, addHistoryItem, removeHistoryItem, clearHistory } = await import(
  './history-store'
);

const makeItem = (overrides: Partial<OperationHistoryItem> = {}): OperationHistoryItem => ({
  id: overrides.id ?? 'fixed-id',
  type: overrides.type ?? 'convert',
  timestamp: overrides.timestamp ?? 1700000000000,
  fileCount: overrides.fileCount ?? 1,
  outputDir: overrides.outputDir ?? '/out',
  details: overrides.details ?? 'detail',
});

beforeEach(() => {
  readTextFile.mockReset();
  writeTextFile.mockReset();
  mkdir.mockReset();
  exists.mockReset();
});

describe('loadHistory', () => {
  it('returns [] when the history file does not exist', async () => {
    exists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect(await loadHistory()).toEqual([]);
    expect(readTextFile).not.toHaveBeenCalled();
  });

  it('parses items from the history file', async () => {
    const items = [makeItem({ id: 'a' }), makeItem({ id: 'b' })];
    exists.mockResolvedValue(true);
    readTextFile.mockResolvedValue(JSON.stringify({ version: 1, items }));
    expect(await loadHistory()).toEqual(items);
  });

  it('returns [] when the file is malformed', async () => {
    exists.mockResolvedValue(true);
    readTextFile.mockResolvedValue('not json');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await loadHistory()).toEqual([]);
    errorSpy.mockRestore();
  });

  it('creates the dir when missing', async () => {
    exists.mockResolvedValueOnce(false).mockResolvedValueOnce(false);
    await loadHistory();
    expect(mkdir).toHaveBeenCalledWith('oxidize', expect.objectContaining({ recursive: true }));
  });
});

describe('saveHistory', () => {
  it('writes the items as JSON with the version header', async () => {
    exists.mockResolvedValue(true);
    const items = [makeItem()];
    await saveHistory(items);
    expect(writeTextFile).toHaveBeenCalledOnce();
    const [, content] = writeTextFile.mock.calls[0];
    expect(JSON.parse(content as string)).toEqual({ version: 1, items });
  });

  it('caps written items at 100', async () => {
    exists.mockResolvedValue(true);
    const items = Array.from({ length: 150 }, (_, i) => makeItem({ id: `i-${i}` }));
    await saveHistory(items);
    const written = JSON.parse(writeTextFile.mock.calls[0][1] as string);
    expect(written.items).toHaveLength(100);
    expect(written.items[0].id).toBe('i-0');
    expect(written.items[99].id).toBe('i-99');
  });
});

describe('addHistoryItem', () => {
  it('generates an id and timestamp and prepends to the existing list', async () => {
    exists.mockResolvedValue(true);
    readTextFile.mockResolvedValue(JSON.stringify({ version: 1, items: [makeItem({ id: 'old' })] }));

    const created = await addHistoryItem({
      type: 'crop',
      fileCount: 1,
      outputDir: '/out',
      details: 'd',
    });

    expect(created.id).toMatch(/[0-9a-f-]{36}/);
    expect(typeof created.timestamp).toBe('number');

    const written = JSON.parse(writeTextFile.mock.calls[0][1] as string);
    expect(written.items.map((i: OperationHistoryItem) => i.id)).toEqual([created.id, 'old']);
  });

  it('keeps the on-disk list capped at 100 even when older items exist', async () => {
    exists.mockResolvedValue(true);
    const initial = Array.from({ length: 100 }, (_, i) => makeItem({ id: `i-${i}` }));
    readTextFile.mockResolvedValue(JSON.stringify({ version: 1, items: initial }));

    await addHistoryItem({
      type: 'convert',
      fileCount: 1,
      outputDir: '/o',
      details: 'd',
    });

    const written = JSON.parse(writeTextFile.mock.calls[0][1] as string);
    expect(written.items).toHaveLength(100);
    expect(written.items[99].id).toBe('i-98');
  });
});

describe('removeHistoryItem', () => {
  it('returns and writes the list with the given id removed', async () => {
    exists.mockResolvedValue(true);
    readTextFile.mockResolvedValue(
      JSON.stringify({
        version: 1,
        items: [makeItem({ id: 'a' }), makeItem({ id: 'b' })],
      })
    );

    const remaining = await removeHistoryItem('a');
    expect(remaining.map((i) => i.id)).toEqual(['b']);
    const written = JSON.parse(writeTextFile.mock.calls[0][1] as string);
    expect(written.items.map((i: OperationHistoryItem) => i.id)).toEqual(['b']);
  });
});

describe('clearHistory', () => {
  it('writes an empty items list', async () => {
    exists.mockResolvedValue(true);
    await clearHistory();
    const written = JSON.parse(writeTextFile.mock.calls[0][1] as string);
    expect(written.items).toEqual([]);
  });
});
