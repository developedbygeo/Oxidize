import { ExternalLink, Ban } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { isCancelledError } from '@/lib/ffmpeg-errors';

type Size = 'sm' | 'md';

export type ResultRow = {
  success: boolean;
  output_path: string | null;
  /** Optional per-item error string. Used to distinguish cancellation. */
  error?: string | null;
};

type ResultsListProps<T extends ResultRow> = {
  results: T[];
  size?: 'sm' | 'md';
  maxHeight?: string;
  /** Render extra meta on the right side of each row (e.g. file sizes, savings). */
  children?: (result: T) => React.ReactNode;
};

const sizeStyles: Record<
  Size,
  {
    row: string;
    text: string;
    dot: string;
    icon: string;
    gap: string;
    spacing: string;
  }
> = {
  sm: {
    row: 'p-1.5 rounded',
    text: 'text-[10px]',
    dot: 'w-1 h-1',
    icon: 'w-2.5 h-2.5',
    gap: 'gap-1.5',
    spacing: 'space-y-0.5',
  },
  md: {
    row: 'p-2 rounded-md',
    text: 'text-xs',
    dot: 'w-1.5 h-1.5',
    icon: 'w-3 h-3',
    gap: 'gap-2',
    spacing: 'space-y-1',
  },
};

const revealFile = async (path: string) => {
  try {
    await invoke('reveal_file', { path });
  } catch {
    toast.error('File not found', {
      description: 'The output file may have been moved or deleted.',
    });
  }
};

function ResultsList<T extends ResultRow>({
  results,
  size = 'md',
  maxHeight = 'max-h-40',
  children,
}: ResultsListProps<T>) {
  const styles = sizeStyles[size];

  return (
    <div className={cn(styles.spacing, maxHeight, 'overflow-y-auto')}>
      {results.map((result, index) => {
        const cancelled = !result.success && isCancelledError(result.error);
        return (
          <button
            key={index}
            onClick={() => {
              if (result.success && result.output_path) revealFile(result.output_path);
            }}
            disabled={!result.success || !result.output_path}
            className={cn(
              'w-full flex items-center justify-between transition-colors',
              styles.row,
              styles.text,
              result.success && 'bg-muted/30 hover:bg-muted/50 cursor-pointer',
              !result.success && cancelled && 'bg-amber-500/5 cursor-default',
              !result.success && !cancelled && 'bg-destructive/5 cursor-default'
            )}
          >
            <div className={cn('flex items-center min-w-0', styles.gap)}>
              <div
                className={cn(
                  styles.dot,
                  'rounded-full shrink-0',
                  result.success && 'bg-primary',
                  !result.success && cancelled && 'bg-amber-500',
                  !result.success && !cancelled && 'bg-destructive'
                )}
              />
              <span className="truncate">
                {result.output_path?.split(/[/\\]/).pop() || `Image ${index + 1}`}
              </span>
            </div>
            {result.success && (
              <div className={cn('flex items-center ml-2', styles.gap)}>
                {children?.(result)}
                <ExternalLink className={cn(styles.icon, 'text-muted-foreground')} />
              </div>
            )}
            {cancelled && (
              <div className={cn('flex items-center ml-2', styles.gap)}>
                <span className={cn(styles.text, 'text-amber-500 font-medium')}>Cancelled</span>
                <Ban className={cn(styles.icon, 'text-amber-500')} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

ResultsList.displayName = 'ResultsList';

export { ResultsList };
