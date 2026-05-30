import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crop, RotateCcw } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { fadeUp } from '@/lib/animations';
import { resolveOutputDir } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CropCanvas, type CropRect } from '@/components/CropCanvas';
import { JobProgressBar } from '@/components/page-parts/JobProgressBar';
import { OutputLocationPicker } from '@/components/page-parts/OutputLocationPicker';
import { FilenameSettings } from '@/components/page-parts/FilenameSettings';
import { ProcessButton } from '@/components/page-parts/ProcessButton';
import { ResultsBanner } from '@/components/page-parts/ResultsBanner';
import { ResultsList } from '@/components/page-parts/ResultsList';
import { useImageProgress } from '@/hooks/useImageProgress';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { usePersistedFormDefaults } from '@/hooks/usePersistedFormDefaults';
import type { CropResult, ImageInfo, OperationHistoryItem } from '@/types/image';
import {
  cropFormSchema,
  defaultFormValues,
  getRatioById,
  type AspectRatioId,
  type CropFormValues,
} from './_components/schema';
import { AspectRatioPicker } from './_components/AspectRatioPicker';
import { EmptyState } from './_components/EmptyState';
import { runCrop } from './_components/useCropExecution';

type CropPageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

/** Default rect = centered 80% of the image. */
const defaultRectFor = (image: ImageInfo): CropRect => {
  const width = Math.round(image.width * 0.8);
  const height = Math.round(image.height * 0.8);
  return {
    x: Math.round((image.width - width) / 2),
    y: Math.round((image.height - height) / 2),
    width,
    height,
  };
};

