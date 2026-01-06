/**
 * Canvas-based image processing utilities for real-time preview
 * These functions apply the same adjustments as the Rust backend
 * but run in the browser for instant visual feedback
 */

export type PreviewOptions = {
  brightness: number;      // -100 to +100
  contrast: number;        // -100 to +100
  saturation: number;      // -100 to +100
  sharpness: number;       // -100 to +100
  exposure: number;        // -100 to +100
  hueShift: number;        // -180 to +180
  temperature: number;     // -100 to +100
  whiteBalance: 'auto' | 'daylight' | 'cloudy' | 'tungsten' | 'fluorescent';
};

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

// ==================== EFFECTS PREVIEW ====================

import type { EffectType } from '@/types/image';

export type EffectPreviewOptions = {
  effect: EffectType;
  intensity: number; // 0-100
};

// Apply grayscale effect
function applyGrayscale(data: Uint8ClampedArray, intensity: number): void {
  const factor = intensity / 100;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = clamp(data[i] + (gray - data[i]) * factor);
    data[i + 1] = clamp(data[i + 1] + (gray - data[i + 1]) * factor);
    data[i + 2] = clamp(data[i + 2] + (gray - data[i + 2]) * factor);
  }
}

// Apply sepia effect
function applySepia(data: Uint8ClampedArray, intensity: number): void {
  const factor = intensity / 100;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const sepiaR = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
    const sepiaG = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
    const sepiaB = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);

    data[i] = clamp(r + (sepiaR - r) * factor);
    data[i + 1] = clamp(g + (sepiaG - g) * factor);
    data[i + 2] = clamp(b + (sepiaB - b) * factor);
  }
}

// Apply vintage effect
function applyVintage(data: Uint8ClampedArray, intensity: number): void {
  const factor = intensity / 100;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Warm vintage tone with slightly faded look
    const vintageR = Math.min(255, r * 1.1 + 20);
    const vintageG = Math.min(255, g * 0.95 + 10);
    const vintageB = Math.min(255, b * 0.8);

    // Reduce contrast slightly
    const contrastFactor = 0.9;
    const finalR = clamp((vintageR - 128) * contrastFactor + 128);
    const finalG = clamp((vintageG - 128) * contrastFactor + 128);
    const finalB = clamp((vintageB - 128) * contrastFactor + 128);

    data[i] = clamp(r + (finalR - r) * factor);
    data[i + 1] = clamp(g + (finalG - g) * factor);
    data[i + 2] = clamp(b + (finalB - b) * factor);
  }
}

// Apply blur effect (box blur approximation)
function applyBlur(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  intensity: number
): void {
  if (intensity === 0) return;

  // Use a simple box blur with variable radius based on intensity
  const radius = Math.ceil((intensity / 100) * 10);
  const original = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let rSum = 0, gSum = 0, bSum = 0, count = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const idx = (ny * width + nx) * 4;
            rSum += original[idx];
            gSum += original[idx + 1];
            bSum += original[idx + 2];
            count++;
          }
        }
      }

      const idx = (y * width + x) * 4;
      data[idx] = Math.round(rSum / count);
      data[idx + 1] = Math.round(gSum / count);
      data[idx + 2] = Math.round(bSum / count);
    }
  }
}

// Apply sharpen effect (uses existing sharpness function)
function applySharpen(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  intensity: number
): void {
  applySharpness(data, width, height, intensity);
}

// Apply invert colors effect
function applyInvert(data: Uint8ClampedArray, intensity: number): void {
  const factor = intensity / 100;
  for (let i = 0; i < data.length; i += 4) {
    const invR = 255 - data[i];
    const invG = 255 - data[i + 1];
    const invB = 255 - data[i + 2];

    data[i] = clamp(data[i] + (invR - data[i]) * factor);
    data[i + 1] = clamp(data[i + 1] + (invG - data[i + 1]) * factor);
    data[i + 2] = clamp(data[i + 2] + (invB - data[i + 2]) * factor);
  }
}

