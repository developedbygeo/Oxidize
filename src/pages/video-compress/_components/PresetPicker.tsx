import { cn } from '@/lib/utils';
import { presetLabels, presetOrder, type VideoEncodingPreset } from './schema';

type PresetPickerProps = {
  value: VideoEncodingPreset;
  onChange: (preset: VideoEncodingPreset) => void;
};

const PresetPicker = ({ value, onChange }: PresetPickerProps) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Encoder preset
      </label>
      <span className="text-[10px] text-muted-foreground">
        Slower = smaller file at same quality
      </span>
    </div>
    <div className="grid grid-cols-3 gap-1">
      {presetOrder.map((preset) => {
        const isActive = value === preset;
        return (
          <button
            key={preset}
            onClick={() => onChange(preset)}
            className={cn(
              'px-2 py-1.5 rounded text-[11px] font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/40 text-muted-foreground hover:bg-muted'
            )}
          >
            {presetLabels[preset]}
          </button>
        );
      })}
    </div>
  </div>
);

PresetPicker.displayName = 'PresetPicker';

export { PresetPicker };
