import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar, type Page } from '@/components/AppSidebar';
import { ConvertPage, CompressPage, BeautifyPage, EffectsPage } from '@/pages';

const pageComponents: Record<Page, React.ComponentType> = {
  convert: ConvertPage,
  compress: CompressPage,
  beautify: BeautifyPage,
  effects: EffectsPage,
};

const pageTitles: Record<Page, string> = {
  convert: 'Convert Images',
  compress: 'Compress Images',
  beautify: 'Beautify Images',
  effects: 'Apply Effects',
};

const App = () => {
  const [currentPage, setCurrentPage] = useState<Page>('convert');

  const CurrentPageComponent = pageComponents[currentPage];

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar currentPage={currentPage} onNavigate={setCurrentPage} />
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
            <span className="text-[11px] text-muted-foreground">
              Drag and drop files to get started
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
              <CurrentPageComponent />
            </motion.div>
          </AnimatePresence>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

App.displayName = 'App';

export default App;
