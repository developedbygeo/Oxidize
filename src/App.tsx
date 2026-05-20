import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { getVersion } from '@tauri-apps/api/app';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { AppSidebar, type Page } from '@/components/AppSidebar';
import { ConvertPage } from '@/pages/convert';
import { CompressPage } from '@/pages/compress';
import { BeautifyPage } from '@/pages/beautify';
import { EffectsPage } from '@/pages/effects';
import { PipelinePage } from '@/pages/pipeline';
import { HistoryPage } from '@/pages/history';
import { VideoConvertPage } from '@/pages/video-convert';
import { VideoCompressPage } from '@/pages/video-compress';
import {
  loadHistory,
  saveHistory,
  addHistoryItem,
  removeHistoryItem,
  clearHistory as clearHistoryStore,
} from '@/lib/history-store';
import type { OperationHistoryItem } from '@/types/image';

const pageTitles: Record<Page, string> = {
  convert: 'Convert Images',
  compress: 'Compress Images',
  beautify: 'Beautify Images',
  effects: 'Apply Effects',
  pipeline: 'Pipeline',
  'video-convert': 'Convert Videos',
  'video-compress': 'Compress Videos',
  history: 'Operation History',
};

const pageSubtitles: Record<Page, string> = {
  convert: 'Drag and drop files to get started',
  compress: 'Drag and drop files to get started',
  beautify: 'Drag and drop files to get started',
  effects: 'Drag and drop files to get started',
  pipeline: 'Chain multiple operations together',
  'video-convert': 'Change video format and container',
  'video-compress': 'Shrink video files',
  history: 'View and manage your recent operations',
};

const App = () => {
  const [currentPage, setCurrentPage] = useState<Page>('convert');
  const [history, setHistory] = useState<OperationHistoryItem[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Set window title with version on mount
  useEffect(() => {
    getVersion().then((version) => {
      getCurrentWindow().setTitle(`Oxidize v${version}`);
    });
  }, []);

  // Load history on mount
  useEffect(() => {
    loadHistory().then((items) => {
      setHistory(items);
      setHistoryLoaded(true);
    });
  }, []);

  // Save history when it changes (after initial load)
  useEffect(() => {
    if (historyLoaded) {
      saveHistory(history);
    }
  }, [history, historyLoaded]);

  const addToHistory = useCallback(async (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => {
    const newItem = await addHistoryItem(item);
    setHistory((prev) => [newItem, ...prev].slice(0, 100));
  }, []);

  const removeFromHistory = useCallback(async (id: string) => {
    const updated = await removeHistoryItem(id);
    setHistory(updated);
  }, []);

  const clearHistory = useCallback(async () => {
    await clearHistoryStore();
    setHistory([]);
  }, []);

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
      />
      <SidebarInset>
        <header className="flex h-16 items-center gap-3 px-6 border-b border-border/50">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
          <div className="h-5 w-px bg-border/50" />
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col"
          >
            <span className="text-sm font-semibold text-foreground">
              {pageTitles[currentPage]}
            </span>
            <span className="text-xs text-muted-foreground">
              {pageSubtitles[currentPage]}
            </span>
          </motion.div>
        </header>
        <main className="flex-1 overflow-auto bg-muted/20">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="h-full"
            >
              {currentPage === 'convert' && <ConvertPage onOperationComplete={addToHistory} />}
              {currentPage === 'compress' && <CompressPage onOperationComplete={addToHistory} />}
              {currentPage === 'beautify' && <BeautifyPage onOperationComplete={addToHistory} />}
              {currentPage === 'effects' && <EffectsPage onOperationComplete={addToHistory} />}
              {currentPage === 'pipeline' && <PipelinePage onOperationComplete={addToHistory} />}
              {currentPage === 'video-convert' && (
                <VideoConvertPage onOperationComplete={addToHistory} />
              )}
              {currentPage === 'video-compress' && (
                <VideoCompressPage onOperationComplete={addToHistory} />
              )}
              {currentPage === 'history' && (
                <HistoryPage
                  history={history}
                  onRemoveHistory={removeFromHistory}
                  onClearHistory={clearHistory}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
};

App.displayName = 'App';

export default App;
