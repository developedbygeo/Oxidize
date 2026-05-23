import { cn } from '@/lib/utils';
import type { VideoResizeMode } from '@/types/video';

const modes: { value: VideoResizeMode; label: string; description: string }[] = [
  {
    value: 'presetheight',
    label: 'Preset',
    description: '1080p, 720p, etc. Width auto-scales to keep aspect ratio.',
  },
  {
    value: 'custom',
    label: 'Custom',
    description: 'Pick exact width and height. Optionally maintain aspect.',
  },
];

type ResizeModePickerProps = {
  value: VideoResizeMode;
  onChange: (mode: VideoResizeMode) => void;
};

const ResizeModePicker = ({ value, onChange }: ResizeModePickerProps) => (
  <div className="space-y-2">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
      Resize mode
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

ResizeModePicker.displayName = 'ResizeModePicker';

export { ResizeModePicker };
