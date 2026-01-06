use image::{DynamicImage, GenericImageView, ImageReader};
use rayon::prelude::*;
use std::path::Path;

use crate::types::{CompressionOptions, CompressionResult};
use crate::utils::detect_format;

/// Compress PNG using oxipng for maximum compression
pub fn compress_png_oxipng(input_data: &[u8], quality: u8) -> Result<Vec<u8>, String> {
    use oxipng::Options;

    let opt_level = if quality >= 90 {
        1
    } else if quality >= 70 {
        2
    } else if quality >= 50 {
        4
    } else {
        6
    };

    let mut options = Options::from_preset(opt_level);
    options.strip = oxipng::StripChunks::Safe;

    // Use lossy compression for quality <= 85 (covers "balanced" mode at 80)
    if quality <= 85 {
        return compress_png_lossy(input_data, quality);
    }

    let result = oxipng::optimize_from_memory(input_data, &options)
        .map_err(|e| format!("PNG optimization failed: {}", e))?;

    Ok(result)
}

/// Lossy PNG compression using color quantization with exoquant
fn compress_png_lossy(input_data: &[u8], quality: u8) -> Result<Vec<u8>, String> {
    use exoquant::{ditherer, optimizer, Color, Histogram, Quantizer, Remapper, SimpleColorSpace};
    use exoquant::optimizer::Optimizer;

    let img =
        image::load_from_memory(input_data).map_err(|e| format!("Failed to decode PNG: {}", e))?;

    let rgba = img.to_rgba8();
    let (width, height) = (rgba.width() as usize, rgba.height() as usize);

    let pixels: Vec<Color> = rgba
        .pixels()
        .map(|p| Color::new(p[0], p[1], p[2], p[3]))
        .collect();

    let num_colors = if quality >= 90 {
        256
    } else if quality >= 70 {
        192
    } else if quality >= 50 {
        128
    } else if quality >= 30 {
        64
    } else {
        32
    };

    let histogram: Histogram = pixels.iter().cloned().collect();
    let colorspace = SimpleColorSpace::default();
    let mut quantizer = Quantizer::new(&histogram, &colorspace);

    while quantizer.num_colors() < num_colors {
        quantizer.step();
    }

    let palette = quantizer.colors(&colorspace);
    let optimizer = optimizer::KMeans;
    let palette = optimizer.optimize_palette(&colorspace, &palette, &histogram, 4);

    let ditherer = ditherer::FloydSteinberg::new();
    let remapper = Remapper::new(&palette, &colorspace, &ditherer);
    let indexed_pixels: Vec<u8> = remapper.remap(&pixels, width);

    let mut output = Vec::new();
    {
        use std::io::Cursor;

        let mut cursor = Cursor::new(&mut output);

        let mut encoder = png::Encoder::new(&mut cursor, width as u32, height as u32);
        encoder.set_color(png::ColorType::Indexed);
        encoder.set_depth(png::BitDepth::Eight);
        encoder.set_compression(png::Compression::Best);

        let png_palette: Vec<u8> = palette.iter().flat_map(|c| [c.r, c.g, c.b]).collect();
        encoder.set_palette(png_palette);

        let trns: Vec<u8> = palette.iter().map(|c| c.a).collect();
        if trns.iter().any(|&a| a < 255) {
            encoder.set_trns(trns);
        }

        let mut writer = encoder
            .write_header()
            .map_err(|e| format!("Failed to write PNG header: {}", e))?;

        writer
            .write_image_data(&indexed_pixels)
            .map_err(|e| format!("Failed to write PNG data: {}", e))?;
    }

    Ok(output)
}

