import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Stamp, Sparkles } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fadeUp } from '@/lib/animations';
import { resolveOutputDir } from '@/lib/utils';
import { ImageDropzone } from '@/components/ImageDropzone';
import { PageHeader } from '@/components/page-parts/PageHeader';
import { OutputLocationPicker } from '@/components/page-parts/OutputLocationPicker';
import { FilenameSettings } from '@/components/page-parts/FilenameSettings';
import { ProcessButton } from '@/components/page-parts/ProcessButton';
import { ResultsBanner } from '@/components/page-parts/ResultsBanner';
import { ResultsList } from '@/components/page-parts/ResultsList';
import { JobProgressBar } from '@/components/page-parts/JobProgressBar';
import { useImageProgress } from '@/hooks/useImageProgress';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { useClipboardImagePaste } from '@/hooks/useClipboardImagePaste';
import { usePersistedFormDefaults } from '@/hooks/usePersistedFormDefaults';
import type { ImageInfo, OperationHistoryItem, WatermarkResult } from '@/types/image';
import {
  defaultFormValues,
  formatFileSize,
  isNoop,
  watermarkFormSchema,
  type WatermarkFormValues,
} from './_components/schema';
import { EmptyState } from './_components/EmptyState';
import { WatermarkSourcePicker } from './_components/WatermarkSourcePicker';
import { PositionGrid } from './_components/PositionGrid';
import { WatermarkSliders } from './_components/WatermarkSliders';
import { WatermarkPreview } from './_components/WatermarkPreview';
import { runWatermark } from './_components/useWatermarkExecution';

type WatermarkPageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const WatermarkPage = ({ onOperationComplete }: WatermarkPageProps) => {
  const form = useForm<WatermarkFormValues>({
    resolver: zodResolver(watermarkFormSchema),
    defaultValues: defaultFormValues,
    mode: 'onChange',
  });
  usePersistedFormDefaults({
    page: 'watermark',
    form,
    baseDefaults: defaultFormValues,
    persistKeys: [
      'position',
      'opacity',
      'scalePercent',
      'marginPercent',
      'outputDir',
      'filenameTemplate',
      'overwriteMode',
    ],
  });
  const { control } = form;
  const watermarkPath = useWatch({ control, name: 'watermarkPath' });
  const position = useWatch({ control, name: 'position' });
  const opacity = useWatch({ control, name: 'opacity' });
  const scalePercent = useWatch({ control, name: 'scalePercent' });
  const marginPercent = useWatch({ control, name: 'marginPercent' });
  const outputDir = useWatch({ control, name: 'outputDir' });
  const filenameTemplate = useWatch({ control, name: 'filenameTemplate' });
  const overwriteMode = useWatch({ control, name: 'overwriteMode' });

  const [images, setImages] = useState<ImageInfo[]>([]);
  const [results, setResults] = useState<WatermarkResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const progress = useImageProgress(isProcessing);

  useClipboardImagePaste({
    onImagesAdded: (added) => setImages((prev) => [...prev, ...added]),
    enabled: !isProcessing,
  });

  const formValues = form.getValues();
  const noop = isNoop(formValues);
  const canRun = images.length > 0 && !noop && !isProcessing;

  const handleWatermark = () =>
    runWatermark({
      images,
      values: formValues,
      onStart: () => {
        setIsProcessing(true);
        setShowResults(false);
      },
      onFinish: (r) => {
        setIsProcessing(false);
        setResults(r);
        setShowResults(true);
      },
      onOperationComplete,
    });

  useKeyboardShortcut('Enter', handleWatermark, { meta: true, enabled: canRun });
  useKeyboardShortcut('Escape', () => invoke('cancel_image_jobs'), { enabled: isProcessing });

  const successCount = results.filter((r) => r.success).length;
  const previewImage = images[0];

  if (images.length === 0 && !showResults) {
    return <EmptyState onImagesChange={setImages} />;
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        <PageHeader
          icon={Stamp}
          title="Watermark"
          description="Overlay a logo or mark across a batch of images"
        />

        <ImageDropzone images={images} onImagesChange={setImages} />

        <AnimatePresence>
          {images.length > 0 && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-5"
            >
              <WatermarkSourcePicker
                value={watermarkPath}
                onChange={(path) =>
                  form.setValue('watermarkPath', path, { shouldValidate: true })
                }
              />

              {previewImage && watermarkPath && (
                <WatermarkPreview
                  source={previewImage}
                  sourceCount={images.length}
                  watermarkPath={watermarkPath}
                  position={position}
                  opacity={opacity}
                  scalePercent={scalePercent}
                  marginPercent={marginPercent}
                />
              )}

              <PositionGrid
                value={position}
                onChange={(v) => form.setValue('position', v, { shouldValidate: true })}
              />

              <WatermarkSliders
                opacity={opacity}
                scalePercent={scalePercent}
                marginPercent={marginPercent}
                onOpacityChange={(v) => form.setValue('opacity', v, { shouldValidate: true })}
                onScaleChange={(v) => form.setValue('scalePercent', v, { shouldValidate: true })}
                onMarginChange={(v) => form.setValue('marginPercent', v, { shouldValidate: true })}
              />

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Output Location
                </label>
                <OutputLocationPicker
                  value={outputDir}
                  onChange={(dir) => form.setValue('outputDir', dir, { shouldValidate: true })}
                  size="md"
                />
              </div>

              <FilenameSettings
                template={filenameTemplate}
                overwriteMode={overwriteMode}
                onTemplateChange={(v) =>
                  form.setValue('filenameTemplate', v, { shouldValidate: true })
                }
                onOverwriteModeChange={(v) =>
                  form.setValue('overwriteMode', v, { shouldValidate: true })
                }
                size="md"
              />

              <ProcessButton
                isProcessing={isProcessing}
                disabled={!canRun}
                onClick={handleWatermark}
                icon={Sparkles}
                label={
                  !watermarkPath
                    ? 'Choose a watermark image to enable'
                    : `Watermark ${images.length} image${images.length !== 1 ? 's' : ''}`
                }
                processingLabel="Watermarking..."
              />
            </motion.div>
          )}
        </AnimatePresence>

        {isProcessing && images.length > 0 && (
          <JobProgressBar
            items={images.map((img) => ({ path: img.path, name: img.name }))}
            progress={progress}
            running={isProcessing}
            verb="Watermarking"
            itemName="image"
            onCancel={() => invoke('cancel_image_jobs')}
          />
        )}

        <AnimatePresence>
          {showResults && results.length > 0 && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-3"
            >
              <ResultsBanner
                title="Complete"
                subtitle={`${successCount}/${results.length} watermarked`}
                outputDir={resolveOutputDir({ results, fallbackDir: outputDir })}
              />
              <ResultsList results={results}>
                {(result) => (
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatFileSize(result.new_size)}
                  </span>
                )}
              </ResultsList>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

WatermarkPage.displayName = 'WatermarkPage';

export { WatermarkPage };
