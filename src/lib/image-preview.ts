/**
 * Canvas-based image processing utilities for real-time preview
 * These functions apply the same adjustments as the Rust backend
 * but run in the browser for instant visual feedback
 */

export interface PreviewOptions {
  brightness: number;      // -100 to +100
  contrast: number;        // -100 to +100
  saturation: number;      // -100 to +100
  sharpness: number;       // -100 to +100
  exposure: number;        // -100 to +100
  hueShift: number;        // -180 to +180
  temperature: number;     // -100 to +100
  whiteBalance: 'auto' | 'daylight' | 'cloudy' | 'tungsten' | 'fluorescent';
}

// Default options (no adjustments)
export const defaultPreviewOptions: PreviewOptions = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  sharpness: 0,
  exposure: 0,
  hueShift: 0,
  temperature: 0,
  whiteBalance: 'auto',
};

// White balance multipliers (RGB)
const whiteBalancePresets: Record<string, [number, number, number]> = {
  auto: [1.0, 1.0, 1.0],      // Will be calculated dynamically
  daylight: [1.0, 1.0, 1.0],  // Neutral
  cloudy: [1.05, 1.0, 0.95],  // Warmer
  tungsten: [0.9, 0.95, 1.15], // Cooler (compensate for warm light)
  fluorescent: [0.95, 1.05, 1.05], // Slight magenta correction
};

// RGB to HSL conversion
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [h * 360, s, l];
}

// HSL to RGB conversion
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;

  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

// Clamp value between 0 and 255
function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

// Calculate auto white balance using gray world assumption
function calculateAutoWhiteBalance(data: Uint8ClampedArray): [number, number, number] {
  let sumR = 0, sumG = 0, sumB = 0;
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    sumR += data[i];
    sumG += data[i + 1];
    sumB += data[i + 2];
  }

  const avgR = sumR / pixelCount;
  const avgG = sumG / pixelCount;
  const avgB = sumB / pixelCount;
  const avgGray = (avgR + avgG + avgB) / 3;

  // Calculate multipliers to balance colors
  return [
    avgGray / (avgR || 1),
    avgGray / (avgG || 1),
    avgGray / (avgB || 1),
  ];
}

// Apply all adjustments to image data
export function applyAdjustments(
  imageData: ImageData,
  options: PreviewOptions
): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const width = imageData.width;
  const height = imageData.height;

  // Get white balance multipliers
  let wbMultipliers: [number, number, number];
  if (options.whiteBalance === 'auto') {
    wbMultipliers = calculateAutoWhiteBalance(data);
  } else {
    wbMultipliers = whiteBalancePresets[options.whiteBalance];
  }

  // Pre-calculate adjustment factors
  const exposureFactor = Math.pow(2, options.exposure / 100);
  const contrastFactor = (100 + options.contrast) / 100;
  const saturationFactor = (100 + options.saturation) / 100;
  const temperatureShift = options.temperature * 0.5; // -50 to +50

  // Process each pixel
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 1. Apply white balance
    r = clamp(r * wbMultipliers[0]);
    g = clamp(g * wbMultipliers[1]);
    b = clamp(b * wbMultipliers[2]);

    // 2. Apply exposure (gamma correction)
    if (options.exposure !== 0) {
      r = clamp(Math.pow(r / 255, 1 / exposureFactor) * 255);
      g = clamp(Math.pow(g / 255, 1 / exposureFactor) * 255);
      b = clamp(Math.pow(b / 255, 1 / exposureFactor) * 255);
    }

    // 3. Apply brightness
    if (options.brightness !== 0) {
      const brightnessAdjust = options.brightness * 2.55; // Scale to 0-255 range
      r = clamp(r + brightnessAdjust);
      g = clamp(g + brightnessAdjust);
      b = clamp(b + brightnessAdjust);
    }

    // 4. Apply contrast (scale around midpoint)
    if (options.contrast !== 0) {
      r = clamp((r - 128) * contrastFactor + 128);
      g = clamp((g - 128) * contrastFactor + 128);
      b = clamp((b - 128) * contrastFactor + 128);
    }

    // 5. Apply saturation and hue shift (convert to HSL)
    if (options.saturation !== 0 || options.hueShift !== 0) {
      let [h, s, l] = rgbToHsl(r, g, b);

      // Adjust saturation
      s = Math.max(0, Math.min(1, s * saturationFactor));

      // Adjust hue
      if (options.hueShift !== 0) {
        h = (h + options.hueShift + 360) % 360;
      }

      [r, g, b] = hslToRgb(h, s, l);
    }

    // 6. Apply temperature (warm/cool shift)
    if (options.temperature !== 0) {
      r = clamp(r + temperatureShift);
      b = clamp(b - temperatureShift);
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  // 7. Apply sharpness (unsharp mask) - separate pass needed
  if (options.sharpness !== 0) {
    applySharpness(data, width, height, options.sharpness);
  }

  return new ImageData(data, width, height);
}

// Apply sharpness using unsharp mask
function applySharpness(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number
): void {
  if (amount === 0) return;

  const factor = amount / 100;
  const original = new Uint8ClampedArray(data);

  // Simple 3x3 blur kernel for the mask
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      for (let c = 0; c < 3; c++) {
        // Calculate blurred value (3x3 average)
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4 + c;
            sum += original[nIdx];
          }
        }
        const blurred = sum / 9;

        // Unsharp mask: original + factor * (original - blurred)
        const originalVal = original[idx + c];
        const sharpened = originalVal + factor * (originalVal - blurred);
        data[idx + c] = clamp(sharpened);
      }
    }
  }
}

// Load an image from URL/base64 and return canvas-ready data
export async function loadImageForPreview(src: string): Promise<{
  imageData: ImageData;
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);

      resolve({
        imageData,
        width: img.width,
        height: img.height,
        canvas,
        ctx,
      });
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

// Apply adjustments and get result as data URL
export async function previewWithAdjustments(
  src: string,
  options: PreviewOptions
): Promise<string> {
  const { imageData, canvas, ctx } = await loadImageForPreview(src);
  const adjusted = applyAdjustments(imageData, options);
  ctx.putImageData(adjusted, 0, 0);
  return canvas.toDataURL('image/png');
}

// Check if any adjustments have been made
export function hasAdjustments(options: PreviewOptions): boolean {
  return (
    options.brightness !== 0 ||
    options.contrast !== 0 ||
    options.saturation !== 0 ||
    options.sharpness !== 0 ||
    options.exposure !== 0 ||
    options.hueShift !== 0 ||
    options.temperature !== 0 ||
    options.whiteBalance !== 'auto'
  );
}
