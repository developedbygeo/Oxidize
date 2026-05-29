import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { AppSidebar } from '@/components/AppSidebar';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';
import { useCtrlDigitShortcut } from '@/hooks/useCtrlDigitShortcut';
import { useHistory } from '@/hooks/useHistory';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { useWindowTitle } from '@/hooks/useWindowTitle';
import { HistoryPage } from '@/pages/history';
import { navOrder, operationPages, pageMeta, type Page } from '@/pages/registry';

const App = () => {
  const [currentPage, setCurrentPage] = useState<Page>('convert');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const { history, addItem, removeItem, clear } = useHistory();

  useWindowTitle();
  useCtrlDigitShortcut((digit) => {
    if (digit <= navOrder.length) setCurrentPage(navOrder[digit - 1]);
  });
  useKeyboardShortcut('/', () => setIsHelpOpen((open) => !open), { meta: true });

  const meta = pageMeta[currentPage];

  const renderPage = () => {
    if (currentPage === 'history') {
      return (
        <HistoryPage history={history} onRemoveHistory={removeItem} onClearHistory={clear} />
      );
    }
    const PageComponent = operationPages[currentPage];
    return <PageComponent onOperationComplete={addItem} />;
  };

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onOpenHelp={() => setIsHelpOpen(true)}
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
            <span className="text-sm font-semibold text-foreground">{meta.title}</span>
            <span className="text-xs text-muted-foreground">{meta.subtitle}</span>
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
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </SidebarInset>
      <Toaster />
      <KeyboardShortcutsHelp open={isHelpOpen} onOpenChange={setIsHelpOpen} />
    </SidebarProvider>
  );
};

App.displayName = 'App';

export default App;
