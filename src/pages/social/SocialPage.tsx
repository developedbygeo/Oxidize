import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, Sparkles } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fadeUp } from '@/lib/animations';
import { ImageDropzone } from '@/components/ImageDropzone';
import { VideoDropzone } from '@/components/VideoDropzone';
import { PageHeader } from '@/components/page-parts/PageHeader';
import { OutputLocationPicker } from '@/components/page-parts/OutputLocationPicker';
import { FilenameSettings } from '@/components/page-parts/FilenameSettings';
import { ProcessButton } from '@/components/page-parts/ProcessButton';
import { JobProgressBar } from '@/components/page-parts/JobProgressBar';
import { useImageProgress } from '@/hooks/useImageProgress';
import { useFfmpegProgress } from '@/hooks/useFfmpegProgress';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { useClipboardImagePaste } from '@/hooks/useClipboardImagePaste';
import { usePersistedFormDefaults } from '@/hooks/usePersistedFormDefaults';
import {
  PLATFORM_LABELS,
  SOCIAL_PRESETS,
  presetById,
  type PresetMediaType,
  type PresetPlatform,
} from '@/lib/social-presets';
import type { ImageInfo, OperationHistoryItem } from '@/types/image';
import type { VideoInfo } from '@/types/video';
import { defaultFormValues, socialFormSchema, type SocialFormValues } from './_components/schema';
import { PlatformChips } from './_components/PlatformChips';
import { MediaTypeChips } from './_components/MediaTypeChips';
import { PresetGrid } from './_components/PresetGrid';
import { runSocialPreset } from './_components/useSocialExecution';

type SocialPageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

type PlatformFilter = PresetPlatform | 'all';
type MediaFilter = PresetMediaType | 'all';

const SocialPage = ({ onOperationComplete }: SocialPageProps) => {
  const form = useForm<SocialFormValues>({
    resolver: zodResolver(socialFormSchema),
    defaultValues: defaultFormValues,
    mode: 'onChange',
  });
  usePersistedFormDefaults({
    page: 'social',
    form,
    baseDefaults: defaultFormValues,
    persistKeys: ['selectedPresetId', 'outputDir', 'filenameTemplate', 'overwriteMode'],
  });
  const { control } = form;
  const selectedPresetId = useWatch({ control, name: 'selectedPresetId' });
  const outputDir = useWatch({ control, name: 'outputDir' });
  const filenameTemplate = useWatch({ control, name: 'filenameTemplate' });
  const overwriteMode = useWatch({ control, name: 'overwriteMode' });

  // Filter chips. Not in the form because they're transient navigation —
  // they don't need to round-trip through React Hook Form or persistence.
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');

  const [images, setImages] = useState<ImageInfo[]>([]);
  const [videos, setVideos] = useState<VideoInfo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const imageProgress = useImageProgress(isProcessing);
  const videoProgress = useFfmpegProgress(isProcessing);

  const selectedPreset = useMemo(
    () => (selectedPresetId ? presetById(selectedPresetId) ?? null : null),
    [selectedPresetId]
  );

  const filtered = useMemo(
    () =>
      SOCIAL_PRESETS.filter(
        (p) =>
          (platformFilter === 'all' || p.platform === platformFilter) &&
          (mediaFilter === 'all' || p.mediaType === mediaFilter)
      ),
    [platformFilter, mediaFilter]
  );

  useClipboardImagePaste({
    onImagesAdded: (added) => setImages((prev) => [...prev, ...added]),
    enabled: !isProcessing,
  });

  const needsImages = selectedPreset?.mediaType === 'image';
  const needsVideos = selectedPreset?.mediaType === 'video';
  const fileCount = needsImages ? images.length : needsVideos ? videos.length : 0;
  const canRun = selectedPreset !== null && fileCount > 0 && !isProcessing;

  const handleRun = () => {
    if (!selectedPreset) return;
    runSocialPreset({
      preset: selectedPreset,
      images,
      videos,
      fields: { outputDir, filenameTemplate, overwriteMode },
      onStart: () => setIsProcessing(true),
      onFinish: () => setIsProcessing(false),
      onOperationComplete,
    });
  };

  useKeyboardShortcut('Enter', handleRun, { meta: true, enabled: canRun });
  useKeyboardShortcut(
    'Escape',
    () =>
      needsVideos
        ? invoke('cancel_video_jobs')
        : invoke('cancel_image_jobs'),
    { enabled: isProcessing }
  );

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        <PageHeader
          icon={Share2}
          title="Social presets"
          description="One-click correct dimensions for the platforms you actually post to"
        />

        <PlatformChips value={platformFilter} onChange={setPlatformFilter} />
        <MediaTypeChips value={mediaFilter} onChange={setMediaFilter} />
        <PresetGrid
          presets={filtered}
          selectedId={selectedPresetId}
          onSelect={(preset) =>
            form.setValue('selectedPresetId', preset.id, { shouldValidate: true })
          }
        />

        <AnimatePresence>
          {selectedPreset && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-5"
            >
              <div className="rounded-md border border-border/40 bg-muted/10 px-3 py-2.5 text-[11px] text-muted-foreground">
                Selected: <span className="text-foreground font-medium">
                  {PLATFORM_LABELS[selectedPreset.platform]} · {selectedPreset.name}
                </span>
                {' '}({selectedPreset.width}×{selectedPreset.height})
                {selectedPreset.mediaType === 'video' && (
                  <p className="mt-1 text-[10px] text-amber-500/80">
                    Heads-up: video is stretched to the target dimensions today. Crop landscape
                    sources via the Trim page first if your source aspect doesn't match.
                  </p>
                )}
              </div>

              {needsImages ? (
                <ImageDropzone images={images} onImagesChange={setImages} />
              ) : (
                <VideoDropzone videos={videos} onVideosChange={setVideos} />
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Output Location
                </label>
                <OutputLocationPicker
                  value={outputDir}
                  onChange={(dir) =>
                    form.setValue('outputDir', dir, { shouldValidate: true })
                  }
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
                onClick={handleRun}
                icon={Sparkles}
                label={
                  fileCount === 0
                    ? `Drop ${needsImages ? 'images' : 'videos'} to enable`
                    : `Apply to ${fileCount} ${needsImages ? 'image' : 'video'}${fileCount !== 1 ? 's' : ''}`
                }
                processingLabel="Processing..."
              />
            </motion.div>
          )}
        </AnimatePresence>

        {isProcessing && needsImages && images.length > 0 && (
          <JobProgressBar
            items={images.map((img) => ({ path: img.path, name: img.name }))}
            progress={imageProgress}
            running={isProcessing}
            verb="Resizing"
            itemName="image"
            onCancel={() => invoke('cancel_image_jobs')}
          />
        )}
        {isProcessing && needsVideos && videos.length > 0 && (
          <JobProgressBar
            items={videos.map((v) => ({ path: v.path, name: v.name }))}
            progress={videoProgress}
            running={isProcessing}
            verb="Resizing"
            itemName="video"
            onCancel={() => invoke('cancel_video_jobs')}
          />
        )}
      </div>
    </div>
  );
};

SocialPage.displayName = 'SocialPage';

export { SocialPage };
