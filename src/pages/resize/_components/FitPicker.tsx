import { Crop, Maximize2, Move } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FitMode } from '@/types/image';

type FitPickerProps = {
  value: FitMode;
  onChange: (next: FitMode) => void;
  /** Disabled when only one dimension is set — fit has no effect on
   *  single-axis requests, so we grey the picker out for honesty. */
  disabled?: boolean;
};

const OPTIONS: { value: FitMode; label: string; hint: string; icon: typeof Crop }[] = [
  {
    value: 'cover',
    label: 'Cover',
    hint: 'Scale to fill the target, centre-crop the overflow. Default for social presets.',
    icon: Crop,
  },
  {
    value: 'contain',
    label: 'Contain',
    hint: 'Shrink to fit inside the target, preserving aspect ratio. Output may be smaller on one axis.',
    icon: Maximize2,
  },
  {
    value: 'stretch',
    label: 'Stretch',
    hint: 'Stretch to exact target. Distorts the image — rarely the right answer.',
    icon: Move,
  },
];

const FitPicker = ({ value, onChange, disabled = false }: FitPickerProps) => (
  <div className="space-y-2">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
      Fit mode
      {disabled && (
        <span className="ml-2 text-[10px] text-muted-foreground/70 normal-case">
          (no effect when only one dimension is set)
        </span>
      )}
    </label>
    <div className="grid grid-cols-3 gap-1.5">
      {OPTIONS.map(({ value: v, label, hint, icon: Icon }) => {
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            disabled={disabled}
            title={hint}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-md border transition-colors',
              disabled && 'opacity-50 cursor-not-allowed',
              !disabled && active && 'bg-primary text-primary-foreground border-primary',
              !disabled && !active &&
                'bg-muted/30 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="w-4 h-4" strokeWidth={1.75} />
            <span className="text-[11px] font-medium">{label}</span>
          </button>
        );
      })}
    </div>
  </div>
);

FitPicker.displayName = 'FitPicker';

export { FitPicker };
