import { Wand2 } from 'lucide-react';
import { ImageDropzone } from '@/components/ImageDropzone';
import { PageHeader } from '@/components/page-parts/PageHeader';
import { effectsList } from '@/types/image';
import type { ImageInfo } from '@/types/image';

type EmptyStateProps = {
  onImagesChange: (images: ImageInfo[]) => void;
};

const EmptyState = ({ onImagesChange }: EmptyStateProps) => (
  <div className="h-full overflow-auto">
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      <PageHeader icon={Wand2} title="Effects" description="Transform images with visual effects" />

      <ImageDropzone images={[]} onImagesChange={onImagesChange} />

      <div className="grid grid-cols-5 gap-1.5">
        {effectsList.map((effect) => (
          <div
            key={effect.type}
            className="p-2.5 rounded-md bg-muted/30 border border-border/30 text-center"
          >
            <effect.icon
              className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground"
              strokeWidth={1.75}
            />
            <span className="block text-[10px] font-medium text-foreground">{effect.label}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

EmptyState.displayName = 'EmptyState';

export { EmptyState };
