import { useReducer } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crop, Sparkles } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { cn } from '@/lib/utils';
import { fadeUp, expandHeight } from '@/lib/animations';
import { PageHeader } from '@/components/page-parts/PageHeader';
import { OutputLocationPicker } from '@/components/page-parts/OutputLocationPicker';
import { ProcessButton } from '@/components/page-parts/ProcessButton';
import { ResultsBanner } from '@/components/page-parts/ResultsBanner';
import { ResultsList } from '@/components/page-parts/ResultsList';
import { JobProgressBar } from '@/components/page-parts/JobProgressBar';
import { VideoDropzone } from '@/components/VideoDropzone';
import { useFfmpegProgress } from '@/hooks/useFfmpegProgress';
import { Slider } from '@/components/ui/slider';
import { crfToQuality, qualityToCrf } from '@/lib/video-quality';
import { videoFormatLabels, type VideoFormat } from '@/types/video';
import type { OperationHistoryItem } from '@/types/image';
import {
  initialState,
  videoResizeReducer,
  videoOutputFormats,
  formatFileSize,
} from './_components/schema';
import { ResizeModePicker } from './_components/ResizeModePicker';
import { ResolutionPresetPicker } from './_components/ResolutionPresetPicker';
import { CustomDimensions } from './_components/CustomDimensions';
import { runVideoResize } from './_components/useVideoResizeExecution';

type VideoResizePageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const VideoResizePage = ({ onOperationComplete }: VideoResizePageProps) => {
  const [state, dispatch] = useReducer(videoResizeReducer, initialState);
  const {
    videos,
    targetFormat,
    mode,
    presetHeight,
    customWidth,
    customHeight,
    maintainAspect,
    crf,
    outputDir,
    isResizing,
    results,
    showResults,
  } = state;

  const progress = useFfmpegProgress(isResizing);

  const handleResize = () =>
    runVideoResize({
      videos,
      targetFormat,
      mode,
      presetHeight,
      customWidth,
      customHeight,
      maintainAspect,
      crf,
      outputDir,
      onStart: () => dispatch({ type: 'START_RESIZING' }),
      onFinish: (r) => dispatch({ type: 'FINISH_RESIZING', payload: r }),
      onOperationComplete,
    });

  const successCount = results.filter((r) => r.success).length;
  const quality = crfToQuality(crf);

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        <PageHeader
          icon={Crop}
          title="Video Resize"
          description="Change video dimensions or scale to a target resolution"
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
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Container
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {videoOutputFormats.map((format) => (
                    <button
                      key={format}
                      onClick={() =>
                        dispatch({
                          type: 'SET_TARGET_FORMAT',
                          payload: format as VideoFormat,
                        })
                      }
                      className={cn(
                        'px-3 py-2 rounded-md text-xs font-medium transition-colors',
                        targetFormat === format
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {videoFormatLabels[format]}
                    </button>
                  ))}
                </div>
              </div>

              <ResizeModePicker
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
                  {mode === 'presetheight' ? (
                    <ResolutionPresetPicker
                      value={presetHeight}
                      onChange={(h) => dispatch({ type: 'SET_PRESET_HEIGHT', payload: h })}
                      videos={videos}
                    />
                  ) : (
                    <CustomDimensions
                      width={customWidth}
                      height={customHeight}
                      maintainAspect={maintainAspect}
                      onWidthChange={(v) => dispatch({ type: 'SET_CUSTOM_WIDTH', payload: v })}
                      onHeightChange={(v) => dispatch({ type: 'SET_CUSTOM_HEIGHT', payload: v })}
                      onMaintainAspectChange={(v) =>
                        dispatch({ type: 'SET_MAINTAIN_ASPECT', payload: v })
                      }
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Re-encode quality
                  </label>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        'text-xs font-mono tabular-nums',
                        quality >= 60
                          ? 'text-primary'
                          : quality <= 40
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      )}
                    >
                      {quality}%
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/60">CRF {crf}</span>
                  </div>
                </div>
                <Slider
                  value={[quality]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(values) =>
                    dispatch({ type: 'SET_CRF', payload: qualityToCrf(values[0]) })
                  }
                  className="**:data-[slot=slider-range]:bg-primary **:data-[slot=slider-thumb]:border-primary"
                />
              </div>

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
                isProcessing={isResizing}
                disabled={videos.length === 0}
                onClick={handleResize}
                icon={Sparkles}
                label={`Resize ${videos.length} video${videos.length !== 1 ? 's' : ''}`}
                processingLabel="Resizing..."
              />
            </motion.div>
          )}
        </AnimatePresence>

        {isResizing && videos.length > 0 && (
          <JobProgressBar
            items={videos.map((v) => ({ path: v.path, name: v.name }))}
            progress={progress}
            running={isResizing}
            verb="Resizing"
            itemName="video"
            onCancel={() => invoke('cancel_video_jobs')}
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

VideoResizePage.displayName = 'VideoResizePage';

export { VideoResizePage };
