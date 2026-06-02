import { CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdjustmentSlider } from './AdjustmentSlider';
import { colorSliders, whiteBalancePresets, type Adjustments } from './schema';
import type { WhiteBalancePreset } from '@/types/image';

type ColorCorrectionPanelProps = {
  adjustments: Adjustments;
  onChange: (patch: Partial<Adjustments>) => void;
};

const ColorCorrectionPanel = ({ adjustments, onChange }: ColorCorrectionPanelProps) => (
  <div className="space-y-2">
    <h2 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
      Color Correction
    </h2>
    <div className="space-y-2.5 p-2.5 rounded-md bg-muted/20 border border-border/30">
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <CircleDot className="w-3 h-3 text-muted-foreground" />
          <span className="text-[11px] font-medium text-foreground">White Balance</span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {whiteBalancePresets.map((preset) => {
            const isActive = adjustments.white_balance === preset.value;
            return (
              <button
                key={preset.value}
                onClick={() => onChange({ white_balance: preset.value as WhiteBalancePreset })}
                className={cn(
                  'flex flex-col items-center gap-0.5 p-1 rounded transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted/30 hover:bg-muted/50 text-muted-foreground'
                )}
              >
                <preset.icon className="w-3 h-3" strokeWidth={1.75} />
                <span className={cn('text-[8px]', isActive ? 'font-medium' : '')}>
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {colorSliders.map((slider) => (
        <AdjustmentSlider
          key={slider.name}
          label={slider.label}
          value={adjustments[slider.name]}
          min={slider.min}
          max={slider.max}
          onChange={(v) => onChange({ [slider.name]: v })}
          icon={slider.icon}
          unit={slider.unit}
        />
      ))}
      <div className="flex justify-between text-[9px] text-muted-foreground px-0.5">
        <span>Cool</span>
        <span>Warm</span>
      </div>
    </div>
  </div>
);

ColorCorrectionPanel.displayName = 'ColorCorrectionPanel';

export { ColorCorrectionPanel };
