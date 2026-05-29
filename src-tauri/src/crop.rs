use image::{DynamicImage, GenericImageView, ImageFormat, ImageReader};
use rayon::prelude::*;
use std::io::Cursor;
use std::path::{Path, PathBuf};

use crate::compress::{compress_jpeg_mozjpeg, compress_webp};
use crate::types::{CropOptions, CropResult, PipelineCropParams};
use crate::utils::{detect_format, get_format_from_string, resolve_output_dir, unique_output_path};

/// Clamp the requested rectangle into the actual image bounds. Returns the
/// usable rect (x, y, w, h) or None if the rect is degenerate (zero area
/// or starts past the image edges).
fn clamp_rect(img_w: u32, img_h: u32, params: &PipelineCropParams) -> Option<(u32, u32, u32, u32)> {
    if params.width == 0 || params.height == 0 {
        return None;
    }
    if params.x >= img_w || params.y >= img_h {
        return None;
    }
    let max_w = img_w.saturating_sub(params.x);
    let max_h = img_h.saturating_sub(params.y);
    let w = params.width.min(max_w);
    let h = params.height.min(max_h);
    if w == 0 || h == 0 {
        return None;
    }
    Some((params.x, params.y, w, h))
}

/// Pure transform: crop the image to the given rectangle. If the rectangle is
/// invalid for this image we return the source untouched — the caller already
/// decided crop should apply, so a zero-size or out-of-bounds rect is a soft
/// failure, not a hard one.
pub fn apply_crop(img: DynamicImage, params: &PipelineCropParams) -> DynamicImage {
    let (w, h) = img.dimensions();
    match clamp_rect(w, h, params) {
        Some((x, y, cw, ch)) => img.crop_imm(x, y, cw, ch),
        None => img,
    }
}

fn crop_image_sync(
    input_path: String,
    options: &CropOptions,
    output_dir: &PathBuf,
) -> Result<CropResult, String> {
    let input = Path::new(&input_path);
    let original_size = std::fs::metadata(&input_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let format_str = detect_format(input).unwrap_or_else(|| "png".to_string());

    let img = ImageReader::open(&input_path)
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;

    let params = PipelineCropParams {
        x: options.x,
        y: options.y,
        width: options.width,
        height: options.height,
    };
    let img = apply_crop(img, &params);

    let stem = input
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let output_path = unique_output_path(output_dir, stem, "cropped", &format_str);

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

    Ok(CropResult {
        success: true,
        input_path,
        output_path: Some(output_path.to_string_lossy().to_string()),
        error: None,
        original_size,
        new_size,
    })
}

#[tauri::command]
pub async fn crop_image(
    input_path: String,
    options: CropOptions,
) -> Result<CropResult, String> {
    let input = Path::new(&input_path);
    let output_dir = resolve_output_dir(&options.output_dir, input);
    crop_image_sync(input_path, &options, &output_dir)
}

#[tauri::command]
pub async fn crop_images_batch(
    input_paths: Vec<String>,
    options: CropOptions,
) -> Vec<CropResult> {
    input_paths
        .par_iter()
        .map(|path| {
            let input = Path::new(path);
            let output_dir = resolve_output_dir(&options.output_dir, input);
            crop_image_sync(path.clone(), &options, &output_dir).unwrap_or_else(|e| CropResult {
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
