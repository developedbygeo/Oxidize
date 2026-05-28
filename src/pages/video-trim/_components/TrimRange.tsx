import { useState } from 'react';
import { Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { formatVideoDuration } from '@/types/video';

type TrimRangeProps = {
  duration: number;
  start: number;
  end: number;
  currentTime: number;
  onStartChange: (value: number) => void;
  onEndChange: (value: number) => void;
};

const parseTimeInput = (raw: string, max: number): number => {
  // Accept either "12.5" (seconds) or "1:23" / "1:23:45" (mm:ss / h:mm:ss).
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map((p) => parseFloat(p));
    if (parts.some((p) => !Number.isFinite(p))) return 0;
    let seconds = 0;
    for (const p of parts) seconds = seconds * 60 + p;
    return Math.max(0, Math.min(max, seconds));
  }
  const n = parseFloat(trimmed);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(max, n));
};

const TrimRange = ({
  duration,
  start,
  end,
  currentTime,
  onStartChange,
  onEndChange,
}: TrimRangeProps) => {
  const startPercent = duration > 0 ? (start / duration) * 100 : 0;
  const endPercent = duration > 0 ? (end / duration) * 100 : 100;
  const playheadPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-3">
      {/* Range visualization */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono tabular-nums">
          <span>{formatVideoDuration(0)}</span>
          <span>
            Selection: {formatVideoDuration(Math.max(0, end - start))}
          </span>
          <span>{formatVideoDuration(duration)}</span>
        </div>
        <div className="relative h-3 rounded-full bg-muted overflow-hidden">
          <div
            className="absolute top-0 bottom-0 bg-primary/30"
            style={{
              left: `${startPercent}%`,
              width: `${Math.max(0, endPercent - startPercent)}%`,
            }}
          />
          <div
            className="absolute top-0 bottom-0 w-px bg-foreground/70"
            style={{ left: `${playheadPercent}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary"
            style={{ left: `${startPercent}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary"
            style={{ left: `${endPercent}%` }}
          />
        </div>
      </div>

      {/* Start/End inputs + set-from-playhead */}
      <div className="grid grid-cols-2 gap-3">
        <TimeField
          label="Start"
          value={start}
          duration={duration}
          onChange={onStartChange}
          onSetFromPlayhead={() => onStartChange(Math.min(currentTime, end - 0.1))}
        />
        <TimeField
          label="End"
          value={end}
          duration={duration}
          onChange={onEndChange}
          onSetFromPlayhead={() => onEndChange(Math.max(currentTime, start + 0.1))}
        />
      </div>
    </div>
  );
};

type TimeFieldProps = {
  label: string;
  value: number;
  duration: number;
  onChange: (value: number) => void;
  onSetFromPlayhead: () => void;
};

const TimeField = ({ label, value, duration, onChange, onSetFromPlayhead }: TimeFieldProps) => {
  // While the input has focus we hold the user's raw text in `draft`. The
  // committed numeric value is parsed/clamped on blur or Enter — without
  // this, every keystroke would reformat the field and fight the cursor.
  const [draft, setDraft] = useState<string | null>(null);
  const isEditing = draft !== null;
  const displayed = isEditing ? draft : formatVideoDuration(value);

  const commit = (raw: string) => {
    const parsed = parseTimeInput(raw, duration);
    if (parsed !== value) onChange(parsed);
    setDraft(null);
  };

  return (
    <div className="space-y-1">
      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      <div className="flex gap-1.5">
        <input
          type="text"
          inputMode="numeric"
          value={displayed}
          onFocus={() => setDraft(formatVideoDuration(value))}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (isEditing) commit(draft!);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              (e.currentTarget as HTMLInputElement).blur();
            } else if (e.key === 'Escape') {
              setDraft(null);
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          className={cn(
            'flex-1 h-9 px-3 rounded-md border border-border bg-background text-sm font-mono tabular-nums',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent'
          )}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={onSetFromPlayhead}
          className="h-9 px-2 shrink-0"
          title="Set from current playhead"
          aria-label="Set from current playhead"
        >
          <Crosshair className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

TrimRange.displayName = 'TrimRange';

export { TrimRange };
