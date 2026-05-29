import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type CropRect = { x: number; y: number; width: number; height: number };

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

type Corner = 'tl' | 'tr' | 'bl' | 'br';

type DragState =
  | { kind: 'none' }
  | { kind: 'new'; origin: { x: number; y: number } }
  | { kind: 'move'; offset: { x: number; y: number } }
  | { kind: 'resize'; corner: Corner };

const MIN_SIZE = 8;
const HANDLE_HIT_PX = 14;

const clampRect = (r: CropRect, w: number, h: number): CropRect => {
  const width = Math.max(MIN_SIZE, Math.min(r.width, w));
  const height = Math.max(MIN_SIZE, Math.min(r.height, h));
  const x = Math.max(0, Math.min(r.x, w - width));
  const y = Math.max(0, Math.min(r.y, h - height));
  return { x, y, width, height };
};

const applyAspect = (
  r: CropRect,
  ratio: number,
  driver: 'width' | 'height'
): CropRect => {
  if (driver === 'width') return { ...r, height: r.width / ratio };
  return { ...r, width: r.height * ratio };
};

const hitCorner = (
  px: number,
  py: number,
  displayRect: { x: number; y: number; w: number; h: number },
  scale: number
): Corner | null => {
  const handlePx = HANDLE_HIT_PX / scale;
  const corners: { c: Corner; cx: number; cy: number }[] = [
    { c: 'tl', cx: displayRect.x, cy: displayRect.y },
    { c: 'tr', cx: displayRect.x + displayRect.w, cy: displayRect.y },
    { c: 'bl', cx: displayRect.x, cy: displayRect.y + displayRect.h },
    { c: 'br', cx: displayRect.x + displayRect.w, cy: displayRect.y + displayRect.h },
  ];
  for (const { c, cx, cy } of corners) {
    if (Math.abs(px - cx) < handlePx && Math.abs(py - cy) < handlePx) return c;
  }
  return null;
};

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

  // Measure the *rendered* image rect, not the IMG element box. With
  // `object-contain`, the IMG element fills its container but the actual
  // image is letterboxed inside it — we have to compute the letterbox
  // offsets from the source aspect ratio or pointer coords end up scaled
  // to the wrong rectangle (output ends up more cropped than the user marked).
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 });

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container || imageWidth === 0 || imageHeight === 0) return;
    const { width: cw, height: ch } = container.getBoundingClientRect();
    if (cw === 0 || ch === 0) return;
    const sourceAspect = imageWidth / imageHeight;
    const containerAspect = cw / ch;
    let renderedW: number;
    let renderedH: number;
    if (containerAspect > sourceAspect) {
      // Container wider than source — image is height-bound
      renderedH = ch;
      renderedW = ch * sourceAspect;
    } else {
      // Container taller than source — image is width-bound
      renderedW = cw;
      renderedH = cw / sourceAspect;
    }
    setDisplaySize({
      width: renderedW,
      height: renderedH,
      offsetX: (cw - renderedW) / 2,
      offsetY: (ch - renderedH) / 2,
    });
  }, [imageWidth, imageHeight]);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  const scale = displaySize.width > 0 ? displaySize.width / imageWidth : 1;

  // Convert pointer event (page coords) to source pixel coords. Subtract the
  // letterbox offset so coords are relative to the rendered image's
  // top-left, not the container's.
  const toSourceCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const container = containerRef.current;
      if (!container || scale === 0) return null;
      const box = container.getBoundingClientRect();
      const px = (clientX - box.left - displaySize.offsetX) / scale;
      const py = (clientY - box.top - displaySize.offsetY) / scale;
      return {
        x: Math.max(0, Math.min(px, imageWidth)),
        y: Math.max(0, Math.min(py, imageHeight)),
      };
    },
    [scale, imageWidth, imageHeight, displaySize.offsetX, displaySize.offsetY]
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
