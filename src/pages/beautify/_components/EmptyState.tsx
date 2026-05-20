import { Sparkles } from 'lucide-react';
import { ImageDropzone } from '@/components/ImageDropzone';
import { PageHeader } from '@/components/page-parts/PageHeader';
import type { ImageInfo } from '@/types/image';

type EmptyStateProps = {
  onImagesChange: (images: ImageInfo[]) => void;
};

const EmptyState = ({ onImagesChange }: EmptyStateProps) => (
  <div className="h-full overflow-auto">
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      <PageHeader
        icon={Sparkles}
        title="Beautify"
        description="Enhance images with adjustments and color correction"
      />
      <ImageDropzone images={[]} onImagesChange={onImagesChange} />
    </div>
  </div>
);

EmptyState.displayName = 'EmptyState';

export { EmptyState };
