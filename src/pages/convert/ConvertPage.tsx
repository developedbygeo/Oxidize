import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRightLeft, Sparkles } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fadeUp, expandHeight } from '@/lib/animations';
import { resolveOutputDir } from '@/lib/utils';
import { ImageDropzone } from '@/components/ImageDropzone';
import { PageHeader } from '@/components/page-parts/PageHeader';
import { OutputLocationPicker } from '@/components/page-parts/OutputLocationPicker';
import { ProcessButton } from '@/components/page-parts/ProcessButton';
import { ResultsBanner } from '@/components/page-parts/ResultsBanner';
import { ResultsList } from '@/components/page-parts/ResultsList';
import { SourcePreview } from '@/components/page-parts/SourcePreview';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { usePersistedFormDefaults } from '@/hooks/usePersistedFormDefaults';
import {
  formatLabels,
  type ConversionResult,
  type ImageFormat,
  type ImageInfo,
  type OperationHistoryItem,
} from '@/types/image';
import {
  convertFormSchema,
  defaultFormValues,
  formatFileSize,
  formatsWithQuality,
  type ConvertFormValues,
} from './_components/schema';
import { EmptyState } from './_components/EmptyState';
import { FormatPicker } from './_components/FormatPicker';
import { QualitySlider } from './_components/QualitySlider';
import { runConversion } from './_components/useConvertExecution';

type ConvertPageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const ConvertPage = ({ onOperationComplete }: ConvertPageProps) => {
  const form = useForm<ConvertFormValues>({
    resolver: zodResolver(convertFormSchema),
    defaultValues: defaultFormValues,
    mode: 'onChange',
  });
  usePersistedFormDefaults({
    page: 'convert',
    form,
    baseDefaults: defaultFormValues,
    persistKeys: ['targetFormat', 'quality', 'outputDir'],
  });
  const { control } = form;
  const targetFormat = useWatch({ control, name: 'targetFormat' });
  const quality = useWatch({ control, name: 'quality' });
  const outputDir = useWatch({ control, name: 'outputDir' });

  const [images, setImages] = useState<ImageInfo[]>([]);
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const showQuality = formatsWithQuality.includes(targetFormat);

  const handleConvert = () =>
    runConversion({
      images,
      values: form.getValues(),
      onStart: () => {
        setIsConverting(true);
        setShowResults(false);
      },
      onFinish: (r) => {
        setIsConverting(false);
        setResults(r);
        setShowResults(true);
      },
      onOperationComplete,
    });

  const successCount = results.filter((r) => r.success).length;
  const totalSaved = results.reduce((acc, r) => acc + (r.original_size - r.new_size), 0);

  useKeyboardShortcut('Enter', handleConvert, {
    meta: true,
    enabled: images.length > 0 && !isConverting,
  });

  if (images.length === 0 && !showResults) {
    return <EmptyState onImagesChange={setImages} />;
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        <PageHeader
          icon={ArrowRightLeft}
          title="Convert"
          description="Transform images to different formats"
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

              <FormatPicker
                value={targetFormat}
                onChange={(format: ImageFormat) =>
                  form.setValue('targetFormat', format, { shouldValidate: true })
                }
              />

              {showQuality && (
                <motion.div
                  variants={expandHeight}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <QualitySlider
                    value={quality}
                    onChange={(v) => form.setValue('quality', v, { shouldValidate: true })}
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

              <ProcessButton
                isProcessing={isConverting}
                disabled={images.length === 0}
                onClick={handleConvert}
                icon={Sparkles}
                label={`Convert to ${formatLabels[targetFormat]}`}
                processingLabel="Converting..."
              />
            </motion.div>
          )}
        </AnimatePresence>

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
                subtitle={`${successCount}/${results.length} converted${
                  totalSaved > 0 ? ` · ${formatFileSize(Math.abs(totalSaved))} saved` : ''
                }`}
                outputDir={resolveOutputDir({ results, fallbackDir: outputDir })}
              />
              <ResultsList results={results}>
                {(result) => (
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatFileSize(result.original_size)} → {formatFileSize(result.new_size)}
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

ConvertPage.displayName = 'ConvertPage';

export { ConvertPage };
