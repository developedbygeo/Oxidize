import { Minimize2 } from 'lucide-react';
import { ImageDropzone } from '@/components/ImageDropzone';
import { PageHeader } from '@/components/page-parts/PageHeader';
import type { ImageInfo } from '@/types/image';
import { compressionLevelOrder, compressionPresets } from './schema';

type EmptyStateProps = {
  onImagesChange: (images: ImageInfo[]) => void;
};

const EmptyState = ({ onImagesChange }: EmptyStateProps) => (
  <div className="h-full overflow-auto">
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      <PageHeader
        icon={Minimize2}
        title="Compress"
        description="Reduce file sizes while preserving quality"
      />

      <ImageDropzone images={[]} onImagesChange={onImagesChange} />

      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
          Compression presets
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {compressionLevelOrder.map((level) => (
            <div
              key={level}
              className="p-2.5 rounded-md bg-muted/30 border border-border/30 text-center"
            >
              <span className="block text-[10px] font-semibold text-foreground">
                {compressionPresets[level].label}
              </span>
              <span className="block text-[9px] text-muted-foreground mt-0.5 leading-tight">
                {compressionPresets[level].description}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

EmptyState.displayName = 'EmptyState';

export { EmptyState };