/// Compress JPEG using mozjpeg for better compression
pub fn compress_jpeg_mozjpeg(img: &DynamicImage, quality: u8) -> Result<Vec<u8>, String> {
    use mozjpeg::{ColorSpace, Compress, ScanMode};

    let rgb = img.to_rgb8();
    let (width, height) = img.dimensions();

    let mut comp = Compress::new(ColorSpace::JCS_RGB);
    comp.set_size(width as usize, height as usize);
    comp.set_quality(quality as f32);
    comp.set_scan_optimization_mode(ScanMode::AllComponentsTogether);
    comp.set_optimize_scans(true);

    let mut comp = comp
        .start_compress(Vec::new())
        .map_err(|e| format!("Failed to start JPEG compression: {:?}", e))?;

    comp.write_scanlines(rgb.as_raw())
        .map_err(|e| format!("Failed to write scanlines: {:?}", e))?;

    let result = comp
        .finish()
        .map_err(|e| format!("Failed to finish JPEG compression: {:?}", e))?;

    Ok(result)
}

/// Compress WebP with quality settings
pub fn compress_webp(img: &DynamicImage, quality: u8) -> Result<Vec<u8>, String> {
    use webp::Encoder;

    let encoder = Encoder::from_image(img).map_err(|e| format!("WebP encoder error: {}", e))?;

    let result = if quality >= 100 {
        encoder.encode_lossless()
    } else {
        encoder.encode(quality as f32)
    };

    Ok(result.to_vec())
}

/// Compress GIF using color reduction
fn compress_gif(input_data: &[u8], quality: u8) -> Result<Vec<u8>, String> {
    use exoquant::{ditherer, optimizer, Color, Histogram, Quantizer, Remapper, SimpleColorSpace};
    use exoquant::optimizer::Optimizer;

    let img = image::load_from_memory(input_data)
        .map_err(|e| format!("Failed to decode GIF: {}", e))?;

    let rgba = img.to_rgba8();
    let (width, height) = (rgba.width() as usize, rgba.height() as usize);

    let pixels: Vec<Color> = rgba
        .pixels()
        .map(|p| Color::new(p[0], p[1], p[2], p[3]))
        .collect();

    // GIF is limited to 256 colors max, reduce based on quality
    let num_colors = if quality >= 90 {
        256
    } else if quality >= 70 {
        192
    } else if quality >= 50 {
        128
    } else if quality >= 30 {
        64
    } else {
        32
    };

    let histogram: Histogram = pixels.iter().cloned().collect();
    let colorspace = SimpleColorSpace::default();
    let mut quantizer = Quantizer::new(&histogram, &colorspace);

    while quantizer.num_colors() < num_colors {
        quantizer.step();
    }

    let palette = quantizer.colors(&colorspace);
    let optimizer = optimizer::KMeans;
    let palette = optimizer.optimize_palette(&colorspace, &palette, &histogram, 4);

    let ditherer = ditherer::FloydSteinberg::new();
    let remapper = Remapper::new(&palette, &colorspace, &ditherer);
    let indexed_pixels: Vec<u8> = remapper.remap(&pixels, width);

    // Encode as GIF
    let mut output = Vec::new();
    {
        let mut encoder = gif::Encoder::new(&mut output, width as u16, height as u16, &[])
            .map_err(|e| format!("Failed to create GIF encoder: {}", e))?;

        // Build palette in RGB format for GIF
        let gif_palette: Vec<u8> = palette.iter().flat_map(|c| [c.r, c.g, c.b]).collect();

        let mut frame = gif::Frame::default();
        frame.width = width as u16;
        frame.height = height as u16;
        frame.palette = Some(gif_palette);
        frame.buffer = std::borrow::Cow::Borrowed(&indexed_pixels);

        encoder.write_frame(&frame)
            .map_err(|e| format!("Failed to write GIF frame: {}", e))?;
    }

    Ok(output)
}

