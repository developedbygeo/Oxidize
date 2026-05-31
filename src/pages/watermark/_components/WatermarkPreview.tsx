import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { ImageInfo, WatermarkPosition } from '@/types/image';
import { positionToAnchors } from './schema';

type WatermarkPreviewProps = {
  source: ImageInfo;
  sourceCount: number;
  watermarkPath: string | null;
  position: WatermarkPosition;
  opacity: number;
  scalePercent: number;
  marginPercent: number;
};

/**
 * CSS-overlay approximation of the Rust composite. Both the watermark size and
 * the edge margin are expressed as a percentage of the rendered *width* — the
 * same basis the backend uses — so corners line up. We measure the rendered
 * image width to convert the margin into pixels for the vertical axis (a CSS
 * `%` there would resolve against height and drift).
 */
const WatermarkPreview = ({
  source,
  sourceCount,
  watermarkPath,
  position,
  opacity,
  scalePercent,
  marginPercent,
}: WatermarkPreviewProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { h, v } = positionToAnchors(position);
  const marginPx = (width * marginPercent) / 100;

  const transforms: string[] = [];
  if (h === 'center') transforms.push('translateX(-50%)');
  if (v === 'middle') transforms.push('translateY(-50%)');

  const overlayStyle: CSSProperties = {
    position: 'absolute',
    width: `${scalePercent}%`,
    height: 'auto',
    opacity: opacity / 100,
    transform: transforms.join(' ') || undefined,
    transition: 'all 150ms ease',
    pointerEvents: 'none',
    ...(h === 'left' && { left: marginPx }),
    ...(h === 'right' && { right: marginPx }),
    ...(h === 'center' && { left: '50%' }),
    ...(v === 'top' && { top: marginPx }),
    ...(v === 'bottom' && { bottom: marginPx }),
    ...(v === 'middle' && { top: '50%' }),
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Preview
      </label>
      <div className="flex items-center justify-center rounded-lg border border-border/40 bg-muted/20 p-4 overflow-hidden min-h-64">
        <div ref={wrapperRef} className="relative inline-block leading-none">
          <img
            src={convertFileSrc(source.path)}
            alt={source.name}
            className="block max-h-72 max-w-full object-contain"
          />
          {watermarkPath && (
            <img src={convertFileSrc(watermarkPath)} alt="Watermark" style={overlayStyle} />
          )}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground text-center">
        Showing {source.name}
        {sourceCount > 1 && ` (first of ${sourceCount})`} · approximate preview
      </p>
    </div>
  );
};

WatermarkPreview.displayName = 'WatermarkPreview';

export { WatermarkPreview };
