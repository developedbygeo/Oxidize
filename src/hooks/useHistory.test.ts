import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { OperationHistoryItem } from '@/types/image';

const loadHistory = vi.fn();
const addHistoryItem = vi.fn();
const removeHistoryItem = vi.fn();
const clearHistoryStore = vi.fn();

vi.mock('@/lib/history-store', () => ({
  loadHistory: () => loadHistory(),
  addHistoryItem: (item: unknown) => addHistoryItem(item),
  removeHistoryItem: (id: string) => removeHistoryItem(id),
  clearHistory: () => clearHistoryStore(),
}));

const { useHistory } = await import('./useHistory');

const makeItem = (overrides: Partial<OperationHistoryItem> = {}): OperationHistoryItem => ({
  id: overrides.id ?? 'item-1',
  type: overrides.type ?? 'convert',
  timestamp: overrides.timestamp ?? Date.now(),
  fileCount: overrides.fileCount ?? 1,
  outputDir: overrides.outputDir ?? '/out',
  details: overrides.details ?? 'detail',
});

beforeEach(() => {
  loadHistory.mockReset();
  addHistoryItem.mockReset();
  removeHistoryItem.mockReset();
  clearHistoryStore.mockReset();
});

describe('useHistory', () => {
  it('hydrates the history list from the store on mount', async () => {
    const existing = [makeItem({ id: 'a' }), makeItem({ id: 'b' })];
    loadHistory.mockResolvedValue(existing);
    const { result } = renderHook(() => useHistory());
    expect(result.current.history).toEqual([]);
    await waitFor(() => expect(result.current.history).toEqual(existing));
  });

  it('prepends a newly added item via addItem', async () => {
    loadHistory.mockResolvedValue([makeItem({ id: 'existing' })]);
    const created = makeItem({ id: 'new' });
    addHistoryItem.mockResolvedValue(created);

    const { result } = renderHook(() => useHistory());
    await waitFor(() => expect(result.current.history).toHaveLength(1));

    await act(async () => {
      await result.current.addItem({
        type: 'crop',
        fileCount: 1,
        outputDir: '/out',
        details: 'd',
      });
    });

    expect(result.current.history.map((i) => i.id)).toEqual(['new', 'existing']);
    expect(addHistoryItem).toHaveBeenCalledOnce();
  });

  it('caps the in-memory list at 100 entries', async () => {
    const initial = Array.from({ length: 100 }, (_, i) => makeItem({ id: `i-${i}` }));
    loadHistory.mockResolvedValue(initial);
    addHistoryItem.mockResolvedValue(makeItem({ id: 'overflow' }));

    const { result } = renderHook(() => useHistory());
    await waitFor(() => expect(result.current.history).toHaveLength(100));

    await act(async () => {
      await result.current.addItem({
        type: 'convert',
        fileCount: 1,
        outputDir: '/o',
        details: 'd',
      });
    });

    expect(result.current.history).toHaveLength(100);
    expect(result.current.history[0].id).toBe('overflow');
    expect(result.current.history[99].id).toBe('i-98');
  });

  it('removeItem replaces the list with the store-returned array', async () => {
    loadHistory.mockResolvedValue([makeItem({ id: 'a' }), makeItem({ id: 'b' })]);
    removeHistoryItem.mockResolvedValue([makeItem({ id: 'b' })]);

    const { result } = renderHook(() => useHistory());
    await waitFor(() => expect(result.current.history).toHaveLength(2));

    await act(async () => {
      await result.current.removeItem('a');
    });

    expect(removeHistoryItem).toHaveBeenCalledWith('a');
    expect(result.current.history.map((i) => i.id)).toEqual(['b']);
  });

  it('clear empties the list and calls the store', async () => {
    loadHistory.mockResolvedValue([makeItem({ id: 'a' }), makeItem({ id: 'b' })]);
    clearHistoryStore.mockResolvedValue(undefined);

    const { result } = renderHook(() => useHistory());
    await waitFor(() => expect(result.current.history).toHaveLength(2));

    await act(async () => {
      await result.current.clear();
    });

    expect(clearHistoryStore).toHaveBeenCalledOnce();
    expect(result.current.history).toEqual([]);
  });

  it('ignores the load result if the hook unmounts mid-load', async () => {
    let resolve!: (items: OperationHistoryItem[]) => void;
    loadHistory.mockReturnValue(new Promise<OperationHistoryItem[]>((r) => (resolve = r)));

    const { result, unmount } = renderHook(() => useHistory());
    unmount();
    resolve([makeItem({ id: 'late' })]);
    await Promise.resolve();
    await Promise.resolve();
    // After unmount, the captured result snapshot stays at the initial empty array.
    expect(result.current.history).toEqual([]);
  });
});
