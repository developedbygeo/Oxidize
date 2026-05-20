import { cn } from '@/lib/utils';
import { compressionPresets, compressionLevelOrder, type CompressionLevel } from './schema';

type LevelPickerProps = {
  value: CompressionLevel;
  useCustom: boolean;
  onChange: (level: CompressionLevel) => void;
};

const LevelPicker = ({ value, useCustom, onChange }: LevelPickerProps) => (
  <div className="space-y-2">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
      Compression Level
    </label>
    <div className="grid grid-cols-3 gap-1.5">
      {compressionLevelOrder.map((level) => {
        const preset = compressionPresets[level];
        const isActive = !useCustom && value === level;
        return (
          <button
            key={level}
            onClick={() => onChange(level)}
            className={cn(
              'relative p-3 rounded-md text-left transition-colors',
              isActive ? 'bg-primary text-primary-foreground' : 'bg-muted/50 hover:bg-muted'
            )}
          >
            <span className={cn('block text-xs font-medium', isActive ? '' : 'text-foreground')}>
              {preset.label}
            </span>
            <span
              className={cn(
                'block text-[10px] mt-0.5',
                isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
              )}
            >
              {preset.description}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

LevelPicker.displayName = 'LevelPicker';

export { LevelPicker };
