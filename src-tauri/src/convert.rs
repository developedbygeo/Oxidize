use image::{DynamicImage, ImageFormat, ImageReader};
use std::io::Cursor;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

use crate::compress::{compress_jpeg_mozjpeg, compress_png_oxipng, compress_webp};
use crate::image_jobs::run_image_batch;
use crate::types::{ConversionOptions, ConversionResult};
use crate::utils::{
    get_format_extension, get_format_from_string, resolve_output_dir, unique_output_path,
};

/// Pure transform: encode a DynamicImage into bytes at the requested format/quality.
pub fn encode_image(
    img: &DynamicImage,
    target_format: ImageFormat,
    quality: u8,
) -> Result<Vec<u8>, String> {
    match target_format {
        ImageFormat::Jpeg => compress_jpeg_mozjpeg(img, quality),
        ImageFormat::WebP => compress_webp(img, quality),
        ImageFormat::Png => {
            let mut buffer = Cursor::new(Vec::new());
            img.write_to(&mut buffer, ImageFormat::Png)
                .map_err(|e| e.to_string())?;
            let png_data = buffer.into_inner();
            compress_png_oxipng(&png_data, quality)
        }
        _ => {
            let mut buffer = Cursor::new(Vec::new());
            img.write_to(&mut buffer, target_format)
                .map_err(|e| e.to_string())?;
            Ok(buffer.into_inner())
        }
    }
}

fn convert_image_sync(
    input_path: String,
    options: &ConversionOptions,
    output_dir: &PathBuf,
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

    let stem = input
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let extension = get_format_extension(&target_format);
    let output_path = unique_output_path(output_dir, stem, "converted", extension);

    let output_data = encode_image(&img, target_format, options.quality)?;
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
    let input = Path::new(&input_path);
    let output_dir = resolve_output_dir(&options.output_dir, input);
    convert_image_sync(input_path, &options, &output_dir)
}

#[tauri::command]
pub async fn convert_images_batch(
    app: AppHandle,
    input_paths: Vec<String>,
    options: ConversionOptions,
) -> Vec<ConversionResult> {
    run_image_batch(
        &app,
        input_paths,
        |path| {
            let input = Path::new(path);
            let output_dir = resolve_output_dir(&options.output_dir, input);
            convert_image_sync(path.to_string(), &options, &output_dir).unwrap_or_else(|e| {
                ConversionResult {
                    success: false,
                    output_path: None,
                    error: Some(e),
                    original_size: 0,
                    new_size: 0,
                }
            })
        },
        |_path| ConversionResult {
            success: false,
            output_path: None,
            error: Some("cancelled".into()),
            original_size: 0,
            new_size: 0,
        },
    )
}
