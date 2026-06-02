import { cn } from '@/lib/utils';
import {
  audioFormatLabels,
  audioFormatDescriptions,
  isLosslessAudioFormat,
  type AudioFormat,
} from '@/types/video';

const formats: AudioFormat[] = ['mp3', 'aac', 'opus', 'flac', 'wav'];

type AudioFormatPickerProps = {
  value: AudioFormat;
  onChange: (format: AudioFormat) => void;
};

const AudioFormatPicker = ({ value, onChange }: AudioFormatPickerProps) => (
  <div className="space-y-2">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
      Audio Format
    </label>
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
      {formats.map((format) => {
        const isActive = value === format;
        return (
          <button
            key={format}
            onClick={() => onChange(format)}
            className={cn(
              'px-3 py-2 rounded-md text-xs font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {audioFormatLabels[format]}
          </button>
        );
      })}
    </div>
    <p className="text-[11px] text-muted-foreground">
      {audioFormatDescriptions[value]}
      {isLosslessAudioFormat(value) && ' · bitrate ignored'}
    </p>
  </div>
);

AudioFormatPicker.displayName = 'AudioFormatPicker';

export { AudioFormatPicker };
