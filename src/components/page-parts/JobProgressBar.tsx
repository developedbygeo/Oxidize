import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useJobTimer } from '@/hooks/useJobTimer';
import { formatVideoDuration } from '@/types/video';

export type JobItem = {
  path: string;
  name: string;
};

type JobProgressBarProps = {
  items: JobItem[];
  /** Map of input path → progress 0..1 (from useFfmpegProgress or similar). */
  progress: Record<string, number>;
  /** Whether a job is currently active — drives the elapsed timer + spinner. */
  running: boolean;
  /** Present-progressive verb shown in the title — "Converting", "Compressing". */
  verb: string;
  /** Singular noun for one item — "video", "image". */
  itemName?: string;
};

const findActiveIndex = (items: JobItem[], progress: Record<string, number>): number => {
  // First item that's mid-progress (0 < p < 1), else first incomplete.
  for (let i = 0; i < items.length; i++) {
    const p = progress[items[i].path] ?? 0;
    if (p > 0 && p < 1) return i;
  }
  for (let i = 0; i < items.length; i++) {
    if ((progress[items[i].path] ?? 0) < 1) return i;
  }
  return -1;
};

// Wait until we have meaningful signal before locking the estimate.
const LOCK_MIN_PROGRESS = 0.05; // 5%
const LOCK_MIN_ELAPSED = 2; // seconds

// After the first lock, re-anchor the estimate at intervals that scale with
// its size — so a 60s job re-checks every ~10s, a 5min job every ~50s, etc.
// Calm display, but tracks real system load over time.
const RELOCK_DIVISOR = 6;
const RELOCK_MIN_INTERVAL = 5; // seconds (floor for short jobs)

const JobProgressBar = ({
  items,
  progress,
  running,
  verb,
  itemName = 'item',
}: JobProgressBarProps) => {
  const elapsed = useJobTimer(running);
  // Locked total-duration estimate. Re-anchored periodically (see RELOCK_*).
  // Displayed ETA = max(0, lockedTotal - elapsed) — counts down smoothly
  // between re-locks instead of jittering every tick.
  const [lockedTotal, setLockedTotal] = useState<number | null>(null);
  // Elapsed time captured at the last lock, so we know when to re-lock next.
  const lastLockAtRef = useRef<number>(0);

  const total = items.length;
  const sum = items.reduce((acc, item) => acc + (progress[item.path] ?? 0), 0);
  const overall = total === 0 ? 0 : sum / total;

  useEffect(() => {
    if (!running) {
      setLockedTotal(null);
      lastLockAtRef.current = 0;
      return;
    }
    if (overall < LOCK_MIN_PROGRESS || elapsed < LOCK_MIN_ELAPSED) return;

    // First lock once we have signal.
    if (lockedTotal == null) {
      setLockedTotal(elapsed / overall);
      lastLockAtRef.current = elapsed;
      return;
    }

    // Re-lock interval scales with the current estimate.
    const interval = Math.max(RELOCK_MIN_INTERVAL, lockedTotal / RELOCK_DIVISOR);
    if (elapsed - lastLockAtRef.current >= interval) {
      setLockedTotal(elapsed / overall);
      lastLockAtRef.current = elapsed;
    }
  }, [running, overall, elapsed, lockedTotal]);

  if (items.length === 0) return null;

  const percent = Math.round(overall * 100);
  const activeIndex = findActiveIndex(items, progress);
  const currentName = activeIndex >= 0 ? items[activeIndex].name : null;
  const positionLabel =
    activeIndex >= 0
      ? `${itemName} ${activeIndex + 1} of ${total}`
      : `${total} ${itemName}${total !== 1 ? 's' : ''}`;

  const remaining = lockedTotal != null ? Math.max(0, lockedTotal - elapsed) : null;
  const etaLabel =
    remaining == null
      ? 'Estimating…'
      : remaining < 1
      ? 'Almost done…'
      : `ETA ${formatVideoDuration(remaining)}`;

  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0 flex-1">
          {running && (
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0 self-center" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {verb} {positionLabel}
            </p>
            {currentName && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{currentName}</p>
            )}
          </div>
        </div>
        <span className="text-sm font-mono tabular-nums text-primary shrink-0">{percent}%</span>
      </div>

      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-[width] duration-150"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono tabular-nums">
        <span>Elapsed {formatVideoDuration(elapsed)}</span>
        <span>{etaLabel}</span>
      </div>
    </div>
  );
};

JobProgressBar.displayName = 'JobProgressBar';

export { JobProgressBar };
