import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Workflow } from 'lucide-react';
import { fadeIn, fadeSlide } from '@/lib/animations';
import { Form } from '@/components/ui/form';
import type { ImageInfo, OperationHistoryItem } from '@/types/image';
import {
  pipelineSchema,
  defaultValues,
  steps,
  type PipelineFormValues,
  type StepId,
} from './_components/schema';
import { StepsNav } from './_components/StepsNav';
import { StepFooter } from './_components/StepFooter';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { ImagesStep } from './_components/ImagesStep';
import { CropStep } from './_components/CropStep';
import { ConvertStep } from './_components/ConvertStep';
import { CompressStep } from './_components/CompressStep';
import { BeautifyStep } from './_components/BeautifyStep';
import { EffectsStep } from './_components/EffectsStep';
import { ReviewStep } from './_components/ReviewStep';
import { usePipelineExecution } from './_components/usePipelineExecution';

type PipelinePageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const PipelinePage = ({ onOperationComplete }: PipelinePageProps) => {
  const [currentStep, setCurrentStep] = useState<StepId>('images');
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(() => new Set());
  const [previewIndex, setPreviewIndex] = useState(0);

  const form = useForm<PipelineFormValues>({
    resolver: zodResolver(pipelineSchema),
    defaultValues,
    mode: 'onChange',
  });

  const { isProcessing, execute } = usePipelineExecution({ images, onOperationComplete });

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const goToStep = (stepId: StepId) => {
    if (stepId === 'images' || images.length > 0) {
      setCurrentStep(stepId);
    }
  };

  const goNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep(steps[currentStepIndex + 1].id);
    }
  };

  const goPrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id);
    }
  };

  const handleImagesChange = useCallback((newImages: ImageInfo[]) => {
    setImages(newImages);
    setPreviewIndex(0);
  }, []);

  const goToPrevImage = useCallback(() => {
    setPreviewIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const goToNextImage = useCallback(() => {
    setPreviewIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  const handleReset = () => {
    setImages([]);
    setCurrentStep('images');
    setCompletedSteps(new Set());
    setPreviewIndex(0);
    form.reset(defaultValues);
  };

  const handleExecute = () => {
    execute(form.getValues());
  };

  useKeyboardShortcut('Enter', handleExecute, {
    meta: true,
    enabled: currentStep === 'review' && images.length > 0 && !isProcessing,
  });

  const renderStep = () => {
    switch (currentStep) {
      case 'images':
        return <ImagesStep images={images} onImagesChange={handleImagesChange} />;
      case 'crop':
        return (
          <CropStep
            form={form}
            images={images}
            previewIndex={previewIndex}
            onPrevImage={goToPrevImage}
            onNextImage={goToNextImage}
          />
        );
      case 'convert':
        return <ConvertStep form={form} />;
      case 'compress':
        return <CompressStep form={form} />;
      case 'beautify':
        return (
          <BeautifyStep
            form={form}
            images={images}
            previewIndex={previewIndex}
            onPrevImage={goToPrevImage}
            onNextImage={goToNextImage}
          />
        );
      case 'effects':
        return (
          <EffectsStep
            form={form}
            images={images}
            previewIndex={previewIndex}
            onPrevImage={goToPrevImage}
            onNextImage={goToNextImage}
          />
        );
      case 'review':
        return (
          <ReviewStep
            form={form}
            images={images}
            isProcessing={isProcessing}
            previewIndex={previewIndex}
            onPrevImage={goToPrevImage}
            onNextImage={goToNextImage}
            onReset={handleReset}
            onExecute={handleExecute}
            onSelectStep={goToStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        <motion.div variants={fadeIn} initial="hidden" animate="visible" className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Workflow className="w-4 h-4 text-primary" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Pipeline</h1>
            <p className="text-xs text-muted-foreground">Chain multiple operations in a workflow</p>
          </div>
        </motion.div>

        <StepsNav
          currentStep={currentStep}
          completedSteps={completedSteps}
          hasImages={images.length > 0}
          onStepClick={goToStep}
        />

        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                variants={fadeSlide}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="min-h-100"
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </form>
        </Form>

        {currentStep !== 'review' && (
          <StepFooter
            canGoPrev={currentStepIndex > 0}
            canGoNext={!(currentStep === 'images' && images.length === 0)}
            onPrev={goPrev}
            onNext={goNext}
          />
        )}
      </div>
    </div>
  );
};

PipelinePage.displayName = 'PipelinePage';

export { PipelinePage };
