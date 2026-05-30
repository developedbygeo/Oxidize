use image::{DynamicImage, GenericImageView, ImageFormat, ImageReader};
use std::io::Cursor;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

use crate::compress::{compress_jpeg_mozjpeg, compress_webp};
use crate::image_jobs::run_image_batch;
use crate::types::{BeautifyOptions, BeautifyResult, PipelineBeautifyParams};
use crate::utils::{
    detect_format, get_format_from_string, resolve_output_dir, resolve_output_path, ResolvedPath,
    TemplateContext,
};

/// Convert RGB to HSL
fn rgb_to_hsl(r: u8, g: u8, b: u8) -> (f32, f32, f32) {
    let r = r as f32 / 255.0;
    let g = g as f32 / 255.0;
    let b = b as f32 / 255.0;

    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let l = (max + min) / 2.0;

    if max == min {
        return (0.0, 0.0, l);
    }

    let d = max - min;
    let s = if l > 0.5 {
        d / (2.0 - max - min)
    } else {
        d / (max + min)
    };

    let h = if max == r {
        ((g - b) / d + if g < b { 6.0 } else { 0.0 }) / 6.0
    } else if max == g {
        ((b - r) / d + 2.0) / 6.0
    } else {
        ((r - g) / d + 4.0) / 6.0
    };

    (h, s, l)
}

/// Convert HSL to RGB
fn hsl_to_rgb(h: f32, s: f32, l: f32) -> (u8, u8, u8) {
    if s == 0.0 {
        let v = (l * 255.0) as u8;
        return (v, v, v);
    }

    let q = if l < 0.5 {
        l * (1.0 + s)
    } else {
        l + s - l * s
    };
    let p = 2.0 * l - q;

    let hue_to_rgb = |t: f32| -> f32 {
        let t = if t < 0.0 {
            t + 1.0
        } else if t > 1.0 {
            t - 1.0
        } else {
            t
        };
        if t < 1.0 / 6.0 {
            p + (q - p) * 6.0 * t
        } else if t < 1.0 / 2.0 {
            q
        } else if t < 2.0 / 3.0 {
            p + (q - p) * (2.0 / 3.0 - t) * 6.0
        } else {
            p
        }
    };

    let r = (hue_to_rgb(h + 1.0 / 3.0) * 255.0) as u8;
    let g = (hue_to_rgb(h) * 255.0) as u8;
    let b = (hue_to_rgb(h - 1.0 / 3.0) * 255.0) as u8;

    (r, g, b)
}

fn apply_contrast(img: &mut DynamicImage, contrast: f32) {
    if contrast == 0.0 {
        return;
    }
    let factor = (100.0 + contrast) / 100.0;
    let factor = factor * factor;

    if let Some(rgba) = img.as_mut_rgba8() {
        for pixel in rgba.pixels_mut() {
            for i in 0..3 {
                let val = pixel[i] as f32;
                let adjusted = ((val - 128.0) * factor) + 128.0;
                pixel[i] = adjusted.clamp(0.0, 255.0) as u8;
            }
        }
    } else if let Some(rgb) = img.as_mut_rgb8() {
        for pixel in rgb.pixels_mut() {
            for i in 0..3 {
                let val = pixel[i] as f32;
                let adjusted = ((val - 128.0) * factor) + 128.0;
                pixel[i] = adjusted.clamp(0.0, 255.0) as u8;
            }
        }
    }
}

fn apply_saturation(img: &mut DynamicImage, saturation: f32) {
    if saturation == 0.0 {
        return;
    }
    let factor = (100.0 + saturation) / 100.0;

    if let Some(rgba) = img.as_mut_rgba8() {
        for pixel in rgba.pixels_mut() {
            let (h, s, l) = rgb_to_hsl(pixel[0], pixel[1], pixel[2]);
            let new_s = (s * factor).clamp(0.0, 1.0);
            let (r, g, b) = hsl_to_rgb(h, new_s, l);
            pixel[0] = r;
            pixel[1] = g;
            pixel[2] = b;
        }
    } else if let Some(rgb) = img.as_mut_rgb8() {
        for pixel in rgb.pixels_mut() {
            let (h, s, l) = rgb_to_hsl(pixel[0], pixel[1], pixel[2]);
            let new_s = (s * factor).clamp(0.0, 1.0);
            let (r, g, b) = hsl_to_rgb(h, new_s, l);
            pixel[0] = r;
            pixel[1] = g;
            pixel[2] = b;
        }
    }
}

