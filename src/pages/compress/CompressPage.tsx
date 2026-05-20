import { useReducer } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Minimize2, Zap, TrendingDown } from 'lucide-react';
import { fadeUp, expandHeight } from '@/lib/animations';
import { ImageDropzone } from '@/components/ImageDropzone';
import { PageHeader } from '@/components/page-parts/PageHeader';
import { OutputLocationPicker } from '@/components/page-parts/OutputLocationPicker';
import { ProcessButton } from '@/components/page-parts/ProcessButton';
import { ResultsBanner } from '@/components/page-parts/ResultsBanner';
import { ResultsList } from '@/components/page-parts/ResultsList';
import type { OperationHistoryItem } from '@/types/image';
import {
  compressReducer,
  initialState,
  formatFileSize,
  resolveQuality,
} from './_components/schema';
import { LevelPicker } from './_components/LevelPicker';
import { CustomQualityControl } from './_components/CustomQualityControl';
import { runCompression } from './_components/useCompressExecution';

type CompressPageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const CompressPage = ({ onOperationComplete }: CompressPageProps) => {
  const [state, dispatch] = useReducer(compressReducer, initialState);
  const {
    images,
    compressionLevel,
    customQuality,
    useCustom,
    outputDir,
    isCompressing,
    results,
    showResults,
  } = state;

  const handleCompress = () =>
    runCompression({
      images,
      quality: resolveQuality({ compressionLevel, customQuality, useCustom }),
      outputDir,
      compressionLevel,
      useCustom,
      customQuality,
      onStart: () => dispatch({ type: 'START_COMPRESSING' }),
      onFinish: (r) => dispatch({ type: 'FINISH_COMPRESSING', payload: r }),
      onOperationComplete,
    });

  const successCount = results.filter((r) => r.success).length;
  const totalOriginal = results.reduce((acc, r) => acc + r.original_size, 0);
  const totalNew = results.reduce((acc, r) => acc + r.new_size, 0);
  const totalSaved = totalOriginal - totalNew;
  const avgSavings =
    results.length > 0 ? results.reduce((acc, r) => acc + r.savings_percent, 0) / results.length : 0;

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        <PageHeader
          icon={Minimize2}
          title="Compress"
          description="Reduce file sizes while preserving quality"
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
              <LevelPicker
                value={compressionLevel}
                useCustom={useCustom}
                onChange={(level) => dispatch({ type: 'SET_COMPRESSION_LEVEL', payload: level })}
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
                    onValueChange={(v) => dispatch({ type: 'SET_CUSTOM_QUALITY', payload: v })}
                    onToggleCustom={(use) => dispatch({ type: 'SET_USE_CUSTOM', payload: use })}
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

        <AnimatePresence>
          {showResults && results.length > 0 && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-3"
            >
              <ResultsBanner title="Complete" subtitle={`${successCount}/${results.length} compressed`}>
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
