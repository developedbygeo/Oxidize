import { BaseDirectory, readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import type { OperationHistoryItem } from '@/types/image';

const HISTORY_FILE = 'oxidize/history.json';
const HISTORY_DIR = 'oxidize';
const MAX_HISTORY_ITEMS = 100;

type HistoryData = {
  version: number;
  items: OperationHistoryItem[];
};

async function ensureDir(): Promise<void> {
  const dirExists = await exists(HISTORY_DIR, { baseDir: BaseDirectory.AppData });
  if (!dirExists) {
    await mkdir(HISTORY_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
  }
}

export async function loadHistory(): Promise<OperationHistoryItem[]> {
  try {
    await ensureDir();
    const fileExists = await exists(HISTORY_FILE, { baseDir: BaseDirectory.AppData });
    if (!fileExists) {
      return [];
    }
    const content = await readTextFile(HISTORY_FILE, { baseDir: BaseDirectory.AppData });
    const data: HistoryData = JSON.parse(content);
    return data.items || [];
  } catch (error) {
    console.error('Failed to load history:', error);
    return [];
  }
}

export async function saveHistory(items: OperationHistoryItem[]): Promise<void> {
  try {
    await ensureDir();
    const data: HistoryData = {
      version: 1,
      items: items.slice(0, MAX_HISTORY_ITEMS),
    };
    await writeTextFile(HISTORY_FILE, JSON.stringify(data, null, 2), {
      baseDir: BaseDirectory.AppData,
    });
  } catch (error) {
    console.error('Failed to save history:', error);
  }
}

export async function addHistoryItem(
  item: Omit<OperationHistoryItem, 'id' | 'timestamp'>
): Promise<OperationHistoryItem> {
  const newItem: OperationHistoryItem = {
    ...item,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  const history = await loadHistory();
  const updated = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS);
  await saveHistory(updated);
  return newItem;
}

export async function removeHistoryItem(id: string): Promise<OperationHistoryItem[]> {
  const history = await loadHistory();
  const updated = history.filter((item) => item.id !== id);
  await saveHistory(updated);
  return updated;
}

export async function clearHistory(): Promise<void> {
  await saveHistory([]);
}
