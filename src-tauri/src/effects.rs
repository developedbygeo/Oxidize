use image::{DynamicImage, GenericImageView, ImageFormat, ImageReader};
use rayon::prelude::*;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::io::Cursor;
use std::path::{Path, PathBuf};

use crate::compress::{compress_jpeg_mozjpeg, compress_webp};
use crate::types::{EffectOptions, EffectResult, PipelineEffectParams};
use crate::utils::{detect_format, get_format_from_string, resolve_output_dir, unique_output_path};

fn apply_grayscale(img: &DynamicImage, intensity: f32) -> DynamicImage {
    if intensity == 0.0 {
        return img.clone();
    }

    let grayscale = img.grayscale();

    if intensity >= 1.0 {
        return grayscale;
    }

    blend_images(img, &grayscale, intensity)
}

fn apply_sepia(img: &DynamicImage, intensity: f32) -> DynamicImage {
    if intensity == 0.0 {
        return img.clone();
    }

    let mut result = img.clone();

    if let Some(rgba) = result.as_mut_rgba8() {
        for pixel in rgba.pixels_mut() {
            let r = pixel[0] as f32;
            let g = pixel[1] as f32;
            let b = pixel[2] as f32;

            let sepia_r = (0.393 * r + 0.769 * g + 0.189 * b).min(255.0);
            let sepia_g = (0.349 * r + 0.686 * g + 0.168 * b).min(255.0);
            let sepia_b = (0.272 * r + 0.534 * g + 0.131 * b).min(255.0);

            pixel[0] = (r + (sepia_r - r) * intensity).clamp(0.0, 255.0) as u8;
            pixel[1] = (g + (sepia_g - g) * intensity).clamp(0.0, 255.0) as u8;
            pixel[2] = (b + (sepia_b - b) * intensity).clamp(0.0, 255.0) as u8;
        }
    } else if let Some(rgb) = result.as_mut_rgb8() {
        for pixel in rgb.pixels_mut() {
            let r = pixel[0] as f32;
            let g = pixel[1] as f32;
            let b = pixel[2] as f32;

            let sepia_r = (0.393 * r + 0.769 * g + 0.189 * b).min(255.0);
            let sepia_g = (0.349 * r + 0.686 * g + 0.168 * b).min(255.0);
            let sepia_b = (0.272 * r + 0.534 * g + 0.131 * b).min(255.0);

            pixel[0] = (r + (sepia_r - r) * intensity).clamp(0.0, 255.0) as u8;
            pixel[1] = (g + (sepia_g - g) * intensity).clamp(0.0, 255.0) as u8;
            pixel[2] = (b + (sepia_b - b) * intensity).clamp(0.0, 255.0) as u8;
        }
    }

    result
}

fn apply_vintage(img: &DynamicImage, intensity: f32) -> DynamicImage {
    if intensity == 0.0 {
        return img.clone();
    }

    let mut result = img.clone();

    if let Some(rgba) = result.as_mut_rgba8() {
        for pixel in rgba.pixels_mut() {
            let r = pixel[0] as f32;
            let g = pixel[1] as f32;
            let b = pixel[2] as f32;

            let vintage_r = (r * 1.1 + 20.0).min(255.0);
            let vintage_g = (g * 0.95 + 10.0).min(255.0);
            let vintage_b = (b * 0.8).min(255.0);

            let contrast_factor = 0.9;
            let final_r = ((vintage_r - 128.0) * contrast_factor + 128.0).clamp(0.0, 255.0);
            let final_g = ((vintage_g - 128.0) * contrast_factor + 128.0).clamp(0.0, 255.0);
            let final_b = ((vintage_b - 128.0) * contrast_factor + 128.0).clamp(0.0, 255.0);

            pixel[0] = (r + (final_r - r) * intensity).clamp(0.0, 255.0) as u8;
            pixel[1] = (g + (final_g - g) * intensity).clamp(0.0, 255.0) as u8;
            pixel[2] = (b + (final_b - b) * intensity).clamp(0.0, 255.0) as u8;
        }
    } else if let Some(rgb) = result.as_mut_rgb8() {
        for pixel in rgb.pixels_mut() {
            let r = pixel[0] as f32;
            let g = pixel[1] as f32;
            let b = pixel[2] as f32;

            let vintage_r = (r * 1.1 + 20.0).min(255.0);
            let vintage_g = (g * 0.95 + 10.0).min(255.0);
            let vintage_b = (b * 0.8).min(255.0);

            let contrast_factor = 0.9;
            let final_r = ((vintage_r - 128.0) * contrast_factor + 128.0).clamp(0.0, 255.0);
            let final_g = ((vintage_g - 128.0) * contrast_factor + 128.0).clamp(0.0, 255.0);
            let final_b = ((vintage_b - 128.0) * contrast_factor + 128.0).clamp(0.0, 255.0);

            pixel[0] = (r + (final_r - r) * intensity).clamp(0.0, 255.0) as u8;
            pixel[1] = (g + (final_g - g) * intensity).clamp(0.0, 255.0) as u8;
            pixel[2] = (b + (final_b - b) * intensity).clamp(0.0, 255.0) as u8;
        }
    }

    result
}