fn apply_exposure(img: &mut DynamicImage, exposure: f32) {
    if exposure == 0.0 {
        return;
    }
    let gamma = if exposure >= 0.0 {
        1.0 + (exposure / 100.0)
    } else {
        1.0 / (1.0 - exposure / 100.0)
    };
    let inv_gamma = 1.0 / gamma;

    if let Some(rgba) = img.as_mut_rgba8() {
        for pixel in rgba.pixels_mut() {
            for i in 0..3 {
                let val = pixel[i] as f32 / 255.0;
                let adjusted = val.powf(inv_gamma);
                pixel[i] = (adjusted * 255.0).clamp(0.0, 255.0) as u8;
            }
        }
    } else if let Some(rgb) = img.as_mut_rgb8() {
        for pixel in rgb.pixels_mut() {
            for i in 0..3 {
                let val = pixel[i] as f32 / 255.0;
                let adjusted = val.powf(inv_gamma);
                pixel[i] = (adjusted * 255.0).clamp(0.0, 255.0) as u8;
            }
        }
    }
}

fn apply_hue_shift(img: &mut DynamicImage, hue_shift: i32) {
    if hue_shift == 0 {
        return;
    }
    let shift = (hue_shift as f32) / 360.0;

    if let Some(rgba) = img.as_mut_rgba8() {
        for pixel in rgba.pixels_mut() {
            let (h, s, l) = rgb_to_hsl(pixel[0], pixel[1], pixel[2]);
            let new_h = (h + shift).rem_euclid(1.0);
            let (r, g, b) = hsl_to_rgb(new_h, s, l);
            pixel[0] = r;
            pixel[1] = g;
            pixel[2] = b;
        }
    } else if let Some(rgb) = img.as_mut_rgb8() {
        for pixel in rgb.pixels_mut() {
            let (h, s, l) = rgb_to_hsl(pixel[0], pixel[1], pixel[2]);
            let new_h = (h + shift).rem_euclid(1.0);
            let (r, g, b) = hsl_to_rgb(new_h, s, l);
            pixel[0] = r;
            pixel[1] = g;
            pixel[2] = b;
        }
    }
}

fn apply_temperature(img: &mut DynamicImage, temperature: i32) {
    if temperature == 0 {
        return;
    }
    let temp_factor = temperature as f32 / 100.0;

    if let Some(rgba) = img.as_mut_rgba8() {
        for pixel in rgba.pixels_mut() {
            let r = pixel[0] as f32;
            let b = pixel[2] as f32;

            if temp_factor > 0.0 {
                pixel[0] = (r + (255.0 - r) * temp_factor * 0.3).clamp(0.0, 255.0) as u8;
                pixel[2] = (b - b * temp_factor * 0.3).clamp(0.0, 255.0) as u8;
            } else {
                let cool = -temp_factor;
                pixel[0] = (r - r * cool * 0.3).clamp(0.0, 255.0) as u8;
                pixel[2] = (b + (255.0 - b) * cool * 0.3).clamp(0.0, 255.0) as u8;
            }
        }
    } else if let Some(rgb) = img.as_mut_rgb8() {
        for pixel in rgb.pixels_mut() {
            let r = pixel[0] as f32;
            let b = pixel[2] as f32;

            if temp_factor > 0.0 {
                pixel[0] = (r + (255.0 - r) * temp_factor * 0.3).clamp(0.0, 255.0) as u8;
                pixel[2] = (b - b * temp_factor * 0.3).clamp(0.0, 255.0) as u8;
            } else {
                let cool = -temp_factor;
                pixel[0] = (r - r * cool * 0.3).clamp(0.0, 255.0) as u8;
                pixel[2] = (b + (255.0 - b) * cool * 0.3).clamp(0.0, 255.0) as u8;
            }
        }
    }
}

