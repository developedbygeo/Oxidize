import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import type { LucideIcon } from 'lucide-react';
import { Sparkles, TrendingUp, Wrench, AlertTriangle, Star } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { CHANGELOG } from '@/lib/changelog';

type WhatsNewSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Section heading → icon + accent treatment. Keys are lower-cased so the
 *  lookup is case-insensitive (`## NEW` and `## new` both work). Sections
 *  not in this map render with the default heading style — no failure mode. */
type HeadingMeta = { icon: LucideIcon; className: string };

const HEADING_META: Record<string, HeadingMeta> = {
  highlights: { icon: Star, className: 'text-primary' },
  new: { icon: Sparkles, className: 'text-primary' },
  features: { icon: Sparkles, className: 'text-primary' },
  improvements: { icon: TrendingUp, className: 'text-foreground' },
  fixes: { icon: Wrench, className: 'text-amber-500' },
  breaking: { icon: AlertTriangle, className: 'text-destructive' },
  'breaking changes': { icon: AlertTriangle, className: 'text-destructive' },
};

// YYYY-MM-DD → "Jun 2, 2026". Hand-rolled so the format is consistent across
// every machine regardless of locale.
const formatDate = (iso: string): string => {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[month - 1]} ${day}, ${year}`;
};

/** Pull a string heading label out of react-markdown's heading children prop.
 *  Headings can include inline markdown (`## **New**`) so we walk children. */
const headingText = (node: React.ReactNode): string => {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(headingText).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    return headingText((node as { props: { children?: React.ReactNode } }).props.children);
  }
  return '';
};

/** Component overrides for react-markdown — wires our design system in
 *  without us having to touch the markdown grammar. Headings get a section
 *  icon when their text matches `HEADING_META`. */
const MARKDOWN_COMPONENTS: Components = {
  h2: ({ children }) => {
    const meta = HEADING_META[headingText(children).toLowerCase().trim()];
    const Icon = meta?.icon;
    return (
      <h2 className="mt-5 mb-2 first:mt-0 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
        {Icon && <Icon className={cn('size-3', meta?.className)} strokeWidth={2.25} />}
        <span>{children}</span>
      </h2>
    );
  },
  p: ({ children }) => (
    <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{children}</p>
  ),
  ul: ({ children }) => <ul className="space-y-1.5 my-2">{children}</ul>,
  li: ({ children }) => (
    <li className="text-[11px] text-foreground/90 leading-snug pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-primary/60">
      {children}
    </li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  code: ({ children }) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-foreground/90">
      {children}
    </code>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-primary underline-offset-2 hover:underline"
    >
      {children}
    </a>
  ),
};

const EmptyState = () => (
  <div className="px-4 pb-6">
    <p className="text-xs text-muted-foreground">
      No changelog entries yet. Add a markdown file under{' '}
      <code className="text-[11px] font-mono">artifacts/changelogs/</code> to populate this panel.
    </p>
  </div>
);

EmptyState.displayName = 'EmptyState';

const WhatsNewSheet = ({ open, onOpenChange }: WhatsNewSheetProps) => {
  const latest = CHANGELOG[0];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-md sm:w-lg max-w-full">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" strokeWidth={1.75} />
            What's new
          </SheetTitle>
          <SheetDescription>
            {latest
              ? `Highlights and changes shipped in v${latest.version}.`
              : 'Recent changes shipped in Oxidize.'}
          </SheetDescription>
        </SheetHeader>

        {!latest ? (
          <EmptyState />
        ) : (
          <div className="px-4 pb-6 overflow-y-auto">
            <div className="flex items-baseline justify-between gap-2 pb-2 mb-3 border-b border-border/40">
              <div className="flex items-baseline gap-2">
                <h3 className="text-sm font-semibold text-foreground">v{latest.version}</h3>
                <span className="text-[10px] uppercase tracking-wide font-medium text-primary px-1.5 py-0.5 rounded bg-primary/10">
                  Latest
                </span>
              </div>
              {latest.date && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  {formatDate(latest.date)}
                </span>
              )}
            </div>

            <ReactMarkdown components={MARKDOWN_COMPONENTS}>{latest.body}</ReactMarkdown>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

WhatsNewSheet.displayName = 'WhatsNewSheet';

export { WhatsNewSheet };
