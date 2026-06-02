import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { AppSidebar } from '@/components/AppSidebar';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';
import { WhatsNewSheet } from '@/components/WhatsNewSheet';
import { APP_VERSION, shouldAutoOpen } from '@/lib/changelog';
import { useCtrlDigitShortcut } from '@/hooks/useCtrlDigitShortcut';
import { useHistory } from '@/hooks/useHistory';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { useSettings } from '@/hooks/useSettings';
import { useWindowTitle } from '@/hooks/useWindowTitle';
import { HistoryPage } from '@/pages/history';
import { navOrder, operationPages, pageMeta, type Page } from '@/pages/registry';

const App = () => {
  const [currentPage, setCurrentPage] = useState<Page>('convert');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const { history, addItem, removeItem, clear } = useHistory();
  const { settings, isLoaded: settingsLoaded, setSetting } = useSettings();

  // Restore the last-visited page once settings load. Done in an effect so
  // we don't block first render — there's a brief flash of the default page
  // (`convert`) before snapping to the saved one. Acceptable for now.
  useEffect(() => {
    if (settingsLoaded && settings.lastPage && settings.lastPage !== currentPage) {
      setCurrentPage(settings.lastPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded]);

  // Persist page changes once the initial restore has happened. Without this
  // gate, the first effect would write `convert` to disk before we get a
  // chance to read the user's saved page.
  const navigate = useCallback(
    (page: Page) => {
      setCurrentPage(page);
      if (settingsLoaded) setSetting('lastPage', page);
    },
    [settingsLoaded, setSetting]
  );

  // Apply the loaded theme to <html>. Mirrors what AppSidebar's local state
  // used to do — but now driven by persisted settings.
  useEffect(() => {
    if (!settingsLoaded) return;
    if (settings.theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [settings.theme, settingsLoaded]);

  // Auto-open the What's-new panel on first launch and after a version bump.
  // Runs once when settings finish loading so we don't surprise the user on
  // every render; the panel itself updates `lastSeenVersion` when closed.
  useEffect(() => {
    if (!settingsLoaded) return;
    if (shouldAutoOpen(settings.lastSeenVersion)) setIsWhatsNewOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded]);

  const handleWhatsNewOpenChange = useCallback(
    (open: boolean) => {
      setIsWhatsNewOpen(open);
      // Persist on close — opening doesn't need to write, but once they've
      // seen the panel we shouldn't auto-pop it again for this version.
      if (!open && settingsLoaded && settings.lastSeenVersion !== APP_VERSION) {
        setSetting('lastSeenVersion', APP_VERSION);
      }
    },
    [settingsLoaded, settings.lastSeenVersion, setSetting]
  );

  const toggleTheme = useCallback(() => {
    setSetting('theme', settings.theme === 'dark' ? 'light' : 'dark');
  }, [settings.theme, setSetting]);

  useWindowTitle();
  useCtrlDigitShortcut((digit) => {
    if (digit <= navOrder.length) navigate(navOrder[digit - 1]);
  });
  useKeyboardShortcut('/', () => setIsHelpOpen((open) => !open), { meta: true });
  useKeyboardShortcut('.', () => handleWhatsNewOpenChange(!isWhatsNewOpen), { meta: true });

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
        onNavigate={navigate}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenWhatsNew={() => handleWhatsNewOpenChange(true)}
        theme={settings.theme}
        onToggleTheme={toggleTheme}
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
      <WhatsNewSheet open={isWhatsNewOpen} onOpenChange={handleWhatsNewOpenChange} />
    </SidebarProvider>
  );
};

App.displayName = 'App';

export default App;