fn apply_blur_effect(img: &DynamicImage, intensity: f32) -> DynamicImage {
    if intensity == 0.0 {
        return img.clone();
    }
    let sigma = intensity * 10.0;
    img.blur(sigma)
}

fn apply_sharpen_effect(img: &DynamicImage, intensity: f32) -> DynamicImage {
    if intensity == 0.0 {
        return img.clone();
    }

    let amount = intensity;

    if amount < 0.0 {
        let sigma = (-amount * 3.0).max(0.1);
        return img.blur(sigma);
    }

    let blurred = img.blur(1.0);
    let (width, height) = img.dimensions();

    let mut result = img.clone();

    if let (Some(orig_rgba), Some(blur_rgba), Some(res_rgba)) =
        (img.as_rgba8(), blurred.as_rgba8(), result.as_mut_rgba8())
    {
        for y in 0..height {
            for x in 0..width {
                let orig_pixel = orig_rgba.get_pixel(x, y);
                let blur_pixel = blur_rgba.get_pixel(x, y);
                let res_pixel = res_rgba.get_pixel_mut(x, y);

                for i in 0..3 {
                    let diff = orig_pixel[i] as f32 - blur_pixel[i] as f32;
                    let sharpened = orig_pixel[i] as f32 + diff * amount * 2.0;
                    res_pixel[i] = sharpened.clamp(0.0, 255.0) as u8;
                }
            }
        }
    }

    result
}

fn apply_invert(img: &DynamicImage, intensity: f32) -> DynamicImage {
    if intensity == 0.0 {
        return img.clone();
    }

    let mut result = img.clone();

    if let Some(rgba) = result.as_mut_rgba8() {
        for pixel in rgba.pixels_mut() {
            let inv_r = 255 - pixel[0];
            let inv_g = 255 - pixel[1];
            let inv_b = 255 - pixel[2];

            pixel[0] =
                (pixel[0] as f32 + (inv_r as f32 - pixel[0] as f32) * intensity).clamp(0.0, 255.0)
                    as u8;
            pixel[1] =
                (pixel[1] as f32 + (inv_g as f32 - pixel[1] as f32) * intensity).clamp(0.0, 255.0)
                    as u8;
            pixel[2] =
                (pixel[2] as f32 + (inv_b as f32 - pixel[2] as f32) * intensity).clamp(0.0, 255.0)
                    as u8;
        }
    } else if let Some(rgb) = result.as_mut_rgb8() {
        for pixel in rgb.pixels_mut() {
            let inv_r = 255 - pixel[0];
            let inv_g = 255 - pixel[1];
            let inv_b = 255 - pixel[2];

            pixel[0] =
                (pixel[0] as f32 + (inv_r as f32 - pixel[0] as f32) * intensity).clamp(0.0, 255.0)
                    as u8;
            pixel[1] =
                (pixel[1] as f32 + (inv_g as f32 - pixel[1] as f32) * intensity).clamp(0.0, 255.0)
                    as u8;
            pixel[2] =
                (pixel[2] as f32 + (inv_b as f32 - pixel[2] as f32) * intensity).clamp(0.0, 255.0)
                    as u8;
        }
    }

    result
}

