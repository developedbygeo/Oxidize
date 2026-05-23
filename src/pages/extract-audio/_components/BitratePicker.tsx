import { cn } from '@/lib/utils';
import { audioBitrateOptions } from '@/types/video';

type BitratePickerProps = {
  value: number;
  onChange: (value: number) => void;
};

const BitratePicker = ({ value, onChange }: BitratePickerProps) => (
  <div className="space-y-2">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
      Bitrate
    </label>
    <div className="grid grid-cols-5 gap-1.5">
      {audioBitrateOptions.map((kbps) => {
        const isActive = value === kbps;
        return (
          <button
            key={kbps}
            onClick={() => onChange(kbps)}
            className={cn(
              'px-2 py-2 rounded-md text-xs font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {kbps}
          </button>
        );
      })}
    </div>
    <p className="text-[10px] text-muted-foreground">kbps · higher = better quality, larger file</p>
  </div>
);

BitratePicker.displayName = 'BitratePicker';

export { BitratePicker };