/// Compress BMP by converting to optimized PNG (BMP is uncompressed)
fn compress_bmp(img: &DynamicImage, quality: u8) -> Result<Vec<u8>, String> {
    use std::io::Cursor;

    // Convert BMP to PNG with compression
    let rgba = img.to_rgba8();
    let (width, height) = (rgba.width() as usize, rgba.height() as usize);

    let pixels: Vec<exoquant::Color> = rgba
        .pixels()
        .map(|p| exoquant::Color::new(p[0], p[1], p[2], p[3]))
        .collect();

    let num_colors = if quality >= 90 {
        256
    } else if quality >= 70 {
        192
    } else if quality >= 50 {
        128
    } else if quality >= 30 {
        64
    } else {
        32
    };

    let histogram: exoquant::Histogram = pixels.iter().cloned().collect();
    let colorspace = exoquant::SimpleColorSpace::default();
    let mut quantizer = exoquant::Quantizer::new(&histogram, &colorspace);

    while quantizer.num_colors() < num_colors {
        quantizer.step();
    }

    let palette = quantizer.colors(&colorspace);
    let optimizer = exoquant::optimizer::KMeans;
    let palette = exoquant::optimizer::Optimizer::optimize_palette(&optimizer, &colorspace, &palette, &histogram, 4);

    let ditherer = exoquant::ditherer::FloydSteinberg::new();
    let remapper = exoquant::Remapper::new(&palette, &colorspace, &ditherer);
    let indexed_pixels: Vec<u8> = remapper.remap(&pixels, width);

    let mut output = Vec::new();
    {
        let mut cursor = Cursor::new(&mut output);

        let mut encoder = png::Encoder::new(&mut cursor, width as u32, height as u32);
        encoder.set_color(png::ColorType::Indexed);
        encoder.set_depth(png::BitDepth::Eight);
        encoder.set_compression(png::Compression::Best);

        let png_palette: Vec<u8> = palette.iter().flat_map(|c| [c.r, c.g, c.b]).collect();
        encoder.set_palette(png_palette);

        let trns: Vec<u8> = palette.iter().map(|c| c.a).collect();
        if trns.iter().any(|&a| a < 255) {
            encoder.set_trns(trns);
        }

        let mut writer = encoder
            .write_header()
            .map_err(|e| format!("Failed to write PNG header: {}", e))?;

        writer
            .write_image_data(&indexed_pixels)
            .map_err(|e| format!("Failed to write PNG data: {}", e))?;
    }

    Ok(output)
}

/// Compress TIFF by converting to optimized PNG (TIFF is often uncompressed)
fn compress_tiff(img: &DynamicImage, quality: u8) -> Result<Vec<u8>, String> {
    // Use same logic as BMP - convert to compressed PNG
    compress_bmp(img, quality)
}

fn compress_image_sync(
    input_path: String,
    options: CompressionOptions,
) -> Result<CompressionResult, String> {
    let input = Path::new(&input_path);
    let original_data =
        std::fs::read(&input_path).map_err(|e| format!("Failed to read file: {}", e))?;
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

    let stem = input
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");

    // Determine output format and extension
    // BMP and TIFF convert to PNG for compression (they're uncompressed formats)
    let (output_data, output_extension) = match format_str.as_str() {
        "png" => (compress_png_oxipng(&original_data, options.quality)?, "png"),
        "jpg" | "jpeg" => (compress_jpeg_mozjpeg(&img, options.quality)?, &format_str as &str),
        "webp" => (compress_webp(&img, options.quality)?, "webp"),
        "gif" => (compress_gif(&original_data, options.quality)?, "gif"),
        "bmp" => (compress_bmp(&img, options.quality)?, "png"),
        "tiff" | "tif" => (compress_tiff(&img, options.quality)?, "png"),
        _ => (original_data.clone(), &format_str as &str),
    };

    let output_path = output_dir.join(format!("{}_compressed.{}", stem, output_extension));

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
pub async fn compress_image(
    input_path: String,
    options: CompressionOptions,
) -> Result<CompressionResult, String> {
    compress_image_sync(input_path, options)
}

#[tauri::command]
pub async fn compress_images_batch(
    input_paths: Vec<String>,
    options: CompressionOptions,
) -> Vec<CompressionResult> {
    input_paths
        .par_iter()
        .map(|path| {
            compress_image_sync(path.clone(), options.clone()).unwrap_or_else(|e| {
                CompressionResult {
                    success: false,
                    output_path: None,
                    error: Some(e),
                    original_size: 0,
                    new_size: 0,
                    savings_percent: 0.0,
                }
            })
        })
        .collect()
}
