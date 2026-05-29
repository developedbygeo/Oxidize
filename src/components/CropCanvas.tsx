import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  applyAspect,
  clampRect,
  computeRenderedRect,
  hitCorner,
  toSourceCoords as toSourceCoordsPure,
  type Corner,
  type CropRect,
  type RenderedRect,
} from '@/lib/crop-math';

export type { CropRect };

type CropCanvasProps = {
  imageSrc: string;
  /** Source image width in pixels — used to scale display ↔ source coords. */
  imageWidth: number;
  /** Source image height in pixels. */
  imageHeight: number;
  /** Current selection in source pixel space. */
  rect: CropRect;
  onRectChange: (rect: CropRect) => void;
  /** width/height. When set, resizing locks to this ratio. null = free. */
  aspectRatio?: number | null;
  className?: string;
};

type DragState =
  | { kind: 'none' }
  | { kind: 'new'; origin: { x: number; y: number } }
  | { kind: 'move'; offset: { x: number; y: number } }
  | { kind: 'resize'; corner: Corner };

const CropCanvas = ({
  imageSrc,
  imageWidth,
  imageHeight,
  rect,
  onRectChange,
  aspectRatio,
  className,
}: CropCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<DragState>({ kind: 'none' });

  const [displaySize, setDisplaySize] = useState<RenderedRect>({
    width: 0,
    height: 0,
    offsetX: 0,
    offsetY: 0,
  });

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { width: cw, height: ch } = container.getBoundingClientRect();
    const rendered = computeRenderedRect(cw, ch, imageWidth, imageHeight);
    if (rendered) setDisplaySize(rendered);
  }, [imageWidth, imageHeight]);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  const scale = displaySize.width > 0 ? displaySize.width / imageWidth : 1;

  const toSourceCoords = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return null;
      const box = container.getBoundingClientRect();
      return toSourceCoordsPure(
        clientX - box.left,
        clientY - box.top,
        displaySize,
        imageWidth,
        imageHeight
      );
    },
    [imageWidth, imageHeight, displaySize]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const src = toSourceCoords(e.clientX, e.clientY);
    if (!src) return;

    // Hit-test corners FIRST so they win over the body
    const corner = hitCorner(
      src.x,
      src.y,
      { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
      scale
    );
    if (corner) {
      dragRef.current = { kind: 'resize', corner };
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      return;
    }

    // Inside the body → move
    const insideBody =
      src.x >= rect.x &&
      src.x <= rect.x + rect.width &&
      src.y >= rect.y &&
      src.y <= rect.y + rect.height;

    if (insideBody) {
      dragRef.current = {
        kind: 'move',
        offset: { x: src.x - rect.x, y: src.y - rect.y },
      };
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      return;
    }

    // Empty area → start a new rect
    dragRef.current = { kind: 'new', origin: src };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    onRectChange(clampRect({ x: src.x, y: src.y, width: 0, height: 0 }, imageWidth, imageHeight));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    if (state.kind === 'none') return;
    const src = toSourceCoords(e.clientX, e.clientY);
    if (!src) return;

    if (state.kind === 'new') {
      const x = Math.min(state.origin.x, src.x);
      const y = Math.min(state.origin.y, src.y);
      let width = Math.abs(src.x - state.origin.x);
      let height = Math.abs(src.y - state.origin.y);
      let next: CropRect = { x, y, width, height };
      if (aspectRatio) {
        // Lock to ratio: take the larger axis as the driver
        const widthFromHeight = height * aspectRatio;
        if (width >= widthFromHeight) {
          next = applyAspect(next, aspectRatio, 'width');
        } else {
          next = applyAspect(next, aspectRatio, 'height');
        }
      }
      onRectChange(clampRect(next, imageWidth, imageHeight));
      return;
    }

    if (state.kind === 'move') {
      const nx = src.x - state.offset.x;
      const ny = src.y - state.offset.y;
      onRectChange(
        clampRect({ x: nx, y: ny, width: rect.width, height: rect.height }, imageWidth, imageHeight)
      );
      return;
    }

    if (state.kind === 'resize') {
      // Anchor is the opposite corner — stays fixed during resize.
      const ax = state.corner === 'tl' || state.corner === 'bl' ? rect.x + rect.width : rect.x;
      const ay = state.corner === 'tl' || state.corner === 'tr' ? rect.y + rect.height : rect.y;
      const x = Math.min(ax, src.x);
      const y = Math.min(ay, src.y);
      let width = Math.abs(src.x - ax);
      let height = Math.abs(src.y - ay);
      let next: CropRect = { x, y, width, height };
      if (aspectRatio) {
        const widthFromHeight = height * aspectRatio;
        if (width >= widthFromHeight) {
          next = applyAspect(next, aspectRatio, 'width');
        } else {
          next = applyAspect(next, aspectRatio, 'height');
        }
        // Re-anchor so the opposite corner stays put after ratio adjust
        if (state.corner === 'tl' || state.corner === 'bl') next.x = ax - next.width;
        if (state.corner === 'tl' || state.corner === 'tr') next.y = ay - next.height;
      }
      onRectChange(clampRect(next, imageWidth, imageHeight));
      return;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { kind: 'none' };
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {
      // releasePointerCapture throws if not captured — fine to swallow
    }
  };

  // Render position in CSS pixels relative to the displayed image origin
  const display = {
    x: displaySize.offsetX + rect.x * scale,
    y: displaySize.offsetY + rect.y * scale,
    w: rect.width * scale,
    h: rect.height * scale,
  };

  const hasRect = rect.width > 0 && rect.height > 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full overflow-hidden rounded-lg bg-muted/30 border border-border/40',
        'select-none touch-none cursor-crosshair',
        className
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <img
        ref={imgRef}
        src={imageSrc}
        alt="Crop source"
        onLoad={measure}
        draggable={false}
        className="w-full h-full object-contain pointer-events-none"
      />

      {hasRect && (
        <>
          {/* Dim outside the selection — 4 rects (above/below/left/right). */}
          <div
            className="absolute bg-black/55 pointer-events-none"
            style={{
              left: displaySize.offsetX,
              top: displaySize.offsetY,
              width: displaySize.width,
              height: display.y - displaySize.offsetY,
            }}
          />
          <div
            className="absolute bg-black/55 pointer-events-none"
            style={{
              left: displaySize.offsetX,
              top: display.y + display.h,
              width: displaySize.width,
              height: displaySize.offsetY + displaySize.height - (display.y + display.h),
            }}
          />
          <div
            className="absolute bg-black/55 pointer-events-none"
            style={{
              left: displaySize.offsetX,
              top: display.y,
              width: display.x - displaySize.offsetX,
              height: display.h,
            }}
          />
          <div
            className="absolute bg-black/55 pointer-events-none"
            style={{
              left: display.x + display.w,
              top: display.y,
              width: displaySize.offsetX + displaySize.width - (display.x + display.w),
              height: display.h,
            }}
          />

          {/* Selection border */}
          <div
            className="absolute border-2 border-primary pointer-events-none"
            style={{
              left: display.x,
              top: display.y,
              width: display.w,
              height: display.h,
            }}
          />

          {/* Move-by-body cursor zone (invisible, just for cursor hint) */}
          <div
            className="absolute cursor-move"
            style={{
              left: display.x + 8,
              top: display.y + 8,
              width: Math.max(0, display.w - 16),
              height: Math.max(0, display.h - 16),
            }}
          />

          {/* Corner handles */}
          {(['tl', 'tr', 'bl', 'br'] as const).map((c) => {
            const cx = c === 'tl' || c === 'bl' ? display.x : display.x + display.w;
            const cy = c === 'tl' || c === 'tr' ? display.y : display.y + display.h;
            const cursorMap: Record<Corner, string> = {
              tl: 'cursor-nwse-resize',
              br: 'cursor-nwse-resize',
              tr: 'cursor-nesw-resize',
              bl: 'cursor-nesw-resize',
            };
            return (
              <div
                key={c}
                className={cn(
                  'absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2',
                  'rounded-sm bg-primary border-2 border-background shadow-sm',
                  cursorMap[c]
                )}
                style={{ left: cx, top: cy }}
              />
            );
          })}
        </>
      )}
    </div>
  );
};

CropCanvas.displayName = 'CropCanvas';

export { CropCanvas };
