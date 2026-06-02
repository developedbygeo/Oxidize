import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Scaling, Sparkles } from 'lucide-react';
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
import { SourcePreview } from '@/components/page-parts/SourcePreview';
import { JobProgressBar } from '@/components/page-parts/JobProgressBar';
import { useImageProgress } from '@/hooks/useImageProgress';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { useClipboardImagePaste } from '@/hooks/useClipboardImagePaste';
import { usePersistedFormDefaults } from '@/hooks/usePersistedFormDefaults';
import type { ImageInfo, OperationHistoryItem, ResizeResult } from '@/types/image';
import {
  defaultFormValues,
  formatFileSize,
  isNoop,
  resizeFormSchema,
  type ResizeFormValues,
} from './_components/schema';
import { EmptyState } from './_components/EmptyState';
import { DimensionInputs } from './_components/DimensionInputs';
import { FitPicker } from './_components/FitPicker';
import { runResize } from './_components/useResizeExecution';

type ResizePageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const ResizePage = ({ onOperationComplete }: ResizePageProps) => {
  const form = useForm<ResizeFormValues>({
    resolver: zodResolver(resizeFormSchema),
    defaultValues: defaultFormValues,
    mode: 'onChange',
  });
  usePersistedFormDefaults({
    page: 'resize',
    form,
    baseDefaults: defaultFormValues,
    persistKeys: [
      'width',
      'height',
      'fit',
      'outputDir',
      'filenameTemplate',
      'overwriteMode',
    ],
  });
  const { control } = form;
  const width = useWatch({ control, name: 'width' });
  const height = useWatch({ control, name: 'height' });
  const fit = useWatch({ control, name: 'fit' });
  const outputDir = useWatch({ control, name: 'outputDir' });
  const filenameTemplate = useWatch({ control, name: 'filenameTemplate' });
  const overwriteMode = useWatch({ control, name: 'overwriteMode' });

  const [images, setImages] = useState<ImageInfo[]>([]);
  const [results, setResults] = useState<ResizeResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const progress = useImageProgress(isProcessing);

  useClipboardImagePaste({
    onImagesAdded: (added) => setImages((prev) => [...prev, ...added]),
    enabled: !isProcessing,
  });

  const formValues = form.getValues();
  const noop = isNoop(formValues);
  const singleAxis = width === null || height === null;
  const canRun = images.length > 0 && !noop && !isProcessing;

  const handleResize = () =>
    runResize({
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

  useKeyboardShortcut('Enter', handleResize, { meta: true, enabled: canRun });
  useKeyboardShortcut('Escape', () => invoke('cancel_image_jobs'), { enabled: isProcessing });

  const successCount = results.filter((r) => r.success).length;

  if (images.length === 0 && !showResults) {
    return <EmptyState onImagesChange={setImages} />;
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        <PageHeader
          icon={Scaling}
          title="Resize"
          description="Scale images to a target width, height, or both"
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
              <SourcePreview images={images} />

              <DimensionInputs
                width={width}
                height={height}
                onWidthChange={(v) => form.setValue('width', v, { shouldValidate: true })}
                onHeightChange={(v) => form.setValue('height', v, { shouldValidate: true })}
              />

              <FitPicker
                value={fit}
                onChange={(v) => form.setValue('fit', v, { shouldValidate: true })}
                disabled={singleAxis}
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
                onClick={handleResize}
                icon={Sparkles}
                label={
                  noop
                    ? 'Set a width or height to enable'
                    : `Resize ${images.length} image${images.length !== 1 ? 's' : ''}`
                }
                processingLabel="Resizing..."
              />
            </motion.div>
          )}
        </AnimatePresence>

        {isProcessing && images.length > 0 && (
          <JobProgressBar
            items={images.map((img) => ({ path: img.path, name: img.name }))}
            progress={progress}
            running={isProcessing}
            verb="Resizing"
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
                subtitle={`${successCount}/${results.length} resized`}
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

ResizePage.displayName = 'ResizePage';

export { ResizePage };
