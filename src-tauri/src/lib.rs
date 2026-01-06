use base64::{engine::general_purpose::STANDARD, Engine};
use image::{DynamicImage, GenericImageView, ImageFormat, ImageReader};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::io::Cursor;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct ImageInfo {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub width: u32,
    pub height: u32,
    pub format: String,
    pub thumbnail: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConversionResult {
    pub success: bool,
    pub output_path: Option<String>,
    pub error: Option<String>,
    pub original_size: u64,
    pub new_size: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConversionOptions {
    pub format: String,
    pub quality: u8,
    pub output_dir: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CompressionOptions {
    pub quality: u8,
    pub output_dir: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompressionResult {
    pub success: bool,
    pub output_path: Option<String>,
    pub error: Option<String>,
    pub original_size: u64,
    pub new_size: u64,
    pub savings_percent: f64,
}

fn get_format_from_string(format: &str) -> Option<ImageFormat> {
    match format.to_lowercase().as_str() {
        "png" => Some(ImageFormat::Png),
        "jpg" | "jpeg" => Some(ImageFormat::Jpeg),
        "webp" => Some(ImageFormat::WebP),
        "gif" => Some(ImageFormat::Gif),
        "bmp" => Some(ImageFormat::Bmp),
        "ico" => Some(ImageFormat::Ico),
        "tiff" | "tif" => Some(ImageFormat::Tiff),
        _ => None,
    }
}

fn get_format_extension(format: &ImageFormat) -> &'static str {
    match format {
        ImageFormat::Png => "png",
        ImageFormat::Jpeg => "jpg",
        ImageFormat::WebP => "webp",
        ImageFormat::Gif => "gif",
        ImageFormat::Bmp => "bmp",
        ImageFormat::Ico => "ico",
        ImageFormat::Tiff => "tiff",
        _ => "png",
    }
}

fn detect_format(path: &Path) -> Option<String> {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase())
}

/// Compress PNG using oxipng for maximum compression
fn compress_png_oxipng(input_data: &[u8], quality: u8) -> Result<Vec<u8>, String> {
    use oxipng::Options;

    // Map quality to oxipng optimization level (0-6)
    // Lower quality = more aggressive optimization = smaller files
    let opt_level = if quality >= 90 {
        1 // Fast, minimal optimization
    } else if quality >= 70 {
        2 // Default
    } else if quality >= 50 {
        4 // Better compression
    } else {
        6 // Maximum compression
    };

    let mut options = Options::from_preset(opt_level);
    options.strip = oxipng::StripChunks::Safe; // Remove unnecessary metadata

    // For lossy compression at lower quality, we can use color quantization
    if quality < 80 {
        // Use imagequant for lossy PNG compression
        return compress_png_lossy(input_data, quality);
    }

    let result = oxipng::optimize_from_memory(input_data, &options)
        .map_err(|e| format!("PNG optimization failed: {}", e))?;

    Ok(result)
}

/// Lossy PNG compression using color quantization
fn compress_png_lossy(input_data: &[u8], quality: u8) -> Result<Vec<u8>, String> {
    use imagequant::{Attributes, RGBA};
    use lodepng::RGBA as LodepngRGBA;

    // Decode PNG
    let decoded = lodepng::decode32(input_data)
        .map_err(|e| format!("Failed to decode PNG: {}", e))?;

    let width = decoded.width;
    let height = decoded.height;

    // Convert to imagequant format
    let pixels: Vec<RGBA> = decoded
        .buffer
        .iter()
        .map(|p| RGBA::new(p.r, p.g, p.b, p.a))
        .collect();

    // Set up quantization
    let mut attr = Attributes::new();
    // Map quality (10-100) to imagequant quality (0-100)
    let iq_quality = quality.max(10).min(100);
    attr.set_quality(0, iq_quality)
        .map_err(|e| format!("Failed to set quality: {:?}", e))?;

    let mut img = attr
        .new_image(pixels, width, height, 0.0)
        .map_err(|e| format!("Failed to create image: {:?}", e))?;

    let mut quantized = attr
        .quantize(&mut img)
        .map_err(|e| format!("Quantization failed: {:?}", e))?;

    quantized.set_dithering_level(1.0)
        .map_err(|e| format!("Failed to set dithering: {:?}", e))?;

    let (palette, pixels) = quantized
        .remapped(&mut img)
        .map_err(|e| format!("Remapping failed: {:?}", e))?;

    // Encode back to PNG using lodepng
    let mut encoder = lodepng::Encoder::new();
    for color in &palette {
        encoder
            .info_png_mut()
            .color
            .palette_add(LodepngRGBA {
                r: color.r,
                g: color.g,
                b: color.b,
                a: color.a,
            })
            .map_err(|e| format!("Failed to add palette: {:?}", e))?;
    }
    encoder.info_png_mut().color.set_colortype(lodepng::ColorType::PALETTE);
    encoder.info_png_mut().color.set_bitdepth(8);
    encoder.info_raw_mut().set_colortype(lodepng::ColorType::PALETTE);
    encoder.info_raw_mut().set_bitdepth(8);

    // Copy palette to raw info
    for color in &palette {
        encoder
            .info_raw_mut()
            .palette_add(LodepngRGBA {
                r: color.r,
                g: color.g,
                b: color.b,
                a: color.a,
            })
            .map_err(|e| format!("Failed to add raw palette: {:?}", e))?;
    }

    let result = encoder
        .encode(&pixels, width, height)
        .map_err(|e| format!("PNG encoding failed: {:?}", e))?;

    Ok(result)
}

/// Compress JPEG using mozjpeg for better compression
fn compress_jpeg_mozjpeg(img: &DynamicImage, quality: u8) -> Result<Vec<u8>, String> {
    use mozjpeg::{Compress, ColorSpace, ScanMode};

    let rgb = img.to_rgb8();
    let (width, height) = img.dimensions();

    let mut comp = Compress::new(ColorSpace::JCS_RGB);
    comp.set_size(width as usize, height as usize);
    comp.set_quality(quality as f32);
    comp.set_scan_optimization_mode(ScanMode::AllComponentsTogether);
    comp.set_optimize_scans(true);

    let mut comp = comp.start_compress(Vec::new())
        .map_err(|e| format!("Failed to start JPEG compression: {:?}", e))?;

    comp.write_scanlines(rgb.as_raw())
        .map_err(|e| format!("Failed to write scanlines: {:?}", e))?;

    let result = comp.finish()
        .map_err(|e| format!("Failed to finish JPEG compression: {:?}", e))?;

    Ok(result)
}

/// Compress WebP with quality settings
fn compress_webp(img: &DynamicImage, quality: u8) -> Result<Vec<u8>, String> {
    use webp::Encoder;

    let encoder = Encoder::from_image(img)
        .map_err(|e| format!("WebP encoder error: {}", e))?;

    let result = if quality >= 100 {
        encoder.encode_lossless()
    } else {
        encoder.encode(quality as f32)
    };

    Ok(result.to_vec())
}

/// Compress GIF (mainly optimization, GIF is inherently limited)
fn compress_gif(input_data: &[u8]) -> Result<Vec<u8>, String> {
    // For GIF, we mainly just pass through as GIF compression is inherently limited
    // Could add gifsicle-like optimization in the future
    Ok(input_data.to_vec())
}

#[tauri::command]
fn load_image_info(path: String) -> Result<ImageInfo, String> {
    let path_obj = Path::new(&path);

    let metadata = std::fs::metadata(&path).map_err(|e| e.to_string())?;
    let size = metadata.len();

    let img = ImageReader::open(&path)
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;

    let (width, height) = (img.width(), img.height());

    // Create thumbnail (max 200px)
    let thumb = img.thumbnail(200, 200);
    let mut thumb_bytes = Cursor::new(Vec::new());
    thumb
        .write_to(&mut thumb_bytes, ImageFormat::Png)
        .map_err(|e| e.to_string())?;
    let thumbnail = format!(
        "data:image/png;base64,{}",
        STANDARD.encode(thumb_bytes.into_inner())
    );

    let format = detect_format(path_obj).unwrap_or_else(|| "unknown".to_string());
    let name = path_obj
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    Ok(ImageInfo {
        path,
        name,
        size,
        width,
        height,
        format,
        thumbnail,
    })
}

/// Get full-size image as base64 for preview (with optional max dimension)
#[tauri::command]
fn get_image_preview(path: String, max_dimension: Option<u32>) -> Result<String, String> {
    let img = ImageReader::open(&path)
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;

    // If max_dimension is specified and image is larger, resize it
    let preview = if let Some(max_dim) = max_dimension {
        let (width, height) = img.dimensions();
        if width > max_dim || height > max_dim {
            img.thumbnail(max_dim, max_dim)
        } else {
            img
        }
    } else {
        img
    };

    let mut buffer = Cursor::new(Vec::new());
    preview
        .write_to(&mut buffer, ImageFormat::Png)
        .map_err(|e| e.to_string())?;

    Ok(format!(
        "data:image/png;base64,{}",
        STANDARD.encode(buffer.into_inner())
    ))
}

#[tauri::command]
fn load_images_batch(paths: Vec<String>) -> Vec<Result<ImageInfo, String>> {
    paths
        .par_iter()
        .map(|path| load_image_info(path.clone()))
        .collect()
}

#[tauri::command]
fn convert_image(input_path: String, options: ConversionOptions) -> Result<ConversionResult, String> {
    let input = Path::new(&input_path);
    let original_size = std::fs::metadata(&input_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let target_format = get_format_from_string(&options.format)
        .ok_or_else(|| format!("Unsupported format: {}", options.format))?;

    let img = ImageReader::open(&input_path)
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;

    let output_dir = options
        .output_dir
        .map(|d| Path::new(&d).to_path_buf())
        .unwrap_or_else(|| input.parent().unwrap_or(Path::new(".")).to_path_buf());

    let stem = input.file_stem().and_then(|s| s.to_str()).unwrap_or("output");
    let extension = get_format_extension(&target_format);
    let output_path = output_dir.join(format!("{}_converted.{}", stem, extension));

    // Convert using optimized encoders
    let output_data = match target_format {
        ImageFormat::Jpeg => compress_jpeg_mozjpeg(&img, options.quality)?,
        ImageFormat::WebP => compress_webp(&img, options.quality)?,
        ImageFormat::Png => {
            let mut buffer = Cursor::new(Vec::new());
            img.write_to(&mut buffer, ImageFormat::Png)
                .map_err(|e| e.to_string())?;
            let png_data = buffer.into_inner();
            compress_png_oxipng(&png_data, options.quality)?
        }
        _ => {
            let mut buffer = Cursor::new(Vec::new());
            img.write_to(&mut buffer, target_format)
                .map_err(|e| e.to_string())?;
            buffer.into_inner()
        }
    };

    let new_size = output_data.len() as u64;
    std::fs::write(&output_path, output_data).map_err(|e| e.to_string())?;

    Ok(ConversionResult {
        success: true,
        output_path: Some(output_path.to_string_lossy().to_string()),
        error: None,
        original_size,
        new_size,
    })
}

#[tauri::command]
fn convert_images_batch(
    input_paths: Vec<String>,
    options: ConversionOptions,
) -> Vec<ConversionResult> {
    input_paths
        .par_iter()
        .map(|path| {
            convert_image(path.clone(), ConversionOptions {
                format: options.format.clone(),
                quality: options.quality,
                output_dir: options.output_dir.clone(),
            })
            .unwrap_or_else(|e| ConversionResult {
                success: false,
                output_path: None,
                error: Some(e),
                original_size: 0,
                new_size: 0,
            })
        })
        .collect()
}

#[tauri::command]
fn get_supported_formats() -> Vec<String> {
    vec![
        "png".to_string(),
        "jpg".to_string(),
        "jpeg".to_string(),
        "webp".to_string(),
        "gif".to_string(),
        "bmp".to_string(),
        "ico".to_string(),
        "tiff".to_string(),
    ]
}

#[tauri::command]
fn compress_image(input_path: String, options: CompressionOptions) -> Result<CompressionResult, String> {
    let input = Path::new(&input_path);
    let original_data = std::fs::read(&input_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    let original_size = original_data.len() as u64;

    let format_str = detect_format(input).unwrap_or_else(|| "png".to_string());

    let img = ImageReader::open(&input_path)
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;

    let output_dir = options
        .output_dir
        .clone()
        .map(|d| Path::new(&d).to_path_buf())
        .unwrap_or_else(|| input.parent().unwrap_or(Path::new(".")).to_path_buf());

    let stem = input.file_stem().and_then(|s| s.to_str()).unwrap_or("output");
    let extension = &format_str;
    let output_path = output_dir.join(format!("{}_compressed.{}", stem, extension));

    // Compress based on format using optimized algorithms
    let output_data = match format_str.as_str() {
        "png" => compress_png_oxipng(&original_data, options.quality)?,
        "jpg" | "jpeg" => compress_jpeg_mozjpeg(&img, options.quality)?,
        "webp" => compress_webp(&img, options.quality)?,
        "gif" => compress_gif(&original_data)?,
        _ => {
            // For unsupported formats, just copy
            original_data.clone()
        }
    };

    let new_size = output_data.len() as u64;
    let savings_percent = if original_size > 0 {
        ((original_size as f64 - new_size as f64) / original_size as f64) * 100.0
    } else {
        0.0
    };

    std::fs::write(&output_path, output_data).map_err(|e| e.to_string())?;

    Ok(CompressionResult {
        success: true,
        output_path: Some(output_path.to_string_lossy().to_string()),
        error: None,
        original_size,
        new_size,
        savings_percent,
    })
}

#[tauri::command]
fn compress_images_batch(
    input_paths: Vec<String>,
    options: CompressionOptions,
) -> Vec<CompressionResult> {
    input_paths
        .par_iter()
        .map(|path| {
            compress_image(path.clone(), options.clone())
                .unwrap_or_else(|e| CompressionResult {
                    success: false,
                    output_path: None,
                    error: Some(e),
                    original_size: 0,
                    new_size: 0,
                    savings_percent: 0.0,
                })
        })
        .collect()
}

#[tauri::command]
fn check_path_exists(path: String) -> bool {
    Path::new(&path).exists()
}

// ==================== BEAUTIFY STRUCTS ====================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BeautifyOptions {
    pub brightness: i32,       // -100 to +100
    pub contrast: f32,         // -100 to +100
    pub saturation: f32,       // -100 to +100
    pub sharpness: f32,        // -100 to +100
    pub exposure: f32,         // -100 to +100
    pub hue_shift: i32,        // -180 to +180
    pub temperature: i32,      // -100 to +100
    pub white_balance: String, // "auto", "daylight", "cloudy", "tungsten", "fluorescent"
    pub output_dir: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BeautifyResult {
    pub success: bool,
    pub input_path: String,
    pub output_path: Option<String>,
    pub error: Option<String>,
    pub original_size: u64,
    pub new_size: u64,
}

// ==================== BEAUTIFY HELPER FUNCTIONS ====================

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
        let t = if t < 0.0 { t + 1.0 } else if t > 1.0 { t - 1.0 } else { t };
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

/// Apply contrast adjustment
fn apply_contrast(img: &mut DynamicImage, contrast: f32) {
    if contrast == 0.0 {
        return;
    }
    let factor = (100.0 + contrast) / 100.0;
    let factor = factor * factor; // Make it more responsive

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

/// Apply saturation adjustment
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

/// Apply exposure adjustment (gamma correction)
fn apply_exposure(img: &mut DynamicImage, exposure: f32) {
    if exposure == 0.0 {
        return;
    }
    // Map -100..100 to gamma 0.5..2.0
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

/// Apply hue shift
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

/// Apply color temperature adjustment
fn apply_temperature(img: &mut DynamicImage, temperature: i32) {
    if temperature == 0 {
        return;
    }
    // Warm (positive): increase red, decrease blue
    // Cool (negative): increase blue, decrease red
    let temp_factor = temperature as f32 / 100.0;

    if let Some(rgba) = img.as_mut_rgba8() {
        for pixel in rgba.pixels_mut() {
            let r = pixel[0] as f32;
            let b = pixel[2] as f32;

            if temp_factor > 0.0 {
                // Warm
                pixel[0] = (r + (255.0 - r) * temp_factor * 0.3).clamp(0.0, 255.0) as u8;
                pixel[2] = (b - b * temp_factor * 0.3).clamp(0.0, 255.0) as u8;
            } else {
                // Cool
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

/// Apply white balance preset
fn apply_white_balance(img: &mut DynamicImage, preset: &str) {
    // White balance multipliers for different presets
    let (r_mult, g_mult, b_mult) = match preset {
        "daylight" => (1.0, 1.0, 1.0),       // Neutral
        "cloudy" => (1.05, 1.0, 0.95),       // Slightly warm
        "tungsten" => (0.9, 0.95, 1.15),     // Cool (compensate for warm light)
        "fluorescent" => (0.95, 1.05, 1.0),  // Slight green compensation
        "auto" => {
            // Simple auto white balance: gray world assumption
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

            let r_m = if avg_r > 0.0 { (avg_gray / avg_r).clamp(0.5, 2.0) } else { 1.0 };
            let g_m = if avg_g > 0.0 { (avg_gray / avg_g).clamp(0.5, 2.0) } else { 1.0 };
            let b_m = if avg_b > 0.0 { (avg_gray / avg_b).clamp(0.5, 2.0) } else { 1.0 };

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

/// Apply sharpening using unsharp mask
fn apply_sharpness(img: &DynamicImage, sharpness: f32) -> DynamicImage {
    if sharpness == 0.0 {
        return img.clone();
    }

    // Amount: positive sharpens, negative blurs
    let amount = sharpness / 100.0;

    if amount < 0.0 {
        // Blur
        let sigma = (-amount * 3.0).max(0.1);
        return img.blur(sigma);
    }

    // Sharpen using unsharp mask: result = original + amount * (original - blurred)
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

// ==================== BEAUTIFY COMMANDS ====================

#[tauri::command]
fn beautify_image(input_path: String, options: BeautifyOptions) -> Result<BeautifyResult, String> {
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
    // 1. White balance first (affects overall color)
    apply_white_balance(&mut img, &options.white_balance);

    // 2. Exposure (affects brightness range)
    apply_exposure(&mut img, options.exposure);

    // 3. Brightness (image crate has built-in)
    if options.brightness != 0 {
        img = img.brighten(options.brightness);
    }

    // 4. Contrast
    apply_contrast(&mut img, options.contrast);

    // 5. Saturation
    apply_saturation(&mut img, options.saturation);

    // 6. Hue shift
    apply_hue_shift(&mut img, options.hue_shift);

    // 7. Temperature
    apply_temperature(&mut img, options.temperature);

    // 8. Sharpness (last, after color adjustments)
    img = apply_sharpness(&img, options.sharpness);

    // Determine output path
    let output_dir = options
        .output_dir
        .clone()
        .map(|d| Path::new(&d).to_path_buf())
        .unwrap_or_else(|| input.parent().unwrap_or(Path::new(".")).to_path_buf());

    let stem = input.file_stem().and_then(|s| s.to_str()).unwrap_or("output");
    let output_path = output_dir.join(format!("{}_beautified.{}", stem, format_str));

    // Save with appropriate encoder
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
fn beautify_images_batch(
    input_paths: Vec<String>,
    options: BeautifyOptions,
) -> Vec<BeautifyResult> {
    input_paths
        .par_iter()
        .map(|path| {
            beautify_image(path.clone(), options.clone())
                .unwrap_or_else(|e| BeautifyResult {
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

#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
    let path = Path::new(&path);
    if !path.exists() {
        return Err("Folder does not exist".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    Ok(())
}

/// Reveal a file in its parent folder (select it in explorer)
#[tauri::command]
fn reveal_file(path: String) -> Result<(), String> {
    let path = Path::new(&path);
    if !path.exists() {
        return Err("File does not exist".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .args(["/select,", &path.to_string_lossy()])
            .spawn()
            .map_err(|e| format!("Failed to reveal file: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", &path.to_string_lossy()])
            .spawn()
            .map_err(|e| format!("Failed to reveal file: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        // On Linux, we open the parent folder (no universal "select file" support)
        if let Some(parent) = path.parent() {
            std::process::Command::new("xdg-open")
                .arg(parent)
                .spawn()
                .map_err(|e| format!("Failed to reveal file: {}", e))?;
        }
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            load_image_info,
            load_images_batch,
            get_image_preview,
            convert_image,
            convert_images_batch,
            compress_image,
            compress_images_batch,
            beautify_image,
            beautify_images_batch,
            get_supported_formats,
            check_path_exists,
            open_folder,
            reveal_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
