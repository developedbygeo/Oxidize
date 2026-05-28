import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crop, Sparkles } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import {
  videoFormatLabels,
  type VideoFormat,
  type VideoInfo,
  type VideoResizeMode,
  type VideoResult,
} from '@/types/video';
import type { OperationHistoryItem } from '@/types/image';
import {
  defaultFormValues,
  formatFileSize,
  videoOutputFormats,
  videoResizeFormSchema,
  type VideoResizeFormValues,
} from './_components/schema';
import { ResizeModePicker } from './_components/ResizeModePicker';
import { ResolutionPresetPicker } from './_components/ResolutionPresetPicker';
import { CustomDimensions } from './_components/CustomDimensions';
import { runVideoResize } from './_components/useVideoResizeExecution';

type VideoResizePageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const VideoResizePage = ({ onOperationComplete }: VideoResizePageProps) => {
  const form = useForm<VideoResizeFormValues>({
    resolver: zodResolver(videoResizeFormSchema),
    defaultValues: defaultFormValues,
    mode: 'onChange',
  });
  const { control } = form;
  const targetFormat = useWatch({ control, name: 'targetFormat' });
  const mode = useWatch({ control, name: 'mode' });
  const presetHeight = useWatch({ control, name: 'presetHeight' });
  const customWidth = useWatch({ control, name: 'customWidth' });
  const customHeight = useWatch({ control, name: 'customHeight' });
  const maintainAspect = useWatch({ control, name: 'maintainAspect' });
  const crf = useWatch({ control, name: 'crf' });
  const outputDir = useWatch({ control, name: 'outputDir' });

  const [videos, setVideos] = useState<VideoInfo[]>([]);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const progress = useFfmpegProgress(isResizing);

  const handleResize = () =>
    runVideoResize({
      videos,
      values: form.getValues(),
      onStart: () => {
        setIsResizing(true);
        setShowResults(false);
      },
      onFinish: (r) => {
        setIsResizing(false);
        setResults(r);
        setShowResults(true);
      },
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

        <VideoDropzone videos={videos} onVideosChange={setVideos} />

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
                        form.setValue('targetFormat', format as VideoFormat, {
                          shouldValidate: true,
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
                onChange={(m: VideoResizeMode) =>
                  form.setValue('mode', m, { shouldValidate: true })
                }
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
                      onChange={(h) =>
                        form.setValue('presetHeight', h, { shouldValidate: true })
                      }
                      videos={videos}
                    />
                  ) : (
                    <CustomDimensions
                      width={customWidth}
                      height={customHeight}
                      maintainAspect={maintainAspect}
                      onWidthChange={(v) =>
                        form.setValue('customWidth', v, { shouldValidate: true })
                      }
                      onHeightChange={(v) =>
                        form.setValue('customHeight', v, { shouldValidate: true })
                      }
                      onMaintainAspectChange={(v) =>
                        form.setValue('maintainAspect', v, { shouldValidate: true })
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
                    form.setValue('crf', qualityToCrf(values[0]), { shouldValidate: true })
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
                  onChange={(dir) => form.setValue('outputDir', dir, { shouldValidate: true })}
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
