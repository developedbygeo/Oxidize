import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type PreviewNavigationProps = {
  currentIndex: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  children: React.ReactNode;
};

const PreviewNavigation = ({
  currentIndex,
  total,
  onPrev,
  onNext,
  children,
}: PreviewNavigationProps) => {
  if (total <= 1) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {children}

      <div className="absolute bottom-2 right-2 z-20 flex items-center gap-0.5 p-0.5 rounded-md bg-background/80 backdrop-blur-sm border border-border/30">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrev}
          className="h-5 w-5"
        >
          <ChevronLeft className="w-3 h-3" />
        </Button>
        <span className="text-[10px] font-medium min-w-8 text-center text-muted-foreground">
          {currentIndex + 1}/{total}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNext}
          className="h-5 w-5"
        >
          <ChevronRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

PreviewNavigation.displayName = 'PreviewNavigation';

export { PreviewNavigation };
