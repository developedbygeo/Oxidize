import { cn } from '@/lib/utils';
import { videoFormatLabels, type VideoFormat } from '@/types/video';
import { videoOutputFormats } from './schema';

type FormatPickerProps = {
  value: VideoFormat;
  onChange: (format: VideoFormat) => void;
};

const FormatPicker = ({ value, onChange }: FormatPickerProps) => (
  <div className="space-y-2">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
      Container
    </label>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
      {videoOutputFormats.map((format) => (
        <button
          key={format}
          onClick={() => onChange(format)}
          className={cn(
            'px-3 py-2 rounded-md text-xs font-medium transition-colors',
            value === format
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {videoFormatLabels[format]}
        </button>
      ))}
    </div>
  </div>
);

FormatPicker.displayName = 'FormatPicker';

export { FormatPicker };
