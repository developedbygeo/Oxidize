import { useReducer } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Film, Zap } from 'lucide-react';
import { fadeUp, expandHeight } from '@/lib/animations';
import { PageHeader } from '@/components/page-parts/PageHeader';
import { OutputLocationPicker } from '@/components/page-parts/OutputLocationPicker';
import { ProcessButton } from '@/components/page-parts/ProcessButton';
import { ResultsBanner } from '@/components/page-parts/ResultsBanner';
import { ResultsList } from '@/components/page-parts/ResultsList';
import { VideoProgressList } from '@/components/page-parts/VideoProgressList';
import { VideoDropzone } from '@/components/VideoDropzone';
import { useFfmpegProgress } from '@/hooks/useFfmpegProgress';
import type { OperationHistoryItem } from '@/types/image';
import {
  initialState,
  videoCompressReducer,
  formatFileSize,
} from './_components/schema';
import { FormatPicker } from './_components/FormatPicker';
import { QualityModePicker } from './_components/QualityModePicker';
import { CrfControl } from './_components/CrfControl';
import { BitrateControl } from './_components/BitrateControl';
import { PresetPicker } from './_components/PresetPicker';
import { runVideoCompress } from './_components/useVideoCompressExecution';

type VideoCompressPageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const VideoCompressPage = ({ onOperationComplete }: VideoCompressPageProps) => {
  const [state, dispatch] = useReducer(videoCompressReducer, initialState);
  const {
    videos,
    targetFormat,
    mode,
    crf,
    bitrateKbps,
    preset,
    outputDir,
    isCompressing,
    results,
    showResults,
  } = state;

  const progress = useFfmpegProgress(isCompressing);

  const handleCompress = () =>
    runVideoCompress({
      videos,
      targetFormat,
      mode,
      crf,
      bitrateKbps,
      preset,
      outputDir,
      onStart: () => dispatch({ type: 'START_COMPRESSING' }),
      onFinish: (r) => dispatch({ type: 'FINISH_COMPRESSING', payload: r }),
      onOperationComplete,
    });

  const successCount = results.filter((r) => r.success).length;
  const totalOriginal = results.reduce((acc, r) => acc + r.original_size, 0);
  const totalNew = results.reduce((acc, r) => acc + r.new_size, 0);
  const totalSaved = Math.max(0, totalOriginal - totalNew);

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        <PageHeader
          icon={Film}
          title="Video Compress"
          description="Shrink video files with CRF or a target bitrate"
        />

        <VideoDropzone
          videos={videos}
          onVideosChange={(v) => dispatch({ type: 'SET_VIDEOS', payload: v })}
        />

        <AnimatePresence>
          {videos.length > 0 && (
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

              <QualityModePicker
                value={mode}
                onChange={(m) => dispatch({ type: 'SET_MODE', payload: m })}
              />

              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  variants={expandHeight}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {mode === 'crf' ? (
                    <CrfControl
                      value={crf}
                      onChange={(v) => dispatch({ type: 'SET_CRF', payload: v })}
                    />
                  ) : (
                    <BitrateControl
                      value={bitrateKbps}
                      onChange={(v) => dispatch({ type: 'SET_BITRATE', payload: v })}
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              <PresetPicker
                value={preset}
                onChange={(p) => dispatch({ type: 'SET_PRESET', payload: p })}
              />

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
                disabled={videos.length === 0}
                onClick={handleCompress}
                icon={Zap}
                label={`Compress ${videos.length} video${videos.length !== 1 ? 's' : ''}`}
                processingLabel="Compressing..."
              />
            </motion.div>
          )}
        </AnimatePresence>

        {isCompressing && videos.length > 0 && (
          <VideoProgressList videos={videos} progress={progress} />
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
                subtitle={`${successCount}/${results.length} compressed${
                  totalSaved > 0 ? ` · ${formatFileSize(totalSaved)} saved` : ''
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

VideoCompressPage.displayName = 'VideoCompressPage';

export { VideoCompressPage };
