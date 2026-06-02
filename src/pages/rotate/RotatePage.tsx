import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCw, Sparkles } from 'lucide-react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
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
import type {
  ImageInfo,
  OperationHistoryItem,
  RotateResult,
  RotationDegrees,
} from '@/types/image';
import {
  defaultFormValues,
  formatFileSize,
  isNoop,
  rotateFormSchema,
  type RotateFormValues,
} from './_components/schema';
import { EmptyState } from './_components/EmptyState';
import { RotationPicker } from './_components/RotationPicker';
import { FlipPicker } from './_components/FlipPicker';
import { runRotate } from './_components/useRotateExecution';

type RotatePageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

/**
 * Build a CSS transform string that mirrors the Rust `apply_rotate_flip`
 * pipeline (rotate first, then flips). Used for the preview only — the
 * actual encode happens in Rust.
 */
const previewTransform = (
  rotation: RotationDegrees,
  flipH: boolean,
  flipV: boolean
): string => {
  const parts: string[] = [];
  if (rotation !== 0) parts.push(`rotate(${rotation}deg)`);
  if (flipH) parts.push('scaleX(-1)');
  if (flipV) parts.push('scaleY(-1)');
  return parts.join(' ');
};

const RotatePage = ({ onOperationComplete }: RotatePageProps) => {
  const form = useForm<RotateFormValues>({
    resolver: zodResolver(rotateFormSchema),
    defaultValues: defaultFormValues,
    mode: 'onChange',
  });
  usePersistedFormDefaults({
    page: 'rotate',
    form,
    baseDefaults: defaultFormValues,
    persistKeys: [
      'rotationDegrees',
      'flipHorizontal',
      'flipVertical',
      'outputDir',
      'filenameTemplate',
      'overwriteMode',
    ],
  });
  const { control } = form;
  const rotationDegrees = useWatch({ control, name: 'rotationDegrees' });
  const flipHorizontal = useWatch({ control, name: 'flipHorizontal' });
  const flipVertical = useWatch({ control, name: 'flipVertical' });
  const outputDir = useWatch({ control, name: 'outputDir' });
  const filenameTemplate = useWatch({ control, name: 'filenameTemplate' });
  const overwriteMode = useWatch({ control, name: 'overwriteMode' });

  const [images, setImages] = useState<ImageInfo[]>([]);
  const [results, setResults] = useState<RotateResult[]>([]);
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

  const handleRotate = () =>
    runRotate({
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

  useKeyboardShortcut('Enter', handleRotate, { meta: true, enabled: canRun });
  useKeyboardShortcut('Escape', () => invoke('cancel_image_jobs'), { enabled: isProcessing });

  const successCount = results.filter((r) => r.success).length;
  const previewImage = images[0];
  const cssTransform = previewTransform(rotationDegrees, flipHorizontal, flipVertical);

  if (images.length === 0 && !showResults) {
    return <EmptyState onImagesChange={setImages} />;
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        <PageHeader
          icon={RotateCw}
          title="Rotate"
          description="Orient images with quarter-turn rotation and flips"
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
              {previewImage && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Preview
                  </label>
                  <div className="flex items-center justify-center rounded-lg border border-border/40 bg-muted/20 p-4 overflow-hidden min-h-64">
                    <img
                      src={convertFileSrc(previewImage.path)}
                      alt={previewImage.name}
                      style={{ transform: cssTransform, transition: 'transform 200ms ease' }}
                      className="max-h-72 max-w-full object-contain"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">
                    Showing {previewImage.name}
                    {images.length > 1 && ` (first of ${images.length})`}
                  </p>
                </div>
              )}

              <RotationPicker
                value={rotationDegrees}
                onChange={(v) =>
                  form.setValue('rotationDegrees', v, { shouldValidate: true })
                }
              />

              <FlipPicker
                horizontal={flipHorizontal}
                vertical={flipVertical}
                onHorizontalChange={(v) =>
                  form.setValue('flipHorizontal', v, { shouldValidate: true })
                }
                onVerticalChange={(v) =>
                  form.setValue('flipVertical', v, { shouldValidate: true })
                }
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
                onClick={handleRotate}
                icon={Sparkles}
                label={
                  noop
                    ? 'Pick a rotation or flip to enable'
                    : `Rotate ${images.length} image${images.length !== 1 ? 's' : ''}`
                }
                processingLabel="Rotating..."
              />
            </motion.div>
          )}
        </AnimatePresence>

        {isProcessing && images.length > 0 && (
          <JobProgressBar
            items={images.map((img) => ({ path: img.path, name: img.name }))}
            progress={progress}
            running={isProcessing}
            verb="Rotating"
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
                subtitle={`${successCount}/${results.length} rotated`}
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

RotatePage.displayName = 'RotatePage';

export { RotatePage };
