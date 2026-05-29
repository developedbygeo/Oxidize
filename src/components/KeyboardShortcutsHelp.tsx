import { Keyboard } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { navOrder, pageMeta } from '@/pages/registry';

type KeyboardShortcutsHelpProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ShortcutGroup = {
  heading: string;
  items: { keys: string[]; label: string }[];
};

const groups: ShortcutGroup[] = [
  {
    heading: 'Navigation',
    items: navOrder.map((page, index) => ({
      keys: ['Ctrl', String(index + 1)],
      label: pageMeta[page].navLabel,
    })),
  },
  {
    heading: 'Actions',
    items: [
      { keys: ['Ctrl', 'Enter'], label: 'Run the current page’s primary action' },
      { keys: ['Esc'], label: 'Cancel a running video job' },
      { keys: ['Ctrl', '/'], label: 'Open this shortcuts panel' },
    ],
  },
];

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded border border-border bg-muted/50 text-[10px] font-mono font-medium text-foreground">
    {children}
  </kbd>
);

const KeyboardShortcutsHelp = ({ open, onOpenChange }: KeyboardShortcutsHelpProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="w-80 sm:w-96">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-primary" strokeWidth={1.75} />
          Keyboard shortcuts
        </SheetTitle>
        <SheetDescription>
          Move between pages and run operations without leaving the keyboard.
        </SheetDescription>
      </SheetHeader>

      <div className="px-4 pb-6 space-y-5 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.heading} className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
              {group.heading}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 py-1.5 px-2 rounded-md hover:bg-muted/40 transition-colors"
                >
                  <span className="text-xs text-foreground">{item.label}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.keys.map((k, i) => (
                      <span key={i} className="flex items-center gap-1">
                        {i > 0 && <span className="text-[10px] text-muted-foreground">+</span>}
                        <Kbd>{k}</Kbd>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SheetContent>
  </Sheet>
);

KeyboardShortcutsHelp.displayName = 'KeyboardShortcutsHelp';

export { KeyboardShortcutsHelp };
