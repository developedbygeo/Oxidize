import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type CustomQualityControlProps = {
  value: number;
  useCustom: boolean;
  onValueChange: (value: number) => void;
  onToggleCustom: (use: boolean) => void;
};

const CustomQualityControl = ({
  value,
  useCustom,
  onValueChange,
  onToggleCustom,
}: CustomQualityControlProps) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Custom Quality
      </label>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onToggleCustom(!useCustom)}
        className={cn('h-6 px-2 text-[10px]', useCustom ? 'text-primary' : 'text-muted-foreground')}
      >
        {useCustom ? 'Using custom' : 'Use custom'}
      </Button>
    </div>
    <div className={cn('transition-opacity', useCustom ? 'opacity-100' : 'opacity-50')}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-muted-foreground">Quality</span>
        <span className="text-xs font-mono text-primary">{value}%</span>
      </div>
      <input
        type="range"
        min={10}
        max={100}
        value={value}
        onChange={(e) => onValueChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>Smaller file</span>
        <span>Better quality</span>
      </div>
    </div>
  </div>
);

CustomQualityControl.displayName = 'CustomQualityControl';

export { CustomQualityControl };
