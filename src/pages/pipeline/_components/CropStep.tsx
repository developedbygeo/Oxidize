import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { RotateCcw } from 'lucide-react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { expandHeight, fadeUp } from '@/lib/animations';
import { Button } from '@/components/ui/button';
import { CropCanvas, type CropRect } from '@/components/CropCanvas';
import { PreviewNavigation } from '@/components/PreviewNavigation';
import { AspectRatioPicker } from '@/pages/crop/_components/AspectRatioPicker';
import { getRatioById, type AspectRatioId } from '@/pages/crop/_components/schema';
import type { ImageInfo } from '@/types/image';
import { EnableSwitch } from './EnableSwitch';
import type { PipelineFormValues } from './schema';

type CropStepProps = {
  form: UseFormReturn<PipelineFormValues>;
  images: ImageInfo[];
  previewIndex: number;
  onPrevImage: () => void;
  onNextImage: () => void;
};

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

const CropStep = ({ form, images, previewIndex, onPrevImage, onNextImage }: CropStepProps) => {
  const { control, setValue } = form;
  const enabled = useWatch({ control, name: 'cropEnabled' });
  const rect: CropRect = {
    x: useWatch({ control, name: 'cropX' }),
    y: useWatch({ control, name: 'cropY' }),
    width: useWatch({ control, name: 'cropWidth' }),
    height: useWatch({ control, name: 'cropHeight' }),
  };
  const aspectRatioId = useWatch({ control, name: 'cropAspectRatio' });

  const previewImage = images[previewIndex] ?? images[0];

  // Seed an 80%-centered rect the first time the user enables crop with images
  // loaded. This is keyed on the preview image so re-enabling after switching
  // images doesn't silently reuse an out-of-bounds rect.
  useEffect(() => {
    if (!enabled || !previewImage) return;
    if (rect.width > 0 && rect.height > 0) return;
    const seed = defaultRectFor(previewImage);
    setValue('cropX', seed.x);
    setValue('cropY', seed.y);
    setValue('cropWidth', seed.width);
    setValue('cropHeight', seed.height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, previewImage?.path]);

  const handleRectChange = (next: CropRect) => {
    setValue('cropX', Math.round(next.x), { shouldValidate: true });
    setValue('cropY', Math.round(next.y), { shouldValidate: true });
    setValue('cropWidth', Math.round(next.width), { shouldValidate: true });
    setValue('cropHeight', Math.round(next.height), { shouldValidate: true });
  };

  const handleAspectChange = (id: AspectRatioId) => {
    setValue('cropAspectRatio', id, { shouldValidate: true });
    const ratio = getRatioById(id);
    if (ratio && rect.width > 0 && previewImage) {
      const newHeight = Math.min(rect.width / ratio, previewImage.height - rect.y);
      setValue('cropHeight', Math.round(newHeight), { shouldValidate: true });
    }
  };

  const handleResetRect = () => {
    if (!previewImage) return;
    const seed = defaultRectFor(previewImage);
    setValue('cropX', seed.x);
    setValue('cropY', seed.y);
    setValue('cropWidth', seed.width);
    setValue('cropHeight', seed.height);
  };

  return (
    <div className="space-y-6">
      <EnableSwitch
        control={control}
        name="cropEnabled"
        label="Enable Crop"
        description="Trim a region — applied to every image in the batch"
      />

      <AnimatePresence>
        {enabled && previewImage && (
          <motion.div
            variants={expandHeight}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-4"
          >
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <AspectRatioPicker value={aspectRatioId} onChange={handleAspectChange} />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetRect}
                className="h-8 gap-1.5 text-xs shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </Button>
            </div>

            <motion.div variants={fadeUp} initial="hidden" animate="visible">
              <PreviewNavigation
                currentIndex={previewIndex}
                total={images.length}
                onPrev={onPrevImage}
                onNext={onNextImage}
              >
                <div className="h-75">
                  <CropCanvas
                    imageSrc={convertFileSrc(previewImage.path)}
                    imageWidth={previewImage.width}
                    imageHeight={previewImage.height}
                    rect={rect}
                    onRectChange={handleRectChange}
                    aspectRatio={getRatioById(aspectRatioId)}
                  />
                </div>
              </PreviewNavigation>
            </motion.div>

            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono tabular-nums">
              <span>Source: {previewImage.width} × {previewImage.height}</span>
              <span>
                Crop: {rect.x}, {rect.y} · {rect.width} × {rect.height}
              </span>
            </div>

            {images.length > 1 && (
              <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                The same pixel rectangle is applied to every image. Images smaller than the rect
                are left untouched.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

CropStep.displayName = 'CropStep';

export { CropStep };
