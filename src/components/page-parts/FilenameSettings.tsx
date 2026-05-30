import { Plus, SkipForward, Replace } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  DEFAULT_FILENAME_TEMPLATE,
  type OverwriteMode,
} from '@/types/output-naming';

type Size = 'sm' | 'md';

type FilenameSettingsProps = {
  template: string;
  overwriteMode: OverwriteMode;
  onTemplateChange: (next: string) => void;
  onOverwriteModeChange: (next: OverwriteMode) => void;
  size?: Size;
};

const OVERWRITE_OPTIONS: {
  value: OverwriteMode;
  label: string;
  hint: string;
  icon: typeof Plus;
}[] = [
  {
    value: 'auto-number',
    label: 'Auto-number',
    hint: 'Append " (1)", " (2)", … on collision',
    icon: Plus,
  },
  {
    value: 'skip',
    label: 'Skip',
    hint: "Don't write if the target exists",
    icon: SkipForward,
  },
  {
    value: 'overwrite',
    label: 'Overwrite',
    hint: 'Replace the existing file in place',
    icon: Replace,
  },
];

const sizeStyles: Record<
  Size,
  { label: string; button: string; input: string; icon: string }
> = {
  sm: {
    label: 'text-[10px]',
    button: 'h-7 px-2 text-[10px] gap-1',
    input: 'h-7 text-[11px]',
    icon: 'w-2.5 h-2.5',
  },
  md: {
    label: 'text-xs',
    button: 'h-8 px-3 text-[11px] gap-1.5',
    input: 'h-9 text-xs',
    icon: 'w-3 h-3',
  },
};

const FilenameSettings = ({
  template,
  overwriteMode,
  onTemplateChange,
  onOverwriteModeChange,
  size = 'md',
}: FilenameSettingsProps) => {
  const styles = sizeStyles[size];

  return (
    <div className="space-y-2">
      <label
        className={cn(
          styles.label,
          'font-medium text-muted-foreground uppercase tracking-wide'
        )}
      >
        Filename
      </label>

      <div className="grid grid-cols-3 gap-1.5">
        {OVERWRITE_OPTIONS.map(({ value, label, hint, icon: Icon }) => {
          const active = overwriteMode === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onOverwriteModeChange(value)}
              title={hint}
              className={cn(
                'flex items-center justify-center rounded-md font-medium transition-colors border',
                styles.button,
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/30 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className={styles.icon} strokeWidth={2} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-1">
        <Input
          value={template}
          onChange={(e) => onTemplateChange(e.target.value)}
          placeholder={DEFAULT_FILENAME_TEMPLATE}
          spellCheck={false}
          className={cn('font-mono', styles.input)}
        />
        <p className="text-[10px] text-muted-foreground/70 leading-tight">
          Placeholders: {'{name}'} {'{op}'} {'{date}'} {'{time}'} {'{width}'} {'{height}'}
        </p>
      </div>
    </div>
  );
};

FilenameSettings.displayName = 'FilenameSettings';

export { FilenameSettings };
