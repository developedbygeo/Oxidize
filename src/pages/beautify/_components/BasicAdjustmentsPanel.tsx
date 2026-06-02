import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdjustmentSlider } from './AdjustmentSlider';
import { basicSliders, hasChanges, type Adjustments } from './schema';

type BasicAdjustmentsPanelProps = {
  adjustments: Adjustments;
  onChange: (patch: Partial<Adjustments>) => void;
  onReset: () => void;
};

const BasicAdjustmentsPanel = ({ adjustments, onChange, onReset }: BasicAdjustmentsPanelProps) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <h2 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
        Basic Adjustments
      </h2>
      {hasChanges(adjustments) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-5 px-1.5 text-[9px] text-muted-foreground hover:text-primary"
        >
          <RotateCcw className="w-2.5 h-2.5 mr-0.5" />
          Reset
        </Button>
      )}
    </div>
    <div className="space-y-2.5 p-2.5 rounded-md bg-muted/20 border border-border/30">
      {basicSliders.map((slider) => (
        <AdjustmentSlider
          key={slider.name}
          label={slider.label}
          value={adjustments[slider.name]}
          min={slider.min}
          max={slider.max}
          onChange={(v) => onChange({ [slider.name]: v })}
          icon={slider.icon}
        />
      ))}
    </div>
  </div>
);

BasicAdjustmentsPanel.displayName = 'BasicAdjustmentsPanel';

export { BasicAdjustmentsPanel };
