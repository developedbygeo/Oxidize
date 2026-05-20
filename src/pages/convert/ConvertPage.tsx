import { useReducer } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRightLeft, Sparkles } from 'lucide-react';
import { fadeUp, expandHeight } from '@/lib/animations';
import { ImageDropzone } from '@/components/ImageDropzone';
import { PageHeader } from '@/components/page-parts/PageHeader';
import { OutputLocationPicker } from '@/components/page-parts/OutputLocationPicker';
import { ProcessButton } from '@/components/page-parts/ProcessButton';
import { ResultsBanner } from '@/components/page-parts/ResultsBanner';
import { ResultsList } from '@/components/page-parts/ResultsList';
import { formatLabels, type OperationHistoryItem } from '@/types/image';
import {
  convertReducer,
  initialState,
  formatFileSize,
  formatsWithQuality,
} from './_components/schema';
import { FormatPicker } from './_components/FormatPicker';
import { QualitySlider } from './_components/QualitySlider';
import { runConversion } from './_components/useConvertExecution';

type ConvertPageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const ConvertPage = ({ onOperationComplete }: ConvertPageProps) => {
  const [state, dispatch] = useReducer(convertReducer, initialState);
  const { images, targetFormat, quality, outputDir, isConverting, results, showResults } = state;

  const showQuality = formatsWithQuality.includes(targetFormat);

  const handleConvert = () =>
    runConversion({
      images,
      targetFormat,
      quality,
      outputDir,
      onStart: () => dispatch({ type: 'START_CONVERTING' }),
      onFinish: (r) => dispatch({ type: 'FINISH_CONVERTING', payload: r }),
      onOperationComplete,
    });

  const successCount = results.filter((r) => r.success).length;
  const totalSaved = results.reduce((acc, r) => acc + (r.original_size - r.new_size), 0);

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        <PageHeader
          icon={ArrowRightLeft}
          title="Convert"
          description="Transform images to different formats"
        />

        <ImageDropzone
          images={images}
          onImagesChange={(imgs) => dispatch({ type: 'SET_IMAGES', payload: imgs })}
        />

        <AnimatePresence>
          {images.length > 0 && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-5"
            >
              <FormatPicker
                value={targetFormat}
                onChange={(format) => dispatch({ type: 'SET_TARGET_FORMAT', payload: format })}
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
                    onChange={(v) => dispatch({ type: 'SET_QUALITY', payload: v })}
                  />
                </motion.div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Output Location
                </label>
                <OutputLocationPicker
                  value={outputDir}
                  onChange={(dir) => dispatch({ type: 'SET_OUTPUT_DIR', payload: dir })}
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
