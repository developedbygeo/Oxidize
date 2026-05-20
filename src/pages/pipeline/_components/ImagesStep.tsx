import { motion } from 'motion/react';
import { fadeIn } from '@/lib/animations';
import { ImageDropzone } from '@/components/ImageDropzone';
import type { ImageInfo } from '@/types/image';

type ImagesStepProps = {
  images: ImageInfo[];
  onImagesChange: (images: ImageInfo[]) => void;
};

const ImagesStep = ({ images, onImagesChange }: ImagesStepProps) => (
  <div className="space-y-4">
    <ImageDropzone images={images} onImagesChange={onImagesChange} />
    {images.length > 0 && (
      <motion.p
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="text-sm text-muted-foreground text-center"
      >
        {images.length} image{images.length !== 1 ? 's' : ''} selected
      </motion.p>
    )}
  </div>
);

ImagesStep.displayName = 'ImagesStep';

export { ImagesStep };
