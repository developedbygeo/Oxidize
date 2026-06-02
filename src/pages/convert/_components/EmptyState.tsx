import { ArrowRightLeft } from 'lucide-react';
import { ImageDropzone } from '@/components/ImageDropzone';
import { PageHeader } from '@/components/page-parts/PageHeader';
import { formatDescriptions, formatLabels, type ImageFormat, type ImageInfo } from '@/types/image';

type EmptyStateProps = {
  onImagesChange: (images: ImageInfo[]) => void;
};

const teaserFormats: ImageFormat[] = ['png', 'jpg', 'webp', 'gif', 'bmp', 'tiff'];

const EmptyState = ({ onImagesChange }: EmptyStateProps) => (
  <div className="h-full overflow-auto">
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      <PageHeader
        icon={ArrowRightLeft}
        title="Convert"
        description="Transform images to different formats"
      />

      <ImageDropzone images={[]} onImagesChange={onImagesChange} />

      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
          Supported output formats
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {teaserFormats.map((format) => (
            <div
              key={format}
              className="p-2.5 rounded-md bg-muted/30 border border-border/30 text-center"
            >
              <span className="block text-[10px] font-semibold text-foreground">
                {formatLabels[format]}
              </span>
              <span className="block text-[9px] text-muted-foreground mt-0.5 leading-tight">
                {formatDescriptions[format]}
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
