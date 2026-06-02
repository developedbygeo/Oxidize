import { cn } from '@/lib/utils';
import { effectsList } from '@/types/image';
import type { EffectType } from '@/types/image';

type EffectPickerProps = {
  value: EffectType;
  onChange: (effect: EffectType) => void;
};

const EffectPicker = ({ value, onChange }: EffectPickerProps) => (
  <div className="space-y-2">
    <h2 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
      Select Effect
    </h2>
    <div className="grid grid-cols-2 gap-1">
      {effectsList.map((effect) => {
        const isActive = value === effect.type;
        return (
          <button
            key={effect.type}
            onClick={() => onChange(effect.type)}
            className={cn(
              'p-2 rounded-md text-left transition-colors',
              isActive ? 'bg-primary/10 text-primary' : 'bg-muted/30 hover:bg-muted/50'
            )}
          >
            <div className="flex items-center gap-1.5">
              <effect.icon
                className={cn(
                  'w-3.5 h-3.5 shrink-0',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
                strokeWidth={1.75}
              />
              <span className={cn('text-[11px] font-medium', isActive ? '' : 'text-foreground')}>
                {effect.label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

EffectPicker.displayName = 'EffectPicker';

export { EffectPicker };
