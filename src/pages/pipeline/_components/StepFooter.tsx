import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type StepFooterProps = {
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
};

const StepFooter = ({ canGoPrev, canGoNext, onPrev, onNext }: StepFooterProps) => (
  <div className="flex gap-2">
    <Button
      variant="outline"
      onClick={onPrev}
      disabled={!canGoPrev}
      className="flex-1 h-9 gap-1.5 text-xs"
    >
      <ChevronLeft className="w-3.5 h-3.5" />
      Previous
    </Button>
    <Button onClick={onNext} disabled={!canGoNext} className="flex-1 h-9 gap-1.5 text-xs">
      Next
      <ChevronRight className="w-3.5 h-3.5" />
    </Button>
  </div>
);

StepFooter.displayName = 'StepFooter';

export { StepFooter };
