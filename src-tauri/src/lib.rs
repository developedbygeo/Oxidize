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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            load_image_info,
            load_images_batch,
            convert_image,
            convert_images_batch,
            compress_image,
            compress_images_batch,
            get_supported_formats,
            check_path_exists,
            open_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
