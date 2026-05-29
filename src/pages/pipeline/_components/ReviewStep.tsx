import { motion } from 'motion/react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import {
  Images,
  ArrowRightLeft,
  Minimize2,
  Sparkles,
  Wand2,
  Play,
  Loader2,
  RotateCcw,
  Workflow,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeUp } from '@/lib/animations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { PipelinePreview, type PipelinePreviewStep } from '@/components/PipelinePreview';
import { PreviewNavigation } from '@/components/PreviewNavigation';
import { OutputLocationPicker } from '@/components/page-parts/OutputLocationPicker';
import { effectsList, formatLabels, type ImageInfo, type ImageFormat } from '@/types/image';
import { SummaryCard } from './SummaryCard';
import type { PipelineFormValues, StepId } from './schema';
import { useBeautifyPreviewOptions, useEffectsPreviewOptions } from './usePreviewOptions';

type ReviewStepProps = {
  form: UseFormReturn<PipelineFormValues>;
  images: ImageInfo[];
  isProcessing: boolean;
  previewIndex: number;
  onPrevImage: () => void;
  onNextImage: () => void;
  onReset: () => void;
  onExecute: () => void;
  onSelectStep: (id: StepId) => void;
};

const operationShortcuts: { id: StepId; label: string; description: string; icon: LucideIcon }[] = [
  { id: 'convert', label: 'Convert', description: 'Change format', icon: ArrowRightLeft },
  { id: 'compress', label: 'Compress', description: 'Reduce size', icon: Minimize2 },
  { id: 'beautify', label: 'Beautify', description: 'Enhance images', icon: Sparkles },
  { id: 'effects', label: 'Effects', description: 'Apply filters', icon: Wand2 },
];

const ReviewStep = ({
  form,
  images,
  isProcessing,
  previewIndex,
  onPrevImage,
  onNextImage,
  onReset,
  onExecute,
  onSelectStep,
}: ReviewStepProps) => {
  const values = useWatch({ control: form.control });
  const beautifyOptions = useBeautifyPreviewOptions(form.control);
  const effectsOptions = useEffectsPreviewOptions(form.control);
  const previewImage = images[previewIndex] ?? images[0];

  const enabledCount =
    Number(!!values.convertEnabled) +
    Number(!!values.compressEnabled) +
    Number(!!values.beautifyEnabled) +
    Number(!!values.effectsEnabled);

  const previewSteps: PipelinePreviewStep[] = [
    ...(values.beautifyEnabled ? [{ kind: 'beautify' as const, options: beautifyOptions }] : []),
    ...(values.effectsEnabled ? [{ kind: 'effects' as const, options: effectsOptions }] : []),
  ];

  const showPreview = images.length > 0 && previewSteps.length > 0 && previewImage;

  const beautifyDetails =
    [
      values.brightness !== 0 && `Brightness: ${values.brightness}`,
      values.contrast !== 0 && `Contrast: ${values.contrast}`,
      values.saturation !== 0 && `Saturation: ${values.saturation}`,
      values.sharpness !== 0 && `Sharpness: ${values.sharpness}`,
    ]
      .filter(Boolean)
      .join(', ') || 'Default settings';

  return (
    <div className="space-y-6">
      {showPreview && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <PreviewNavigation
            currentIndex={previewIndex}
            total={images.length}
            onPrev={onPrevImage}
            onNext={onNextImage}
          >
            <PipelinePreview
              src={previewImage.thumbnail}
              steps={previewSteps}
              className="h-64"
            />
          </PreviewNavigation>
        </motion.div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Pipeline Summary</h3>
        <div className="grid gap-3">
          <SummaryCard
            icon={Images}
            title="Images"
            className={cn(images.length === 0 && 'border-border/50')}
          >
            <CardDescription>
              {images.length} image{images.length !== 1 ? 's' : ''} selected
            </CardDescription>
          </SummaryCard>

          {values.convertEnabled && (
            <SummaryCard icon={ArrowRightLeft} title="Convert">
              <CardDescription>
                To {formatLabels[values.convertFormat as ImageFormat]} at {values.convertQuality}% quality
              </CardDescription>
            </SummaryCard>
          )}

          {values.compressEnabled && (
            <SummaryCard icon={Minimize2} title="Compress">
              <CardDescription>Quality: {values.compressQuality}%</CardDescription>
            </SummaryCard>
          )}

          {values.beautifyEnabled && (
            <SummaryCard icon={Sparkles} title="Beautify">
              <CardDescription>{beautifyDetails}</CardDescription>
            </SummaryCard>
          )}

          {values.effectsEnabled && (
            <SummaryCard icon={Wand2} title="Effects">
              <CardDescription>
                {effectsList.find((e) => e.type === values.effectType)?.label} at{' '}
                {values.effectIntensity}% intensity
              </CardDescription>
            </SummaryCard>
          )}

          {enabledCount === 0 && (
            <Card className="border border-border/60 bg-muted/30">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10 shrink-0">
                    <Workflow className="w-4 h-4 text-primary" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">No operations enabled yet</p>
                    <p className="text-xs text-muted-foreground">
                      Pick at least one step to run on your images.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {operationShortcuts.map((op) => (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => onSelectStep(op.id)}
                      className={cn(
                        'group flex items-center gap-2.5 p-2.5 rounded-md text-left',
                        'border border-border/40 bg-background/60',
                        'hover:border-primary/40 hover:bg-primary/5 transition-colors'
                      )}
                    >
                      <op.icon
                        className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0"
                        strokeWidth={1.75}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{op.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {op.description}
                        </p>
                      </div>
                      <ChevronRight className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">Output Location</label>
        <OutputLocationPicker
          value={values.outputDir ?? null}
          onChange={(dir) => form.setValue('outputDir', dir)}
          size="lg"
          placeholder="Saved next to original files (click to choose folder)"
        />
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onReset} className="flex-1 h-12 gap-2">
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
        <Button
          onClick={onExecute}
          disabled={isProcessing || images.length === 0 || enabledCount === 0}
          className="flex-1 h-12 gap-2 bg-primary hover:bg-primary/90"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin">
                <Loader2 className="w-4 h-4" />
              </div>
              Processing...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Execute Pipeline
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

ReviewStep.displayName = 'ReviewStep';

export { ReviewStep };
