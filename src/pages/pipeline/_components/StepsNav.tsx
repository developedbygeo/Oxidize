import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { steps, type StepId } from './schema';

type StepsNavProps = {
  currentStep: StepId;
  completedSteps: Set<StepId>;
  hasImages: boolean;
  onStepClick: (stepId: StepId) => void;
};

const StepsNav = ({ currentStep, completedSteps, hasImages, onStepClick }: StepsNavProps) => (
  <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/20 border border-border/30">
    {steps.map((step) => {
      const isActive = currentStep === step.id;
      const isCompleted = completedSteps.has(step.id);
      const isAccessible = step.id === 'images' || hasImages;

      return (
        <button
          key={step.id}
          onClick={() => onStepClick(step.id)}
          disabled={!isAccessible}
          className={cn(
            'flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-md transition-colors',
            isActive && 'bg-primary/10',
            !isActive && isAccessible && 'hover:bg-muted/50',
            !isAccessible && 'opacity-40 cursor-not-allowed'
          )}
        >
          <div
            className={cn(
              'p-1.5 rounded transition-colors',
              isActive ? 'bg-primary/15' : isCompleted ? 'bg-primary/10' : 'bg-muted/50'
            )}
          >
            {isCompleted && !isActive ? (
              <Check className="w-3 h-3 text-primary" />
            ) : (
              <step.icon
                className={cn('w-3 h-3', isActive ? 'text-primary' : 'text-muted-foreground')}
                strokeWidth={1.75}
              />
            )}
          </div>
          <span className={cn('text-[10px] font-medium', isActive ? 'text-primary' : 'text-muted-foreground')}>
            {step.label}
          </span>
        </button>
      );
    })}
  </div>
);

StepsNav.displayName = 'StepsNav';

export { StepsNav };
