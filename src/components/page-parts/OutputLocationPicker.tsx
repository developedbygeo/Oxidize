import { FolderOpen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pickOutputDir } from '@/lib/output-dir';

type Size = 'sm' | 'md' | 'lg';

type OutputLocationPickerProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  size?: Size;
  placeholder?: string;
};

const sizeStyles: Record<
  Size,
  {
    button: string;
    clearButton: string;
    icon: string;
    gap: string;
  }
> = {
  sm: { button: 'h-8 text-[11px] gap-1.5', clearButton: 'h-8 w-8', icon: 'w-3 h-3', gap: 'gap-1' },
  md: { button: 'h-9 text-xs gap-2', clearButton: 'h-9 w-9', icon: 'w-3.5 h-3.5', gap: 'gap-1.5' },
  lg: { button: 'h-12 text-sm gap-2', clearButton: 'h-12 w-12', icon: 'w-4 h-4', gap: 'gap-2' },
};

const OutputLocationPicker = ({
  value,
  onChange,
  size = 'md',
  placeholder = 'Saved next to original files',
}: OutputLocationPickerProps) => {
  const styles = sizeStyles[size];

  const handlePick = async () => {
    const dir = await pickOutputDir();
    if (dir) onChange(dir);
  };

  return (
    <div className={`flex ${styles.gap}`}>
      <Button
        variant="outline"
        onClick={handlePick}
        className={`flex-1 justify-start ${styles.button} min-w-0`}
      >
        <FolderOpen className={`${styles.icon} text-muted-foreground shrink-0`} />
        <span className="truncate text-left flex-1">{value || placeholder}</span>
      </Button>
      {value && (
        <Button
          variant="outline"
          onClick={() => onChange(null)}
          className={`${styles.clearButton} shrink-0`}
          aria-label="Clear output folder"
        >
          <X className={styles.icon} />
        </Button>
      )}
    </div>
  );
};

OutputLocationPicker.displayName = 'OutputLocationPicker';

export { OutputLocationPicker };
