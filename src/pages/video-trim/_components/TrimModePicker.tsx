import { cn } from '@/lib/utils';
import type { VideoTrimMode } from '@/types/video';

const modes: { value: VideoTrimMode; label: string; description: string }[] = [
  {
    value: 'accurate',
    label: 'Accurate',
    description: 'Re-encodes for frame-accurate cuts. Slower but exact.',
  },
  {
    value: 'fast',
    label: 'Fast',
    description: 'Stream-copies. Instant, but cuts snap to nearest keyframe (±1–2s).',
  },
];

type TrimModePickerProps = {
  value: VideoTrimMode;
  onChange: (mode: VideoTrimMode) => void;
};

const TrimModePicker = ({ value, onChange }: TrimModePickerProps) => (
  <div className="space-y-2">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
      Trim mode
    </label>
    <div className="grid grid-cols-2 gap-1.5">
      {modes.map((mode) => {
        const isActive = value === mode.value;
        return (
          <button
            key={mode.value}
            onClick={() => onChange(mode.value)}
            className={cn(
              'p-3 rounded-md text-left transition-colors',
              isActive ? 'bg-primary text-primary-foreground' : 'bg-muted/50 hover:bg-muted'
            )}
          >
            <span className={cn('block text-xs font-medium', isActive ? '' : 'text-foreground')}>
              {mode.label}
            </span>
            <span
              className={cn(
                'block text-[10px] mt-0.5',
                isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
              )}
            >
              {mode.description}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

TrimModePicker.displayName = 'TrimModePicker';

export { TrimModePicker };
