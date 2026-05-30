import { RotateCcw, RotateCw, RefreshCcw, MoveHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RotationDegrees } from '@/types/image';

type RotationPickerProps = {
  value: RotationDegrees;
  onChange: (next: RotationDegrees) => void;
};

const OPTIONS: { value: RotationDegrees; label: string; icon: typeof RotateCw; hint: string }[] = [
  { value: 0, label: 'None', icon: MoveHorizontal, hint: 'No rotation' },
  { value: 90, label: '90°', icon: RotateCw, hint: 'Clockwise quarter turn' },
  { value: 180, label: '180°', icon: RefreshCcw, hint: 'Half turn' },
  { value: 270, label: '270°', icon: RotateCcw, hint: 'Counter-clockwise quarter turn' },
];

const RotationPicker = ({ value, onChange }: RotationPickerProps) => (
  <div className="space-y-2">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
      Rotation
    </label>
    <div className="grid grid-cols-4 gap-1.5">
      {OPTIONS.map(({ value: v, label, icon: Icon, hint }) => {
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            title={hint}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-md border transition-colors',
              active
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/30 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
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

RotationPicker.displayName = 'RotationPicker';

export { RotationPicker };