fn apply_white_balance(img: &mut DynamicImage, preset: &str) {
    let (r_mult, g_mult, b_mult) = match preset {
        "daylight" => (1.0, 1.0, 1.0),
        "cloudy" => (1.05, 1.0, 0.95),
        "tungsten" => (0.9, 0.95, 1.15),
        "fluorescent" => (0.95, 1.05, 1.0),
        "auto" => {
            let (sum_r, sum_g, sum_b, count) = if let Some(rgba) = img.as_rgba8() {
                let mut sr: u64 = 0;
                let mut sg: u64 = 0;
                let mut sb: u64 = 0;
                let cnt = rgba.pixels().count() as u64;
                for pixel in rgba.pixels() {
                    sr += pixel[0] as u64;
                    sg += pixel[1] as u64;
                    sb += pixel[2] as u64;
                }
                (sr, sg, sb, cnt)
            } else if let Some(rgb) = img.as_rgb8() {
                let mut sr: u64 = 0;
                let mut sg: u64 = 0;
                let mut sb: u64 = 0;
                let cnt = rgb.pixels().count() as u64;
                for pixel in rgb.pixels() {
                    sr += pixel[0] as u64;
                    sg += pixel[1] as u64;
                    sb += pixel[2] as u64;
                }
                (sr, sg, sb, cnt)
            } else {
                return;
            };

            if count == 0 {
                return;
            }

            let avg_r = sum_r as f32 / count as f32;
            let avg_g = sum_g as f32 / count as f32;
            let avg_b = sum_b as f32 / count as f32;
            let avg_gray = (avg_r + avg_g + avg_b) / 3.0;

            let r_m = if avg_r > 0.0 {
                (avg_gray / avg_r).clamp(0.5, 2.0)
            } else {
                1.0
            };
            let g_m = if avg_g > 0.0 {
                (avg_gray / avg_g).clamp(0.5, 2.0)
            } else {
                1.0
            };
            let b_m = if avg_b > 0.0 {
                (avg_gray / avg_b).clamp(0.5, 2.0)
            } else {
                1.0
            };

            (r_m, g_m, b_m)
        }
        _ => return,
    };

    if r_mult == 1.0 && g_mult == 1.0 && b_mult == 1.0 {
        return;
    }

    if let Some(rgba) = img.as_mut_rgba8() {
        for pixel in rgba.pixels_mut() {
            pixel[0] = (pixel[0] as f32 * r_mult).clamp(0.0, 255.0) as u8;
            pixel[1] = (pixel[1] as f32 * g_mult).clamp(0.0, 255.0) as u8;
            pixel[2] = (pixel[2] as f32 * b_mult).clamp(0.0, 255.0) as u8;
        }
    } else if let Some(rgb) = img.as_mut_rgb8() {
        for pixel in rgb.pixels_mut() {
            pixel[0] = (pixel[0] as f32 * r_mult).clamp(0.0, 255.0) as u8;
            pixel[1] = (pixel[1] as f32 * g_mult).clamp(0.0, 255.0) as u8;
            pixel[2] = (pixel[2] as f32 * b_mult).clamp(0.0, 255.0) as u8;
        }
    }
}

