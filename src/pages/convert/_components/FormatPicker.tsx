import { cn } from '@/lib/utils';
import { formatLabels, formatDescriptions, type ImageFormat } from '@/types/image';
import { outputFormats } from './schema';

type FormatPickerProps = {
  value: ImageFormat;
  onChange: (format: ImageFormat) => void;
};

const FormatPicker = ({ value, onChange }: FormatPickerProps) => (
  <div className="space-y-2">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
      Output Format
    </label>
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
      {outputFormats.map((format) => (
        <button
          key={format}
          onClick={() => onChange(format)}
          className={cn(
            'relative px-3 py-2 rounded-md text-xs font-medium transition-colors',
            value === format
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {formatLabels[format]}
        </button>
      ))}
    </div>
    <p className="text-[11px] text-muted-foreground">{formatDescriptions[value]}</p>
  </div>
);

FormatPicker.displayName = 'FormatPicker';

export { FormatPicker };
