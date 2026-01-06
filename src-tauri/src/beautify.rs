use image::{DynamicImage, GenericImageView, ImageFormat, ImageReader};
use rayon::prelude::*;
use std::io::Cursor;
use std::path::Path;

use crate::compress::{compress_jpeg_mozjpeg, compress_webp};
use crate::types::{BeautifyOptions, BeautifyResult};
use crate::utils::{detect_format, get_format_from_string};

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

fn beautify_image_sync(
    input_path: String,
    options: BeautifyOptions,
) -> Result<BeautifyResult, String> {
    let input = Path::new(&input_path);
    let original_size = std::fs::metadata(&input_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let format_str = detect_format(input).unwrap_or_else(|| "png".to_string());

    let mut img = ImageReader::open(&input_path)
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;

    // Apply adjustments in optimal order
    apply_white_balance(&mut img, &options.white_balance);
    apply_exposure(&mut img, options.exposure);

    if options.brightness != 0 {
        img = img.brighten(options.brightness);
    }

    apply_contrast(&mut img, options.contrast);
    apply_saturation(&mut img, options.saturation);
    apply_hue_shift(&mut img, options.hue_shift);
    apply_temperature(&mut img, options.temperature);
    img = apply_sharpness(&img, options.sharpness);

    let output_dir = options
        .output_dir
        .clone()
        .map(|d| Path::new(&d).to_path_buf())
        .unwrap_or_else(|| input.parent().unwrap_or(Path::new(".")).to_path_buf());

    let stem = input
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let output_path = output_dir.join(format!("{}_beautified.{}", stem, format_str));

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
    beautify_image_sync(input_path, options)
}

#[tauri::command]
pub async fn beautify_images_batch(
    input_paths: Vec<String>,
    options: BeautifyOptions,
) -> Vec<BeautifyResult> {
    input_paths
        .par_iter()
        .map(|path| {
            beautify_image_sync(path.clone(), options.clone()).unwrap_or_else(|e| BeautifyResult {
                success: false,
                input_path: path.clone(),
                output_path: None,
                error: Some(e),
                original_size: 0,
                new_size: 0,
            })
        })
        .collect()
}
