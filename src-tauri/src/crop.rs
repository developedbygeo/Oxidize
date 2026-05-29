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

#[cfg(test)]
mod tests {
    use super::*;
    use image::{DynamicImage, Rgba, RgbaImage};

    fn params(x: u32, y: u32, w: u32, h: u32) -> PipelineCropParams {
        PipelineCropParams {
            x,
            y,
            width: w,
            height: h,
        }
    }

    // ────────────── clamp_rect ──────────────

    #[test]
    fn clamp_returns_none_when_rect_has_zero_area() {
        assert!(clamp_rect(100, 100, &params(0, 0, 0, 50)).is_none());
        assert!(clamp_rect(100, 100, &params(0, 0, 50, 0)).is_none());
    }

    #[test]
    fn clamp_returns_none_when_origin_is_past_the_image_edge() {
        assert!(clamp_rect(100, 100, &params(100, 0, 10, 10)).is_none());
        assert!(clamp_rect(100, 100, &params(0, 200, 10, 10)).is_none());
    }

    #[test]
    fn clamp_returns_full_rect_when_in_bounds() {
        let r = clamp_rect(1000, 800, &params(50, 60, 200, 150));
        assert_eq!(r, Some((50, 60, 200, 150)));
    }

    #[test]
    fn clamp_shrinks_rect_to_fit_image_edges() {
        // 500x500 image, rect at (450,450) wants 100x100 — only 50x50 fits.
        let r = clamp_rect(500, 500, &params(450, 450, 100, 100));
        assert_eq!(r, Some((450, 450, 50, 50)));
    }

    // ────────────── apply_crop ──────────────

    fn solid_image(width: u32, height: u32, color: [u8; 4]) -> DynamicImage {
        DynamicImage::ImageRgba8(RgbaImage::from_pixel(width, height, Rgba(color)))
    }

    #[test]
    fn apply_crop_returns_subimage_for_valid_rect() {
        let img = solid_image(100, 80, [10, 20, 30, 255]);
        let cropped = apply_crop(img, &params(10, 10, 40, 30));
        assert_eq!(cropped.dimensions(), (40, 30));
    }

    #[test]
    fn apply_crop_returns_source_unchanged_for_degenerate_rect() {
        // Zero area is a soft failure — apply_crop returns the source untouched
        // so the pipeline can carry on with the next stage.
        let img = solid_image(50, 50, [99, 99, 99, 255]);
        let result = apply_crop(img, &params(0, 0, 0, 0));
        assert_eq!(result.dimensions(), (50, 50));
    }

    #[test]
    fn apply_crop_returns_source_unchanged_when_origin_past_edges() {
        let img = solid_image(50, 50, [0, 0, 0, 255]);
        let result = apply_crop(img, &params(200, 200, 10, 10));
        assert_eq!(result.dimensions(), (50, 50));
    }

    #[test]
    fn apply_crop_preserves_pixel_data_at_origin() {
        // 4x4 grid where the first row is white and the rest is black.
        let img = DynamicImage::ImageRgba8(RgbaImage::from_fn(4, 4, |_, y| {
            if y == 0 {
                Rgba([255, 255, 255, 255])
            } else {
                Rgba([0, 0, 0, 255])
            }
        }));

        // Crop the top row only — should be 4x1 of white pixels.
        let top = apply_crop(img.clone(), &params(0, 0, 4, 1));
        assert_eq!(top.dimensions(), (4, 1));
        let rgba = top.as_rgba8().expect("rgba buffer present after crop");
        for px in rgba.pixels() {
            assert_eq!(*px, Rgba([255, 255, 255, 255]));
        }

        // Crop the bottom 3 rows — should be 4x3 of black pixels.
        let bottom = apply_crop(img, &params(0, 1, 4, 3));
        assert_eq!(bottom.dimensions(), (4, 3));
        let rgba = bottom.as_rgba8().unwrap();
        for px in rgba.pixels() {
            assert_eq!(*px, Rgba([0, 0, 0, 255]));
        }
    }
}
