import { motion } from 'motion/react';
import { ArrowRightLeft, Minimize2, Sparkles, Wand2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { fadeIn } from '@/lib/animations';
import { ImageDropzone } from '@/components/ImageDropzone';
import type { ImageInfo } from '@/types/image';

type ImagesStepProps = {
  images: ImageInfo[];
  onImagesChange: (images: ImageInfo[]) => void;
};

const chainableOps: { label: string; description: string; icon: LucideIcon }[] = [
  { label: 'Beautify', description: 'Adjust brightness, color', icon: Sparkles },
  { label: 'Effects', description: 'Apply visual filters', icon: Wand2 },
  { label: 'Convert', description: 'Change file format', icon: ArrowRightLeft },
  { label: 'Compress', description: 'Reduce file size', icon: Minimize2 },
];

const ImagesStep = ({ images, onImagesChange }: ImagesStepProps) => (
  <div className="space-y-4">
    <ImageDropzone images={images} onImagesChange={onImagesChange} />
    {images.length === 0 && (
      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
          Chain operations in order
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {chainableOps.map((op, index) => (
            <div
              key={op.label}
              className="relative p-2.5 rounded-md bg-muted/30 border border-border/30"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono text-muted-foreground/60 tabular-nums">
                  {index + 1}
                </span>
                <op.icon className="w-3 h-3 text-muted-foreground" strokeWidth={1.75} />
                <span className="text-[10px] font-semibold text-foreground">{op.label}</span>
              </div>
              <span className="block text-[9px] text-muted-foreground mt-0.5 leading-tight pl-4">
                {op.description}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}
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
