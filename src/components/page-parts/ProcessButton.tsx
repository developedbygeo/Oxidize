import { Loader2, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Size = 'sm' | 'md';

type ProcessButtonProps = {
  isProcessing: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  processingLabel?: string;
  size?: Size;
  className?: string;
};

const sizeStyles: Record<Size, { button: string; icon: string }> = {
  sm: { button: 'h-9 text-xs gap-1.5', icon: 'w-3.5 h-3.5' },
  md: { button: 'h-10 gap-2', icon: 'w-4 h-4' },
};

const ProcessButton = ({
  isProcessing,
  disabled,
  onClick,
  icon: Icon,
  label,
  processingLabel = 'Processing...',
  size = 'md',
  className,
}: ProcessButtonProps) => {
  const styles = sizeStyles[size];
  return (
    <Button
      onClick={onClick}
      disabled={isProcessing || disabled}
      className={cn('w-full', styles.button, className)}
    >
      {isProcessing ? (
        <>
          <Loader2 className={cn(styles.icon, 'animate-spin')} />
          {processingLabel}
        </>
      ) : (
        <>
          <Icon className={styles.icon} />
          {label}
        </>
      )}
    </Button>
  );
};

ProcessButton.displayName = 'ProcessButton';

export { ProcessButton };
