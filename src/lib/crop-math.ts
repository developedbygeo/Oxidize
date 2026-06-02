export type CropRect = { x: number; y: number; width: number; height: number };

export type Corner = 'tl' | 'tr' | 'bl' | 'br';

export type RenderedRect = {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
};

export const MIN_SIZE = 8;

export const HANDLE_HIT_PX = 14;

export const clampRect = (r: CropRect, imageWidth: number, imageHeight: number): CropRect => {
  const width = Math.max(MIN_SIZE, Math.min(r.width, imageWidth));
  const height = Math.max(MIN_SIZE, Math.min(r.height, imageHeight));
  const x = Math.max(0, Math.min(r.x, imageWidth - width));
  const y = Math.max(0, Math.min(r.y, imageHeight - height));
  return { x, y, width, height };
};

export const applyAspect = (r: CropRect, ratio: number, driver: 'width' | 'height'): CropRect => {
  if (driver === 'width') return { ...r, height: r.width / ratio };
  return { ...r, width: r.height * ratio };
};

export const hitCorner = (
  px: number,
  py: number,
  displayRect: { x: number; y: number; w: number; h: number },
  scale: number,
): Corner | null => {
  if (scale <= 0) return null;
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

export const computeRenderedRect = (
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
): RenderedRect | null => {
  if (containerWidth <= 0 || containerHeight <= 0 || imageWidth <= 0 || imageHeight <= 0) {
    return null;
  }
  const sourceAspect = imageWidth / imageHeight;
  const containerAspect = containerWidth / containerHeight;
  let renderedW: number;
  let renderedH: number;
  if (containerAspect > sourceAspect) {
    renderedH = containerHeight;
    renderedW = containerHeight * sourceAspect;
  } else {
    renderedW = containerWidth;
    renderedH = containerWidth / sourceAspect;
  }
  return {
    width: renderedW,
    height: renderedH,
    offsetX: (containerWidth - renderedW) / 2,
    offsetY: (containerHeight - renderedH) / 2,
  };
};

export const toSourceCoords = (
  containerX: number,
  containerY: number,
  rendered: RenderedRect,
  imageWidth: number,
  imageHeight: number,
): { x: number; y: number } | null => {
  if (rendered.width <= 0) return null;
  const scale = rendered.width / imageWidth;
  if (scale === 0) return null;
  const px = (containerX - rendered.offsetX) / scale;
  const py = (containerY - rendered.offsetY) / scale;
  return {
    x: Math.max(0, Math.min(px, imageWidth)),
    y: Math.max(0, Math.min(py, imageHeight)),
  };
};