const CropPage = ({ onOperationComplete }: CropPageProps) => {
  const form = useForm<CropFormValues>({
    resolver: zodResolver(cropFormSchema),
    defaultValues: defaultFormValues,
    mode: 'onChange',
  });
  usePersistedFormDefaults({
    page: 'crop',
    form,
    baseDefaults: defaultFormValues,
    // x/y/width/height are per-image; everything else makes sense to persist.
    persistKeys: ['aspectRatio', 'outputDir', 'filenameTemplate', 'overwriteMode'],
  });
  const { control, setValue, getValues, reset } = form;
  const rect: CropRect = {
    x: useWatch({ control, name: 'x' }),
    y: useWatch({ control, name: 'y' }),
    width: useWatch({ control, name: 'width' }),
    height: useWatch({ control, name: 'height' }),
  };
  const aspectRatioId = useWatch({ control, name: 'aspectRatio' });
  const outputDir = useWatch({ control, name: 'outputDir' });
  const filenameTemplate = useWatch({ control, name: 'filenameTemplate' });
  const overwriteMode = useWatch({ control, name: 'overwriteMode' });

  const [images, setImages] = useState<ImageInfo[]>([]);
  const [results, setResults] = useState<CropResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isCropping, setIsCropping] = useState(false);

  const progress = useImageProgress(isCropping);

  const image = images[0];
  const previewSrc = image ? convertFileSrc(image.path) : '';

  // Seed a default crop rect when an image first loads — saves the user the
  // chore of dragging out an initial rectangle.
  useEffect(() => {
    if (!image) return;
    if (rect.width > 0 && rect.height > 0) return;
    const seed = defaultRectFor(image);
    setValue('x', seed.x);
    setValue('y', seed.y);
    setValue('width', seed.width);
    setValue('height', seed.height);
    // We intentionally depend on `image.path` only — rect zeroes are the trigger
    // for seeding, but we don't want to re-seed every time the user shrinks
    // a rect to zero width while dragging.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image?.path]);

  const handleRectChange = (next: CropRect) => {
    setValue('x', next.x, { shouldValidate: true });
    setValue('y', next.y, { shouldValidate: true });
    setValue('width', next.width, { shouldValidate: true });
    setValue('height', next.height, { shouldValidate: true });
  };

  const handleAspectChange = (id: AspectRatioId) => {
    setValue('aspectRatio', id, { shouldValidate: true });
    // If a ratio is now active and the current rect is off-ratio, adjust the
    // height to match. Width stays put — that feels more intentional than
    // recentering.
    const ratio = getRatioById(id);
    if (ratio && rect.width > 0 && image) {
      const newHeight = Math.min(rect.width / ratio, image.height - rect.y);
      setValue('height', Math.round(newHeight), { shouldValidate: true });
    }
  };

  const handleResetRect = () => {
    if (!image) return;
    const seed = defaultRectFor(image);
    setValue('x', seed.x);
    setValue('y', seed.y);
    setValue('width', seed.width);
    setValue('height', seed.height);
  };

  const handleCrop = () =>
    runCrop({
      images,
      values: getValues(),
      onStart: () => {
        setIsCropping(true);
        setShowResults(false);
      },
      onFinish: (r) => {
        setIsCropping(false);
        setResults(r);
        setShowResults(true);
      },
      onOperationComplete,
    });

  const handleImagesChange = (next: ImageInfo[]) => {
    setImages(next);
    setShowResults(false);
    setResults([]);
    // Preserve the user's output naming preferences alongside the dir —
    // only the per-image crop state needs to be reset.
    reset({ ...defaultFormValues, outputDir, filenameTemplate, overwriteMode });
  };

  const successCount = results.filter((r) => r.success).length;
  const canCrop = rect.width > 0 && rect.height > 0 && !isCropping;

  useKeyboardShortcut('Enter', handleCrop, { meta: true, enabled: canCrop });
  useKeyboardShortcut('Escape', () => invoke('cancel_image_jobs'), { enabled: isCropping });

  if (!image) {
    return <EmptyState onImagesChange={handleImagesChange} />;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 border-r border-border/50 bg-muted/10">
          <div className="flex-1 flex items-center justify-center p-6 min-h-0">
            {previewSrc && (
              <CropCanvas
                imageSrc={previewSrc}
                imageWidth={image.width}
                imageHeight={image.height}
                rect={rect}
                onRectChange={handleRectChange}
                aspectRatio={getRatioById(aspectRatioId)}
                className="h-full max-h-[60vh] max-w-full"
              />
            )}
          </div>

          <div className="border-t border-border/30 p-2.5 flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="truncate">{image.name}</span>
            <span className="font-mono tabular-nums shrink-0 ml-3">
              {rect.width > 0
                ? `${Math.round(rect.x)}, ${Math.round(rect.y)} · ${Math.round(rect.width)} × ${Math.round(rect.height)}`
                : 'Drag to select a region'}
            </span>
          </div>
        </div>

        <div className="w-72 flex flex-col bg-background overflow-hidden shrink-0">
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <AspectRatioPicker value={aspectRatioId} onChange={handleAspectChange} size="sm" />

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetRect}
              className="w-full h-8 gap-1.5 text-xs"
            >
              <RotateCcw className="w-3 h-3" />
              Reset selection
            </Button>

            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Output
              </label>
              <OutputLocationPicker
                value={outputDir}
                onChange={(dir) => setValue('outputDir', dir, { shouldValidate: true })}
                size="sm"
              />
            </div>

            <FilenameSettings
              template={filenameTemplate}
              overwriteMode={overwriteMode}
              onTemplateChange={(v) =>
                setValue('filenameTemplate', v, { shouldValidate: true })
              }
              onOverwriteModeChange={(v) =>
                setValue('overwriteMode', v, { shouldValidate: true })
              }
              size="sm"
            />

            {isCropping && images.length > 0 && (
              <JobProgressBar
                items={images.map((img) => ({ path: img.path, name: img.name }))}
                progress={progress}
                running={isCropping}
                verb="Cropping"
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
                  className="space-y-1.5"
                >
                  <ResultsBanner
                    title="Complete"
                    subtitle={`${successCount}/${results.length} cropped`}
                    size="sm"
                    outputDir={resolveOutputDir({ results, fallbackDir: outputDir })}
                  />
                  <ResultsList results={results} size="sm" maxHeight="max-h-24" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-3 border-t border-border/30 bg-background">
            <ProcessButton
              isProcessing={isCropping}
              disabled={!canCrop}
              onClick={handleCrop}
              icon={Crop}
              label="Crop"
              processingLabel="Cropping..."
              size="sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

CropPage.displayName = 'CropPage';

export { CropPage };
