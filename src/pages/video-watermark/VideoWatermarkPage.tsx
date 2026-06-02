import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Stamp, Sparkles } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn, resolveOutputDir } from '@/lib/utils';
import { fadeUp } from '@/lib/animations';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { usePersistedFormDefaults } from '@/hooks/usePersistedFormDefaults';
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
  PositionGrid,
  WatermarkSliders,
  WatermarkSourcePicker,
} from '@/components/watermark';
import {
  videoFormatLabels,
  type VideoFormat,
  type VideoInfo,
  type VideoResult,
} from '@/types/video';
import type { OperationHistoryItem } from '@/types/image';
import {
  defaultFormValues,
  formatFileSize,
  videoOutputFormats,
  videoWatermarkFormSchema,
  type VideoWatermarkFormValues,
} from './_components/schema';
import { runVideoWatermark } from './_components/useVideoWatermarkExecution';

type VideoWatermarkPageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const VideoWatermarkPage = ({ onOperationComplete }: VideoWatermarkPageProps) => {
  const form = useForm<VideoWatermarkFormValues>({
    resolver: zodResolver(videoWatermarkFormSchema),
    defaultValues: defaultFormValues,
    mode: 'onChange',
  });
  usePersistedFormDefaults({
    page: 'video-watermark',
    form,
    baseDefaults: defaultFormValues,
    persistKeys: [
      'targetFormat',
      'position',
      'opacity',
      'scalePercent',
      'marginPercent',
      'crf',
      'outputDir',
    ],
  });
  const { control } = form;
  const targetFormat = useWatch({ control, name: 'targetFormat' });
  const watermarkPath = useWatch({ control, name: 'watermarkPath' });
  const position = useWatch({ control, name: 'position' });
  const opacity = useWatch({ control, name: 'opacity' });
  const scalePercent = useWatch({ control, name: 'scalePercent' });
  const marginPercent = useWatch({ control, name: 'marginPercent' });
  const crf = useWatch({ control, name: 'crf' });
  const outputDir = useWatch({ control, name: 'outputDir' });

  const [videos, setVideos] = useState<VideoInfo[]>([]);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const progress = useFfmpegProgress(isProcessing);

  const handleWatermark = () =>
    runVideoWatermark({
      videos,
      values: form.getValues(),
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

  const canRun = videos.length > 0 && !!watermarkPath && !isProcessing;
  useKeyboardShortcut('Enter', handleWatermark, { meta: true, enabled: canRun });
  useKeyboardShortcut('Escape', () => invoke('cancel_video_jobs'), { enabled: isProcessing });

  const successCount = results.filter((r) => r.success).length;
  const quality = crfToQuality(crf);

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        <PageHeader
          icon={Stamp}
          title="Video Watermark"
          description="Overlay a logo or mark onto a batch of videos"
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
              <WatermarkSourcePicker
                value={watermarkPath}
                onChange={(path) =>
                  form.setValue('watermarkPath', path, { shouldValidate: true })
                }
              />

              <p className="text-[10px] text-muted-foreground/80 -mt-2">
                Live preview is not available for video. The result lines up with the image
                watermark page — pick a position, then run a short test clip if you're tuning.
              </p>

              <PositionGrid
                value={position}
                onChange={(v) => form.setValue('position', v, { shouldValidate: true })}
              />

              <WatermarkSliders
                opacity={opacity}
                scalePercent={scalePercent}
                marginPercent={marginPercent}
                onOpacityChange={(v) => form.setValue('opacity', v, { shouldValidate: true })}
                onScaleChange={(v) => form.setValue('scalePercent', v, { shouldValidate: true })}
                onMarginChange={(v) => form.setValue('marginPercent', v, { shouldValidate: true })}
              />

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Container
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {videoOutputFormats.map((format) => (
                    <button
                      key={format}
                      type="button"
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
                    <span className="text-[10px] font-mono text-muted-foreground/60">
                      CRF {crf}
                    </span>
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
                isProcessing={isProcessing}
                disabled={!canRun}
                onClick={handleWatermark}
                icon={Sparkles}
                label={
                  !watermarkPath
                    ? 'Choose a watermark image to enable'
                    : `Watermark ${videos.length} video${videos.length !== 1 ? 's' : ''}`
                }
                processingLabel="Watermarking..."
              />
            </motion.div>
          )}
        </AnimatePresence>

        {isProcessing && videos.length > 0 && (
          <JobProgressBar
            items={videos.map((v) => ({ path: v.path, name: v.name }))}
            progress={progress}
            running={isProcessing}
            verb="Watermarking"
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
                subtitle={`${successCount}/${results.length} watermarked`}
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

VideoWatermarkPage.displayName = 'VideoWatermarkPage';

export { VideoWatermarkPage };
