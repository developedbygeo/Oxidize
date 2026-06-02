import { cn } from '@/lib/utils';
import type { VideoQualityMode } from '@/types/video';

type QualityModePickerProps = {
  value: VideoQualityMode;
  onChange: (mode: VideoQualityMode) => void;
};

const modes: { value: VideoQualityMode; label: string; description: string }[] = [
  {
    value: 'crf',
    label: 'Quality (CRF)',
    description: 'Pick a quality target, accept whatever file size results.',
  },
  {
    value: 'bitrate',
    label: 'Target bitrate',
    description: 'Pick a bitrate budget, quality varies with content.',
  },
];

const QualityModePicker = ({ value, onChange }: QualityModePickerProps) => (
  <div className="space-y-2">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
      Compression mode
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

QualityModePicker.displayName = 'QualityModePicker';

export { QualityModePicker };
