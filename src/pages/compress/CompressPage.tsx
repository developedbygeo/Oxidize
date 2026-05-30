import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Minimize2, Zap, TrendingDown } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fadeUp, expandHeight } from '@/lib/animations';
import { resolveOutputDir } from '@/lib/utils';
import { ImageDropzone } from '@/components/ImageDropzone';
import { PageHeader } from '@/components/page-parts/PageHeader';
import { OutputLocationPicker } from '@/components/page-parts/OutputLocationPicker';
import { FilenameSettings } from '@/components/page-parts/FilenameSettings';
import { Switch } from '@/components/ui/switch';
import { ProcessButton } from '@/components/page-parts/ProcessButton';
import { ResultsBanner } from '@/components/page-parts/ResultsBanner';
import { ResultsList } from '@/components/page-parts/ResultsList';
import { SourcePreview } from '@/components/page-parts/SourcePreview';
import { JobProgressBar } from '@/components/page-parts/JobProgressBar';
import { useImageProgress } from '@/hooks/useImageProgress';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { useClipboardImagePaste } from '@/hooks/useClipboardImagePaste';
import { usePersistedFormDefaults } from '@/hooks/usePersistedFormDefaults';
import type { CompressionResult, ImageInfo, OperationHistoryItem } from '@/types/image';
import {
  compressFormSchema,
  defaultFormValues,
  formatFileSize,
  type CompressFormValues,
  type CompressionLevel,
} from './_components/schema';
import { EmptyState } from './_components/EmptyState';
import { LevelPicker } from './_components/LevelPicker';
import { CustomQualityControl } from './_components/CustomQualityControl';
import { runCompression } from './_components/useCompressExecution';

type CompressPageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const CompressPage = ({ onOperationComplete }: CompressPageProps) => {
  const form = useForm<CompressFormValues>({
    resolver: zodResolver(compressFormSchema),
    defaultValues: defaultFormValues,
    mode: 'onChange',
  });
  usePersistedFormDefaults({
    page: 'compress',
    form,
    baseDefaults: defaultFormValues,
    persistKeys: [
      'compressionLevel',
      'customQuality',
      'useCustom',
      'outputDir',
      'filenameTemplate',
      'overwriteMode',
      'preserveMetadata',
    ],
  });
  const { control } = form;
  const compressionLevel = useWatch({ control, name: 'compressionLevel' });
  const customQuality = useWatch({ control, name: 'customQuality' });
  const useCustom = useWatch({ control, name: 'useCustom' });
  const outputDir = useWatch({ control, name: 'outputDir' });
  const filenameTemplate = useWatch({ control, name: 'filenameTemplate' });
  const overwriteMode = useWatch({ control, name: 'overwriteMode' });
  const preserveMetadata = useWatch({ control, name: 'preserveMetadata' });

  const [images, setImages] = useState<ImageInfo[]>([]);
  const [results, setResults] = useState<CompressionResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  const progress = useImageProgress(isCompressing);

  useClipboardImagePaste({
    onImagesAdded: (added) => setImages((prev) => [...prev, ...added]),
    enabled: !isCompressing,
  });

  const handleCompress = () =>
    runCompression({
      images,
      values: form.getValues(),
      onStart: () => {
        setIsCompressing(true);
        setShowResults(false);
      },
      onFinish: (r) => {
        setIsCompressing(false);
        setResults(r);
        setShowResults(true);
      },
      onOperationComplete,
    });

  const successCount = results.filter((r) => r.success).length;
  const totalOriginal = results.reduce((acc, r) => acc + r.original_size, 0);
  const totalNew = results.reduce((acc, r) => acc + r.new_size, 0);
  const totalSaved = totalOriginal - totalNew;
  const avgSavings =
    results.length > 0 ? results.reduce((acc, r) => acc + r.savings_percent, 0) / results.length : 0;

  useKeyboardShortcut('Enter', handleCompress, {
    meta: true,
    enabled: images.length > 0 && !isCompressing,
  });
  useKeyboardShortcut('Escape', () => invoke('cancel_image_jobs'), { enabled: isCompressing });

  if (images.length === 0 && !showResults) {
    return <EmptyState onImagesChange={setImages} />;
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        <PageHeader
          icon={Minimize2}
          title="Compress"
          description="Reduce file sizes while preserving quality"
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

              <LevelPicker
                value={compressionLevel}
                useCustom={useCustom}
                onChange={(level: CompressionLevel) => {
                  // Picking a preset implicitly turns off the custom slider —
                  // mirrors what the old reducer did.
                  form.setValue('compressionLevel', level, { shouldValidate: true });
                  form.setValue('useCustom', false, { shouldValidate: true });
                }}
              />

              {compressionLevel !== 'lossless' && (
                <motion.div
                  variants={expandHeight}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <CustomQualityControl
                    value={customQuality}
                    useCustom={useCustom}
                    onValueChange={(v) => {
                      form.setValue('customQuality', v, { shouldValidate: true });
                      form.setValue('useCustom', true, { shouldValidate: true });
                    }}
                    onToggleCustom={(use) =>
                      form.setValue('useCustom', use, { shouldValidate: true })
                    }
                  />
                </motion.div>
              )}

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

              <label className="flex items-start gap-3 py-2 cursor-pointer">
                <Switch
                  checked={preserveMetadata}
                  onCheckedChange={(v) =>
                    form.setValue('preserveMetadata', v, { shouldValidate: true })
                  }
                  className="mt-0.5 shrink-0"
                />
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs font-medium text-foreground">
                    Preserve EXIF + color profile
                  </span>
                  <p className="text-[10px] text-muted-foreground/80 leading-tight">
                    Carries camera / lens / ICC metadata from the source. Effective for
                    JPEG output and lossless PNG; other formats strip regardless.
                  </p>
                </div>
              </label>

              <ProcessButton
                isProcessing={isCompressing}
                disabled={images.length === 0}
                onClick={handleCompress}
                icon={Zap}
                label={`Compress ${images.length} image${images.length !== 1 ? 's' : ''}`}
                processingLabel="Compressing..."
              />
            </motion.div>
          )}
        </AnimatePresence>

        {isCompressing && images.length > 0 && (
          <JobProgressBar
            items={images.map((img) => ({ path: img.path, name: img.name }))}
            progress={progress}
            running={isCompressing}
            verb="Compressing"
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
                subtitle={`${successCount}/${results.length} compressed`}
                outputDir={resolveOutputDir({ results, fallbackDir: outputDir })}
              >
                {totalSaved > 0 && (
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-primary text-xs font-medium">
                      <TrendingDown className="w-3 h-3" />
                      <span>{avgSavings.toFixed(1)}%</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {formatFileSize(totalSaved)} saved
                    </p>
                  </div>
                )}
              </ResultsBanner>
              <ResultsList results={results}>
                {(result) => (
                  <>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatFileSize(result.original_size)} → {formatFileSize(result.new_size)}
                    </span>
                    <span
                      className={
                        result.savings_percent > 0
                          ? 'text-[10px] font-medium whitespace-nowrap text-primary'
                          : 'text-[10px] font-medium whitespace-nowrap text-muted-foreground'
                      }
                    >
                      {result.savings_percent > 0 ? `-${result.savings_percent.toFixed(1)}%` : '0%'}
                    </span>
                  </>
                )}
              </ResultsList>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

CompressPage.displayName = 'CompressPage';

export { CompressPage };