fn apply_vignette(img: &DynamicImage, intensity: f32) -> DynamicImage {
    if intensity == 0.0 {
        return img.clone();
    }

    let mut result = img.clone();
    let (width, height) = img.dimensions();
    let center_x = width as f32 / 2.0;
    let center_y = height as f32 / 2.0;
    let max_dist = (center_x * center_x + center_y * center_y).sqrt();

    if let Some(rgba) = result.as_mut_rgba8() {
        for (x, y, pixel) in rgba.enumerate_pixels_mut() {
            let dx = x as f32 - center_x;
            let dy = y as f32 - center_y;
            let dist = (dx * dx + dy * dy).sqrt() / max_dist;

            let vignette = 1.0 - (dist * dist * intensity);
            let vignette = vignette.max(0.0);

            pixel[0] = (pixel[0] as f32 * vignette).clamp(0.0, 255.0) as u8;
            pixel[1] = (pixel[1] as f32 * vignette).clamp(0.0, 255.0) as u8;
            pixel[2] = (pixel[2] as f32 * vignette).clamp(0.0, 255.0) as u8;
        }
    } else if let Some(rgb) = result.as_mut_rgb8() {
        for (x, y, pixel) in rgb.enumerate_pixels_mut() {
            let dx = x as f32 - center_x;
            let dy = y as f32 - center_y;
            let dist = (dx * dx + dy * dy).sqrt() / max_dist;

            let vignette = 1.0 - (dist * dist * intensity);
            let vignette = vignette.max(0.0);

            pixel[0] = (pixel[0] as f32 * vignette).clamp(0.0, 255.0) as u8;
            pixel[1] = (pixel[1] as f32 * vignette).clamp(0.0, 255.0) as u8;
            pixel[2] = (pixel[2] as f32 * vignette).clamp(0.0, 255.0) as u8;
        }
    }

    result
}

fn apply_noise(img: &DynamicImage, intensity: f32) -> DynamicImage {
    if intensity == 0.0 {
        return img.clone();
    }

    let mut result = img.clone();
    let noise_amount = intensity * 50.0;

    if let Some(rgba) = result.as_mut_rgba8() {
        for (x, y, pixel) in rgba.enumerate_pixels_mut() {
            let mut hasher = DefaultHasher::new();
            (x, y).hash(&mut hasher);
            let hash = hasher.finish();
            let noise = ((hash % 1000) as f32 / 500.0 - 1.0) * noise_amount;

            pixel[0] = (pixel[0] as f32 + noise).clamp(0.0, 255.0) as u8;
            pixel[1] = (pixel[1] as f32 + noise).clamp(0.0, 255.0) as u8;
            pixel[2] = (pixel[2] as f32 + noise).clamp(0.0, 255.0) as u8;
        }
    } else if let Some(rgb) = result.as_mut_rgb8() {
        for (x, y, pixel) in rgb.enumerate_pixels_mut() {
            let mut hasher = DefaultHasher::new();
            (x, y).hash(&mut hasher);
            let hash = hasher.finish();
            let noise = ((hash % 1000) as f32 / 500.0 - 1.0) * noise_amount;

            pixel[0] = (pixel[0] as f32 + noise).clamp(0.0, 255.0) as u8;
            pixel[1] = (pixel[1] as f32 + noise).clamp(0.0, 255.0) as u8;
            pixel[2] = (pixel[2] as f32 + noise).clamp(0.0, 255.0) as u8;
        }
    }

    result
}

fn apply_pixelate(img: &DynamicImage, intensity: f32) -> DynamicImage {
    if intensity == 0.0 {
        return img.clone();
    }

    let (width, height) = img.dimensions();
    let block_size = (2.0 + intensity * 48.0) as u32;
    let block_size = block_size.max(1);

    let small_width = (width / block_size).max(1);
    let small_height = (height / block_size).max(1);

    let small = img.resize_exact(small_width, small_height, image::imageops::FilterType::Nearest);
    small.resize_exact(width, height, image::imageops::FilterType::Nearest)
}

