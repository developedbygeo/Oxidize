import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import { ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type WatermarkSourcePickerProps = {
  value: string | null;
  onChange: (path: string | null) => void;
};

const fileName = (path: string): string => {
  const sep = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return sep >= 0 ? path.slice(sep + 1) : path;
};

const WatermarkSourcePicker = ({ value, onChange }: WatermarkSourcePickerProps) => {
  const handlePick = async () => {
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [
        { name: 'Image', extensions: ['png', 'webp', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'ico'] },
      ],
    });
    if (typeof selected === 'string') onChange(selected);
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Watermark image
      </label>
      {value ? (
        <div className="flex items-center gap-3 rounded-md border border-border/40 bg-muted/20 p-2">
          <div className="size-12 shrink-0 rounded-md bg-[repeating-conic-gradient(theme(colors.muted.DEFAULT)_0_25%,transparent_0_50%)] bg-[length:12px_12px] overflow-hidden flex items-center justify-center">
            <img
              src={convertFileSrc(value)}
              alt="Watermark"
              className="max-h-12 max-w-12 object-contain"
            />
          </div>
          <span className="flex-1 min-w-0 truncate text-xs text-foreground">{fileName(value)}</span>
          <Button variant="ghost" size="sm" onClick={handlePick} className="h-8 text-[11px]">
            Replace
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChange(null)}
            className="h-8 w-8 shrink-0"
            aria-label="Remove watermark"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={handlePick}
          className="w-full h-12 justify-start gap-2 text-xs"
        >
          <ImagePlus className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-left flex-1">Choose a logo or watermark (PNG with transparency works best)</span>
        </Button>
      )}
    </div>
  );
};

WatermarkSourcePicker.displayName = 'WatermarkSourcePicker';

export { WatermarkSourcePicker };
