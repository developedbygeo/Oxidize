import { cn } from '@/lib/utils';

export type ConvertMode = 'reencode' | 'remux';

const modes: { value: ConvertMode; label: string; description: string }[] = [
  {
    value: 'reencode',
    label: 'Re-encode',
    description: 'Re-compress with chosen quality. Slower, always works.',
  },
  {
    value: 'remux',
    label: 'Remux only',
    description: 'Repackage without re-encoding. Instant, no quality loss, may fail if codecs are incompatible with the target container.',
  },
];

type ModePickerProps = {
  value: ConvertMode;
  onChange: (mode: ConvertMode) => void;
};

const ModePicker = ({ value, onChange }: ModePickerProps) => (
  <div className="space-y-2">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
      Conversion mode
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

ModePicker.displayName = 'ModePicker';

export { ModePicker };