fn apply_posterize(img: &DynamicImage, intensity: f32) -> DynamicImage {
    if intensity == 0.0 {
        return img.clone();
    }

    let mut result = img.clone();
    let levels = (256.0 - intensity * 250.0).max(2.0) as u8;
    let step = 256.0 / levels as f32;

    if let Some(rgba) = result.as_mut_rgba8() {
        for pixel in rgba.pixels_mut() {
            for i in 0..3 {
                let val = pixel[i] as f32;
                let posterized = ((val / step).floor() * step).clamp(0.0, 255.0);
                pixel[i] = posterized as u8;
            }
        }
    } else if let Some(rgb) = result.as_mut_rgb8() {
        for pixel in rgb.pixels_mut() {
            for i in 0..3 {
                let val = pixel[i] as f32;
                let posterized = ((val / step).floor() * step).clamp(0.0, 255.0);
                pixel[i] = posterized as u8;
            }
        }
    }

    result
}

fn blend_images(img1: &DynamicImage, img2: &DynamicImage, factor: f32) -> DynamicImage {
    let mut result = img1.clone();
    let (width, height) = img1.dimensions();

    if let (Some(rgba1), Some(rgba2), Some(res)) =
        (img1.as_rgba8(), img2.as_rgba8(), result.as_mut_rgba8())
    {
        for y in 0..height {
            for x in 0..width {
                let p1 = rgba1.get_pixel(x, y);
                let p2 = rgba2.get_pixel(x, y);
                let res_pixel = res.get_pixel_mut(x, y);

                for i in 0..3 {
                    res_pixel[i] =
                        (p1[i] as f32 + (p2[i] as f32 - p1[i] as f32) * factor).clamp(0.0, 255.0)
                            as u8;
                }
            }
        }
    }

    result
}

fn apply_effect(img: &DynamicImage, effect: &str, intensity: f32) -> DynamicImage {
    match effect {
        "grayscale" => apply_grayscale(img, intensity),
        "sepia" => apply_sepia(img, intensity),
        "vintage" => apply_vintage(img, intensity),
        "blur" => apply_blur_effect(img, intensity),
        "sharpen" => apply_sharpen_effect(img, intensity),
        "invert" => apply_invert(img, intensity),
        "vignette" => apply_vignette(img, intensity),
        "noise" => apply_noise(img, intensity),
        "pixelate" => apply_pixelate(img, intensity),
        "posterize" => apply_posterize(img, intensity),
        _ => img.clone(),
    }
}

/// Pure transform: apply effect in-memory. No I/O.
pub fn apply_pipeline_effect(img: &DynamicImage, params: &PipelineEffectParams) -> DynamicImage {
    let intensity = params.intensity as f32 / 100.0;
    apply_effect(img, &params.effect, intensity)
}

/// Returns true when the effect has zero intensity (no-op).
pub fn effect_is_noop(params: &PipelineEffectParams) -> bool {
    params.intensity == 0
}