fn apply_sharpness(img: &DynamicImage, sharpness: f32) -> DynamicImage {
    if sharpness == 0.0 {
        return img.clone();
    }

    let amount = sharpness / 100.0;

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
    } else if let (Some(orig_rgb), Some(blur_rgb), Some(res_rgb)) =
        (img.as_rgb8(), blurred.as_rgb8(), result.as_mut_rgb8())
    {
        for y in 0..height {
            for x in 0..width {
                let orig_pixel = orig_rgb.get_pixel(x, y);
                let blur_pixel = blur_rgb.get_pixel(x, y);
                let res_pixel = res_rgb.get_pixel_mut(x, y);

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

/// Pure transform: apply all beautify adjustments in-memory. No I/O.
pub fn apply_beautify(img: DynamicImage, params: &PipelineBeautifyParams) -> DynamicImage {
    let mut img = img;
    apply_white_balance(&mut img, &params.white_balance);
    apply_exposure(&mut img, params.exposure);

    if params.brightness != 0 {
        img = img.brighten(params.brightness);
    }

    apply_contrast(&mut img, params.contrast);
    apply_saturation(&mut img, params.saturation);
    apply_hue_shift(&mut img, params.hue_shift);
    apply_temperature(&mut img, params.temperature);
    apply_sharpness(&img, params.sharpness)
}

/// Returns true when no adjustment would change the image.
pub fn beautify_is_noop(params: &PipelineBeautifyParams) -> bool {
    params.brightness == 0
        && params.contrast == 0.0
        && params.saturation == 0.0
        && params.sharpness == 0.0
        && params.exposure == 0.0
        && params.hue_shift == 0
        && params.temperature == 0
        && (params.white_balance == "auto" || params.white_balance == "daylight")
}

fn beautify_image_sync(
    input_path: String,
    options: &BeautifyOptions,
    output_dir: &PathBuf,
) -> Result<BeautifyResult, String> {
    let input = Path::new(&input_path);
    let original_size = std::fs::metadata(&input_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let format_str = detect_format(input).unwrap_or_else(|| "png".to_string());

    let img = ImageReader::open(&input_path)
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;

    let params = PipelineBeautifyParams {
        brightness: options.brightness,
        contrast: options.contrast,
        saturation: options.saturation,
        sharpness: options.sharpness,
        exposure: options.exposure,
        hue_shift: options.hue_shift,
        temperature: options.temperature,
        white_balance: options.white_balance.clone(),
    };
    let img = apply_beautify(img, &params);

    let stem = input
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let (width, height) = img.dimensions();
    let naming = options.naming.clone().unwrap_or_default();
    let ctx = TemplateContext {
        name: stem,
        op: "beautified",
        width: Some(width),
        height: Some(height),
    };
    let output_path = match resolve_output_path(output_dir, &naming, &ctx, &format_str) {
        ResolvedPath::Write(p) => p,
        ResolvedPath::Skip(p) => {
            return Ok(BeautifyResult {
                success: false,
                input_path,
                output_path: Some(p.to_string_lossy().to_string()),
                error: Some("skipped".to_string()),
                original_size,
                new_size: 0,
            });
        }
    };

    let output_data = match format_str.as_str() {
        "jpg" | "jpeg" => compress_jpeg_mozjpeg(&img, 92)?,
        "webp" => compress_webp(&img, 92)?,
        "png" => {
            let mut buffer = Cursor::new(Vec::new());
            img.write_to(&mut buffer, ImageFormat::Png)
                .map_err(|e| e.to_string())?;
            buffer.into_inner()
        }
        _ => {
            let format = get_format_from_string(&format_str).unwrap_or(ImageFormat::Png);
            let mut buffer = Cursor::new(Vec::new());
            img.write_to(&mut buffer, format)
                .map_err(|e| e.to_string())?;
            buffer.into_inner()
        }
    };

    let new_size = output_data.len() as u64;
    std::fs::write(&output_path, output_data).map_err(|e| e.to_string())?;

    Ok(BeautifyResult {
        success: true,
        input_path,
        output_path: Some(output_path.to_string_lossy().to_string()),
        error: None,
        original_size,
        new_size,
    })
}

#[tauri::command]
pub async fn beautify_image(
    input_path: String,
    options: BeautifyOptions,
) -> Result<BeautifyResult, String> {
    let input = Path::new(&input_path);
    let output_dir = resolve_output_dir(&options.output_dir, input);
    beautify_image_sync(input_path, &options, &output_dir)
}

#[tauri::command]
pub async fn beautify_images_batch(
    app: AppHandle,
    input_paths: Vec<String>,
    options: BeautifyOptions,
) -> Vec<BeautifyResult> {
    run_image_batch(
        &app,
        input_paths,
        |path| {
            let input = Path::new(path);
            let output_dir = resolve_output_dir(&options.output_dir, input);
            beautify_image_sync(path.to_string(), &options, &output_dir).unwrap_or_else(|e| {
                BeautifyResult {
                    success: false,
                    input_path: path.to_string(),
                    output_path: None,
                    error: Some(e),
                    original_size: 0,
                    new_size: 0,
                }
            })
        },
        |path| BeautifyResult {
            success: false,
            input_path: path.to_string(),
            output_path: None,
            error: Some("cancelled".into()),
            original_size: 0,
            new_size: 0,
        },
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{Rgba, RgbaImage};

    fn default_params() -> PipelineBeautifyParams {
        PipelineBeautifyParams {
            brightness: 0,
            contrast: 0.0,
            saturation: 0.0,
            sharpness: 0.0,
            exposure: 0.0,
            hue_shift: 0,
            temperature: 0,
            white_balance: "daylight".to_string(),
        }
    }

    fn solid_rgba(width: u32, height: u32, color: [u8; 4]) -> DynamicImage {
        DynamicImage::ImageRgba8(RgbaImage::from_pixel(width, height, Rgba(color)))
    }

    // ────────────── rgb_to_hsl / hsl_to_rgb round-trip ──────────────

    fn round_trip_rgb(r: u8, g: u8, b: u8) -> (u8, u8, u8) {
        let (h, s, l) = rgb_to_hsl(r, g, b);
        hsl_to_rgb(h, s, l)
    }

    #[test]
    fn hsl_round_trips_pure_red() {
        let (r, g, b) = round_trip_rgb(255, 0, 0);
        // Rounding via u8 + f32 means we tolerate ±2.
        assert!((r as i32 - 255).abs() <= 2);
        assert!((g as i32 - 0).abs() <= 2);
        assert!((b as i32 - 0).abs() <= 2);
    }

    #[test]
    fn hsl_round_trips_pure_green() {
        let (r, g, b) = round_trip_rgb(0, 255, 0);
        assert!((r as i32 - 0).abs() <= 2);
        assert!((g as i32 - 255).abs() <= 2);
        assert!((b as i32 - 0).abs() <= 2);
    }

    #[test]
    fn hsl_round_trips_pure_blue() {
        let (r, g, b) = round_trip_rgb(0, 0, 255);
        assert!((r as i32 - 0).abs() <= 2);
        assert!((g as i32 - 0).abs() <= 2);
        assert!((b as i32 - 255).abs() <= 2);
    }

    #[test]
    fn hsl_collapses_grayscale_to_zero_saturation() {
        let (_, s, l) = rgb_to_hsl(128, 128, 128);
        assert_eq!(s, 0.0);
        assert!((l - 128.0 / 255.0).abs() < 1e-3);
    }

    // ────────────── beautify_is_noop ──────────────

    #[test]
    fn is_noop_for_default_params() {
        assert!(beautify_is_noop(&default_params()));
    }

    #[test]
    fn is_noop_for_explicit_auto_white_balance() {
        let mut p = default_params();
        p.white_balance = "auto".to_string();
        assert!(beautify_is_noop(&p));
    }

    #[test]
    fn is_not_noop_when_any_adjustment_is_set() {
        let mut p = default_params();
        p.brightness = 5;
        assert!(!beautify_is_noop(&p));

        let mut p = default_params();
        p.white_balance = "cloudy".to_string();
        assert!(!beautify_is_noop(&p));
    }

    // ────────────── apply_beautify smoke ──────────────

    #[test]
    fn apply_beautify_noop_preserves_pixel_data() {
        let img = solid_rgba(8, 8, [120, 60, 200, 255]);
        let result = apply_beautify(img, &default_params());
        let rgba = result.as_rgba8().unwrap();
        for px in rgba.pixels() {
            // Daylight white-balance + zero adjustments = source untouched.
            assert_eq!(*px, Rgba([120, 60, 200, 255]));
        }
    }

    #[test]
    fn apply_beautify_brightness_positive_brightens_pixels() {
        let img = solid_rgba(4, 4, [100, 100, 100, 255]);
        let mut params = default_params();
        params.brightness = 40;
        let result = apply_beautify(img, &params);
        let rgba = result.as_rgba8().unwrap();
        for px in rgba.pixels() {
            assert!(px[0] > 100, "channel R should increase, got {}", px[0]);
            assert!(px[1] > 100);
            assert!(px[2] > 100);
        }
    }

    #[test]
    fn apply_beautify_does_not_change_dimensions() {
        let img = solid_rgba(7, 11, [50, 60, 70, 255]);
        let mut params = default_params();
        params.contrast = 30.0;
        params.saturation = 20.0;
        let result = apply_beautify(img, &params);
        assert_eq!(result.dimensions(), (7, 11));
    }
}
