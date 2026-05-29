import { describe, expect, it } from 'vitest';
import {
  applyAspect,
  clampRect,
  computeRenderedRect,
  hitCorner,
  MIN_SIZE,
  toSourceCoords,
} from './crop-math';

describe('clampRect', () => {
  it('leaves an in-bounds rect untouched', () => {
    expect(clampRect({ x: 10, y: 20, width: 100, height: 80 }, 500, 400)).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 80,
    });
  });

  it('pushes a negative origin back to 0', () => {
    expect(clampRect({ x: -50, y: -30, width: 100, height: 80 }, 500, 400)).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 80,
    });
  });

  it('shifts a rect that extends past the image edge back into bounds', () => {
    // Rect 100×80 starting at (450,350) on a 500×400 image — fits but only
    // if we shift the origin so the right edge stays at 500.
    expect(clampRect({ x: 450, y: 350, width: 100, height: 80 }, 500, 400)).toEqual({
      x: 400,
      y: 320,
      width: 100,
      height: 80,
    });
  });

  it('clamps oversized width/height to the image dimensions', () => {
    expect(clampRect({ x: 0, y: 0, width: 800, height: 600 }, 500, 400)).toEqual({
      x: 0,
      y: 0,
      width: 500,
      height: 400,
    });
  });

  it('enforces MIN_SIZE on degenerate rects', () => {
    const r = clampRect({ x: 100, y: 100, width: 0, height: 0 }, 500, 400);
    expect(r.width).toBe(MIN_SIZE);
    expect(r.height).toBe(MIN_SIZE);
  });
});

describe('applyAspect', () => {
  it('drives height from width when driver=width', () => {
    expect(applyAspect({ x: 0, y: 0, width: 1600, height: 0 }, 16 / 9, 'width')).toEqual({
      x: 0,
      y: 0,
      width: 1600,
      height: 900,
    });
  });

  it('drives width from height when driver=height', () => {
    expect(applyAspect({ x: 0, y: 0, width: 0, height: 900 }, 16 / 9, 'height')).toEqual({
      x: 0,
      y: 0,
      width: 1600,
      height: 900,
    });
  });
});

describe('hitCorner', () => {
  const rect = { x: 100, y: 100, w: 200, h: 150 };
  const scale = 0.5; // display:source ratio

  it('returns the corner under the pointer', () => {
    // tolerance = 14 / 0.5 = 28 source px
    expect(hitCorner(100, 100, rect, scale)).toBe('tl');
    expect(hitCorner(300, 100, rect, scale)).toBe('tr');
    expect(hitCorner(100, 250, rect, scale)).toBe('bl');
    expect(hitCorner(300, 250, rect, scale)).toBe('br');
  });

  it('returns null in the middle of the rect', () => {
    expect(hitCorner(200, 175, rect, scale)).toBeNull();
  });

  it('returns null just outside the tolerance band', () => {
    // tolerance ≈ 28 source px, 29 should miss
    expect(hitCorner(129, 100, rect, scale)).toBeNull();
  });

  it('returns null when scale is zero (degenerate)', () => {
    expect(hitCorner(100, 100, rect, 0)).toBeNull();
  });
});

describe('computeRenderedRect', () => {
  it('returns no letterbox when container and source have the same aspect', () => {
    const r = computeRenderedRect(400, 300, 800, 600); // both 4:3
    expect(r).toEqual({ width: 400, height: 300, offsetX: 0, offsetY: 0 });
  });

  it('letterboxes horizontally when the container is wider than source', () => {
    // Container 400×300 (4:3), source 100×100 (1:1) → rendered 300×300 centered
    const r = computeRenderedRect(400, 300, 100, 100);
    expect(r).toEqual({ width: 300, height: 300, offsetX: 50, offsetY: 0 });
  });

  it('letterboxes vertically when the container is taller than source', () => {
    // Container 300×400 (3:4), source 100×100 (1:1) → rendered 300×300 centered
    const r = computeRenderedRect(300, 400, 100, 100);
    expect(r).toEqual({ width: 300, height: 300, offsetX: 0, offsetY: 50 });
  });

  it('returns null for zero or negative container/source dimensions', () => {
    expect(computeRenderedRect(0, 300, 100, 100)).toBeNull();
    expect(computeRenderedRect(300, 0, 100, 100)).toBeNull();
    expect(computeRenderedRect(300, 300, 0, 100)).toBeNull();
    expect(computeRenderedRect(300, 300, 100, 0)).toBeNull();
  });
});

describe('toSourceCoords', () => {
  // Regression: this is the math that was wrong before the canvas extraction.
  // Container 400×400 holding a wide image 1600×400 → object-contain renders
  // the image as 400×100 letterboxed with 150px on top and bottom. A click
  // at the top-left of the *rendered image* (container coord 0,150) should
  // resolve to source coord (0,0), not (0, scaled-letterbox).
  const rendered = { width: 400, height: 100, offsetX: 0, offsetY: 150 };
  const imageWidth = 1600;
  const imageHeight = 400;

  it('maps the top-left of the rendered image to (0,0)', () => {
    expect(toSourceCoords(0, 150, rendered, imageWidth, imageHeight)).toEqual({ x: 0, y: 0 });
  });

  it('maps the bottom-right of the rendered image to (imageWidth, imageHeight)', () => {
    expect(toSourceCoords(400, 250, rendered, imageWidth, imageHeight)).toEqual({
      x: 1600,
      y: 400,
    });
  });

  it('clamps clicks in the top letterbox to the image top edge', () => {
    // Container (200, 50) is above the rendered image — y should clamp to 0
    expect(toSourceCoords(200, 50, rendered, imageWidth, imageHeight)).toEqual({
      x: 800,
      y: 0,
    });
  });

  it('clamps clicks in the bottom letterbox to the image bottom edge', () => {
    expect(toSourceCoords(200, 350, rendered, imageWidth, imageHeight)).toEqual({
      x: 800,
      y: 400,
    });
  });

  it('returns null when rendered width is zero', () => {
    expect(
      toSourceCoords(100, 100, { width: 0, height: 0, offsetX: 0, offsetY: 0 }, 100, 100)
    ).toBeNull();
  });
});
