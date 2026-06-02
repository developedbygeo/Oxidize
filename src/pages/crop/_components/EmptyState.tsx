import { Crop } from 'lucide-react';
import { ImageDropzone } from '@/components/ImageDropzone';
import { PageHeader } from '@/components/page-parts/PageHeader';
import type { ImageInfo } from '@/types/image';
import { aspectRatios } from './schema';

type EmptyStateProps = {
  onImagesChange: (images: ImageInfo[]) => void;
};

const EmptyState = ({ onImagesChange }: EmptyStateProps) => (
  <div className="h-full overflow-auto">
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      <PageHeader
        icon={Crop}
        title="Crop"
        description="Trim images to a specific region or aspect ratio"
      />

      <ImageDropzone images={[]} onImagesChange={onImagesChange} maxImages={1} />

      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
          Aspect ratio presets
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
          {aspectRatios.map((r) => (
            <div
              key={r.id}
              className="p-2.5 rounded-md bg-muted/30 border border-border/30 text-center"
            >
              <span className="block text-[10px] font-semibold text-foreground">{r.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

EmptyState.displayName = 'EmptyState';

export { EmptyState };
