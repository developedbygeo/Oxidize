use image::{ImageFormat, ImageReader};
use rayon::prelude::*;
use std::io::Cursor;
use std::path::Path;

use crate::compress::{compress_jpeg_mozjpeg, compress_png_oxipng, compress_webp};
use crate::types::{ConversionOptions, ConversionResult};
use crate::utils::{get_format_extension, get_format_from_string};

fn convert_image_sync(
    input_path: String,
    options: ConversionOptions,
) -> Result<ConversionResult, String> {
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

    let stem = input
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let extension = get_format_extension(&target_format);
    let output_path = output_dir.join(format!("{}_converted.{}", stem, extension));

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
pub async fn convert_image(
    input_path: String,
    options: ConversionOptions,
) -> Result<ConversionResult, String> {
    convert_image_sync(input_path, options)
}

#[tauri::command]
pub async fn convert_images_batch(
    input_paths: Vec<String>,
    options: ConversionOptions,
) -> Vec<ConversionResult> {
    input_paths
        .par_iter()
        .map(|path| {
            convert_image_sync(
                path.clone(),
                ConversionOptions {
                    format: options.format.clone(),
                    quality: options.quality,
                    output_dir: options.output_dir.clone(),
                },
            )
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