// Apply vignette effect
function applyVignette(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  intensity: number
): void {
  if (intensity === 0) return;

  const factor = intensity / 100;
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;

      // Vignette falloff - stronger near edges
      const vignette = Math.max(0, 1 - dist * dist * factor);

      const idx = (y * width + x) * 4;
      data[idx] = clamp(data[idx] * vignette);
      data[idx + 1] = clamp(data[idx + 1] * vignette);
      data[idx + 2] = clamp(data[idx + 2] * vignette);
    }
  }
}

// Apply noise/grain effect
function applyNoise(data: Uint8ClampedArray, intensity: number): void {
  if (intensity === 0) return;

  const noiseAmount = (intensity / 100) * 50;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 2 * noiseAmount;
    data[i] = clamp(data[i] + noise);
    data[i + 1] = clamp(data[i + 1] + noise);
    data[i + 2] = clamp(data[i + 2] + noise);
  }
}

// Apply pixelate effect
function applyPixelate(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  intensity: number
): void {
  if (intensity === 0) return;

  // Map intensity to block size (2-50 pixels)
  const blockSize = Math.max(2, Math.ceil(2 + (intensity / 100) * 48));
  const original = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y += blockSize) {
    for (let x = 0; x < width; x += blockSize) {
      // Calculate average color for this block
      let rSum = 0, gSum = 0, bSum = 0, count = 0;

      for (let dy = 0; dy < blockSize && y + dy < height; dy++) {
        for (let dx = 0; dx < blockSize && x + dx < width; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          rSum += original[idx];
          gSum += original[idx + 1];
          bSum += original[idx + 2];
          count++;
        }
      }

      const avgR = Math.round(rSum / count);
      const avgG = Math.round(gSum / count);
      const avgB = Math.round(bSum / count);

      // Fill the block with average color
      for (let dy = 0; dy < blockSize && y + dy < height; dy++) {
        for (let dx = 0; dx < blockSize && x + dx < width; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          data[idx] = avgR;
          data[idx + 1] = avgG;
          data[idx + 2] = avgB;
        }
      }
    }
  }
}

// Apply posterize effect
function applyPosterize(data: Uint8ClampedArray, intensity: number): void {
  if (intensity === 0) return;

  // Map intensity to number of levels (256 down to 2)
  const levels = Math.max(2, Math.round(256 - (intensity / 100) * 250));
  const step = 256 / levels;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.floor(data[i] / step) * step;
    data[i + 1] = Math.floor(data[i + 1] / step) * step;
    data[i + 2] = Math.floor(data[i + 2] / step) * step;
  }
}

// Apply effect based on type
export function applyEffect(
  imageData: ImageData,
  options: EffectPreviewOptions
): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const width = imageData.width;
  const height = imageData.height;

  switch (options.effect) {
    case 'grayscale':
      applyGrayscale(data, options.intensity);
      break;
    case 'sepia':
      applySepia(data, options.intensity);
      break;
    case 'vintage':
      applyVintage(data, options.intensity);
      break;
    case 'blur':
      applyBlur(data, width, height, options.intensity);
      break;
    case 'sharpen':
      applySharpen(data, width, height, options.intensity);
      break;
    case 'invert':
      applyInvert(data, options.intensity);
      break;
    case 'vignette':
      applyVignette(data, width, height, options.intensity);
      break;
    case 'noise':
      applyNoise(data, options.intensity);
      break;
    case 'pixelate':
      applyPixelate(data, width, height, options.intensity);
      break;
    case 'posterize':
      applyPosterize(data, options.intensity);
      break;
  }

  return new ImageData(data, width, height);
}

// Check if effect has been applied (intensity > 0)
export function hasEffect(options: EffectPreviewOptions): boolean {
  return options.intensity > 0;
}