fn apply_image_effect_sync(
    input_path: String,
    options: &EffectOptions,
    output_dir: &PathBuf,
) -> Result<EffectResult, String> {
    let input = Path::new(&input_path);
    let original_size = std::fs::metadata(&input_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let format_str = detect_format(input).unwrap_or_else(|| "png".to_string());

    let img = ImageReader::open(&input_path)
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;

    let intensity = options.intensity as f32 / 100.0;
    let result_img = apply_effect(&img, &options.effect, intensity);

    let stem = input
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let output_path = unique_output_path(output_dir, stem, &options.effect, &format_str);

    let output_data = match format_str.as_str() {
        "jpg" | "jpeg" => compress_jpeg_mozjpeg(&result_img, 92)?,
        "webp" => compress_webp(&result_img, 92)?,
        "png" => {
            let mut buffer = Cursor::new(Vec::new());
            result_img
                .write_to(&mut buffer, ImageFormat::Png)
                .map_err(|e| e.to_string())?;
            buffer.into_inner()
        }
        _ => {
            let format = get_format_from_string(&format_str).unwrap_or(ImageFormat::Png);
            let mut buffer = Cursor::new(Vec::new());
            result_img
                .write_to(&mut buffer, format)
                .map_err(|e| e.to_string())?;
            buffer.into_inner()
        }
    };

    let new_size = output_data.len() as u64;
    std::fs::write(&output_path, output_data).map_err(|e| e.to_string())?;

    Ok(EffectResult {
        success: true,
        input_path,
        output_path: Some(output_path.to_string_lossy().to_string()),
        error: None,
        original_size,
        new_size,
    })
}

#[tauri::command]
pub async fn apply_image_effect(
    input_path: String,
    options: EffectOptions,
) -> Result<EffectResult, String> {
    let input = Path::new(&input_path);
    let output_dir = resolve_output_dir(&options.output_dir, input);
    apply_image_effect_sync(input_path, &options, &output_dir)
}

#[tauri::command]
pub async fn apply_image_effects_batch(
    input_paths: Vec<String>,
    options: EffectOptions,
) -> Vec<EffectResult> {
    input_paths
        .par_iter()
        .map(|path| {
            let input = Path::new(path);
            let output_dir = resolve_output_dir(&options.output_dir, input);
            apply_image_effect_sync(path.clone(), &options, &output_dir).unwrap_or_else(|e| {
                EffectResult {
                    success: false,
                    input_path: path.clone(),
                    output_path: None,
                    error: Some(e),
                    original_size: 0,
                    new_size: 0,
                }
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{Rgba, RgbaImage};

    fn solid_rgba(width: u32, height: u32, color: [u8; 4]) -> DynamicImage {
        DynamicImage::ImageRgba8(RgbaImage::from_pixel(width, height, Rgba(color)))
    }

    fn params(effect: &str, intensity: u8) -> PipelineEffectParams {
        PipelineEffectParams {
            effect: effect.to_string(),
            intensity,
        }
    }

    // ────────────── effect_is_noop ──────────────

    #[test]
    fn effect_is_noop_only_at_zero_intensity() {
        assert!(effect_is_noop(&params("sepia", 0)));
        assert!(!effect_is_noop(&params("sepia", 1)));
        assert!(!effect_is_noop(&params("invert", 100)));
    }

    // ────────────── apply_pipeline_effect at zero intensity ──────────────

    #[test]
    fn zero_intensity_preserves_pixels() {
        let img = solid_rgba(4, 4, [200, 50, 80, 255]);
        let result = apply_pipeline_effect(&img, &params("invert", 0));
        let rgba = result.as_rgba8().unwrap();
        for px in rgba.pixels() {
            assert_eq!(*px, Rgba([200, 50, 80, 255]));
        }
    }

    // ────────────── apply_pipeline_effect: invert ──────────────

    #[test]
    fn invert_at_full_intensity_flips_each_channel() {
        let img = solid_rgba(2, 2, [10, 200, 90, 255]);
        let result = apply_pipeline_effect(&img, &params("invert", 100));
        let rgba = result.as_rgba8().unwrap();
        for px in rgba.pixels() {
            assert_eq!(px[0], 255 - 10);
            assert_eq!(px[1], 255 - 200);
            assert_eq!(px[2], 255 - 90);
            // Alpha is untouched by invert.
            assert_eq!(px[3], 255);
        }
    }

    // ────────────── apply_pipeline_effect: grayscale ──────────────

    #[test]
    fn grayscale_at_full_intensity_collapses_channels_to_equal_values() {
        // image::grayscale produces a Luma8 image; intensity 1.0 in our
        // wrapper returns it untouched. Just assert dimensions for now —
        // pixel-level equality would lock us into the exact luma weights.
        let img = solid_rgba(3, 5, [100, 200, 50, 255]);
        let result = apply_pipeline_effect(&img, &params("grayscale", 100));
        assert_eq!(result.dimensions(), (3, 5));
    }

    // ────────────── apply_pipeline_effect: unknown effect ──────────────

    #[test]
    fn unknown_effect_returns_source_untouched() {
        let img = solid_rgba(2, 2, [1, 2, 3, 4]);
        let result = apply_pipeline_effect(&img, &params("nonexistent_effect_kind", 50));
        let rgba = result.as_rgba8().unwrap();
        for px in rgba.pixels() {
            assert_eq!(*px, Rgba([1, 2, 3, 4]));
        }
    }

    // ────────────── apply_pipeline_effect: dimensions ──────────────

    #[test]
    fn effects_preserve_dimensions() {
        // Most effects work in-place. Check each commonly-used effect
        // keeps the source dimensions.
        let img = solid_rgba(8, 6, [120, 120, 120, 255]);
        for effect in ["sepia", "vintage", "invert", "vignette", "noise", "posterize"] {
            let result = apply_pipeline_effect(&img, &params(effect, 50));
            assert_eq!(
                result.dimensions(),
                (8, 6),
                "effect {} did not preserve dimensions",
                effect
            );
        }
    }
}
