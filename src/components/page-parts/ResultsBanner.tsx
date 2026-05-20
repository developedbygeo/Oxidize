import { Check } from 'lucide-react';

type Size = 'sm' | 'md';

type ResultsBannerProps = {
  title: string;
  subtitle: string;
  size?: Size;
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
  }
> = {
  sm: {
    container: 'p-2 rounded-md',
    iconWrap: 'p-1 rounded',
    icon: 'w-3 h-3',
    title: 'text-[11px]',
    subtitle: 'text-[9px]',
    inner: 'gap-2',
  },
  md: {
    container: 'p-3 rounded-lg',
    iconWrap: 'p-1.5 rounded-md',
    icon: 'w-3.5 h-3.5',
    title: 'text-sm',
    subtitle: 'text-xs',
    inner: 'gap-2.5',
  },
};

const ResultsBanner = ({ title, subtitle, size = 'md', children }: ResultsBannerProps) => {
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
      </div>
    </div>
  );
};

ResultsBanner.displayName = 'ResultsBanner';

export { ResultsBanner };
