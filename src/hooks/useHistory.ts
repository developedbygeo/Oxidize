import { useCallback, useEffect, useState } from 'react';
import {
  addHistoryItem,
  clearHistory as clearHistoryStore,
  loadHistory,
  removeHistoryItem,
} from '@/lib/history-store';
import type { OperationHistoryItem } from '@/types/image';

const MAX_ITEMS = 100;

type NewHistoryItem = Omit<OperationHistoryItem, 'id' | 'timestamp'>;

type UseHistory = {
  history: OperationHistoryItem[];
  addItem: (item: NewHistoryItem) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clear: () => Promise<void>;
};

export const useHistory = (): UseHistory => {
  const [history, setHistory] = useState<OperationHistoryItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadHistory().then((items) => {
      if (!cancelled) setHistory(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const addItem = useCallback(async (item: NewHistoryItem) => {
    const newItem = await addHistoryItem(item);
    setHistory((prev) => [newItem, ...prev].slice(0, MAX_ITEMS));
  }, []);

  const removeItem = useCallback(async (id: string) => {
    const updated = await removeHistoryItem(id);
    setHistory(updated);
  }, []);

  const clear = useCallback(async () => {
    await clearHistoryStore();
    setHistory([]);
  }, []);

  return { history, addItem, removeItem, clear };
};
