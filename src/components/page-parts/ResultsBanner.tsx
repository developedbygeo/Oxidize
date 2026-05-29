import { Check, FolderOpen } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Size = 'sm' | 'md';

type ResultsBannerProps = {
  title: string;
  subtitle: string;
  size?: Size;
  outputDir?: string;
  children?: React.ReactNode;
};

const sizeStyles: Record<
  Size,
  {
    container: string;
    iconWrap: string;
    icon: string;
    title: string;
    subtitle: string;
    inner: string;
    button: string;
    buttonIcon: string;
  }
> = {
  sm: {
    container: 'p-2 rounded-md',
    iconWrap: 'p-1 rounded',
    icon: 'w-3 h-3',
    title: 'text-[11px]',
    subtitle: 'text-[9px]',
    inner: 'gap-2',
    button: 'h-6 px-1.5 text-[9px] gap-1 rounded',
    buttonIcon: 'w-2.5 h-2.5',
  },
  md: {
    container: 'p-3 rounded-lg',
    iconWrap: 'p-1.5 rounded-md',
    icon: 'w-3.5 h-3.5',
    title: 'text-sm',
    subtitle: 'text-xs',
    inner: 'gap-2.5',
    button: 'h-7 px-2.5 text-[11px] gap-1.5 rounded-md',
    buttonIcon: 'w-3 h-3',
  },
};

const openOutputFolder = async (path: string) => {
  try {
    await invoke('open_folder', { path });
  } catch {
    toast.error('Folder not found', {
      description: 'The output directory may have been moved or deleted.',
    });
  }
};

const ResultsBanner = ({ title, subtitle, size = 'md', outputDir, children }: ResultsBannerProps) => {
  const styles = sizeStyles[size];
  return (
    <div className={`${styles.container} bg-primary/5 border border-primary/10`}>
      <div className={`flex items-center ${styles.inner}`}>
        <div className={`${styles.iconWrap} bg-primary/10`}>
          <Check className={`${styles.icon} text-primary`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`${styles.title} font-medium text-foreground`}>{title}</p>
          <p className={`${styles.subtitle} text-muted-foreground`}>{subtitle}</p>
        </div>
        {children}
        {outputDir && (
          <button
            type="button"
            onClick={() => openOutputFolder(outputDir)}
            className={cn(
              styles.button,
              'flex items-center font-medium text-primary',
              'bg-primary/10 hover:bg-primary/15 transition-colors',
              'border border-primary/15'
            )}
            title={`Open ${outputDir}`}
          >
            <FolderOpen className={styles.buttonIcon} />
            <span>Open folder</span>
          </button>
        )}
      </div>
    </div>
  );
};

ResultsBanner.displayName = 'ResultsBanner';

export { ResultsBanner };
