import { Stamp, Image, SlidersHorizontal, Grid3x3 } from 'lucide-react';
import { ImageDropzone } from '@/components/ImageDropzone';
import { PageHeader } from '@/components/page-parts/PageHeader';
import type { ImageInfo } from '@/types/image';

type EmptyStateProps = {
  onImagesChange: (images: ImageInfo[]) => void;
};

const TEASERS = [
  { icon: Image, label: 'Any logo', hint: 'PNG with transparency works best' },
  { icon: Grid3x3, label: '9 positions', hint: 'Corners, edges, or dead centre' },
  { icon: SlidersHorizontal, label: 'Fine control', hint: 'Opacity, size, and margin' },
];

const EmptyState = ({ onImagesChange }: EmptyStateProps) => (
  <div className="h-full overflow-auto">
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      <PageHeader
        icon={Stamp}
        title="Watermark"
        description="Overlay a logo or mark across a batch of images"
      />

      <ImageDropzone images={[]} onImagesChange={onImagesChange} />

      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
          The same mark scales to fit every source
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {TEASERS.map(({ icon: Icon, label, hint }) => (
            <div
              key={label}
              className="p-2.5 rounded-md bg-muted/30 border border-border/30 text-center space-y-1"
            >
              <Icon className="w-4 h-4 mx-auto text-muted-foreground" strokeWidth={1.75} />
              <span className="block text-[10px] font-semibold text-foreground">{label}</span>
              <span className="block text-[9px] text-muted-foreground leading-tight">{hint}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

EmptyState.displayName = 'EmptyState';

export { EmptyState };
