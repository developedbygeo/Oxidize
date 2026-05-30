use image::{imageops::FilterType, DynamicImage, GenericImageView, ImageFormat, ImageReader};
use std::io::Cursor;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

use crate::compress::{compress_jpeg_mozjpeg, compress_webp};
use crate::image_jobs::run_image_batch;
use crate::types::{FitMode, ResizeOptions, ResizeResult};
use crate::utils::{
    detect_format, get_format_from_string, resolve_output_dir, resolve_output_path, ResolvedPath,
    TemplateContext,
};

/// Lanczos3 is the standard photographic default — better than triangle/bilinear
/// for downscales, slower but acceptable for batch use. We don't expose this as
/// an option in v1; if users start asking for nearest-neighbour for pixel art
/// we'll add it then.
const RESIZE_FILTER: FilterType = FilterType::Lanczos3;

/// Resolve the user's requested dimensions against the source's actual size.
/// Returns `Some((target_width, target_height))` or `None` when the request
/// would be a no-op (no dimensions specified, or both equal source).
pub fn resolved_dimensions(
    src_w: u32,
    src_h: u32,
    requested_w: Option<u32>,
    requested_h: Option<u32>,
) -> Option<(u32, u32)> {
    if src_w == 0 || src_h == 0 {
        return None;
    }
    let (w, h) = match (requested_w, requested_h) {
        // Both set — caller chose explicit dimensions.
        (Some(w), Some(h)) if w > 0 && h > 0 => (w, h),
        // Width-only — derive height from source aspect ratio.
        (Some(w), None) | (Some(w), Some(0)) if w > 0 => {
            let h = ((w as u64 * src_h as u64) / src_w as u64).max(1) as u32;
            (w, h)
        }
        // Height-only — derive width from source aspect ratio.
        (None, Some(h)) | (Some(0), Some(h)) if h > 0 => {
            let w = ((h as u64 * src_w as u64) / src_h as u64).max(1) as u32;
            (w, h)
        }
        // Nothing usable, or both zero.
        _ => return None,
    };
    if w == src_w && h == src_h {
        return None;
    }
    Some((w, h))
}

/// Pure transform: resize `img` per `options`. When the request is a no-op
/// (matches source dimensions, or no dimensions specified) returns the source
/// untouched so callers can short-circuit the encode.
pub fn apply_resize(img: DynamicImage, options: &ResizeOptions) -> DynamicImage {
    let (src_w, src_h) = img.dimensions();
    let Some((target_w, target_h)) = resolved_dimensions(src_w, src_h, options.width, options.height)
    else {
        return img;
    };

    // Single-dimension requests always preserve aspect ratio — `fit` has no
    // effect, since the other dimension was derived from the source AR.
    let single_axis = options.width.is_none() || options.height.is_none()
        || options.width == Some(0)
        || options.height == Some(0);
    if single_axis {
        return img.resize_exact(target_w, target_h, RESIZE_FILTER);
    }

    match options.fit {
        FitMode::Stretch => img.resize_exact(target_w, target_h, RESIZE_FILTER),
        FitMode::Contain => {
            // image::resize fits inside the box preserving AR — exactly what
            // we want. Output dimensions will be ≤ target on both axes.
            img.resize(target_w, target_h, RESIZE_FILTER)
        }
        FitMode::Cover => {
            // Scale by the larger ratio so the image fully covers the target,
            // then centre-crop the overflow.
            let scale_w = target_w as f64 / src_w as f64;
            let scale_h = target_h as f64 / src_h as f64;
            let scale = scale_w.max(scale_h);
            let scaled_w = (src_w as f64 * scale).round().max(target_w as f64) as u32;
            let scaled_h = (src_h as f64 * scale).round().max(target_h as f64) as u32;
            let scaled = img.resize_exact(scaled_w, scaled_h, RESIZE_FILTER);
            let crop_x = scaled_w.saturating_sub(target_w) / 2;
            let crop_y = scaled_h.saturating_sub(target_h) / 2;
            scaled.crop_imm(crop_x, crop_y, target_w, target_h)
        }
    }
}

fn resize_image_sync(
    input_path: String,
    options: &ResizeOptions,
    output_dir: &PathBuf,
) -> Result<ResizeResult, String> {
    let input = Path::new(&input_path);
    let original_size = std::fs::metadata(&input_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let format_str = detect_format(input).unwrap_or_else(|| "png".to_string());

    let img = ImageReader::open(&input_path)
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;

    let img = apply_resize(img, options);

    let stem = input
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let (width, height) = img.dimensions();
    let naming = options.naming.clone().unwrap_or_default();
    let ctx = TemplateContext {
        name: stem,
        op: "resized",
        width: Some(width),
        height: Some(height),
    };
    let output_path = match resolve_output_path(output_dir, &naming, &ctx, &format_str) {
        ResolvedPath::Write(p) => p,
        ResolvedPath::Skip(p) => {
            return Ok(ResizeResult {
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

    Ok(ResizeResult {
        success: true,
        input_path,
        output_path: Some(output_path.to_string_lossy().to_string()),
        error: None,
        original_size,
        new_size,
    })
}

#[tauri::command]
pub async fn resize_image(
    input_path: String,
    options: ResizeOptions,
) -> Result<ResizeResult, String> {
    let input = Path::new(&input_path);
    let output_dir = resolve_output_dir(&options.output_dir, input);
    resize_image_sync(input_path, &options, &output_dir)
}

#[tauri::command]
pub async fn resize_images_batch(
    app: AppHandle,
    input_paths: Vec<String>,
    options: ResizeOptions,
) -> Vec<ResizeResult> {
    run_image_batch(
        &app,
        input_paths,
        |path| {
            let input = Path::new(path);
            let output_dir = resolve_output_dir(&options.output_dir, input);
            resize_image_sync(path.to_string(), &options, &output_dir).unwrap_or_else(|e| {
                ResizeResult {
                    success: false,
                    input_path: path.to_string(),
                    output_path: None,
                    error: Some(e),
                    original_size: 0,
                    new_size: 0,
                }
            })
        },
        |path| ResizeResult {
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

    fn make_image(w: u32, h: u32) -> DynamicImage {
        DynamicImage::ImageRgba8(RgbaImage::from_pixel(w, h, Rgba([100, 150, 200, 255])))
    }

    fn opts(width: Option<u32>, height: Option<u32>, fit: FitMode) -> ResizeOptions {
        ResizeOptions {
            width,
            height,
            fit,
            output_dir: None,
            naming: None,
        }
    }

    // ──────────────── resolved_dimensions ────────────────

    #[test]
    fn resolved_returns_none_for_zero_source() {
        assert!(resolved_dimensions(0, 100, Some(50), None).is_none());
        assert!(resolved_dimensions(100, 0, None, Some(50)).is_none());
    }

    #[test]
    fn resolved_returns_none_when_no_dimensions_requested() {
        assert!(resolved_dimensions(100, 100, None, None).is_none());
    }

    #[test]
    fn resolved_returns_none_when_request_matches_source() {
        // Don't waste cycles re-encoding for a no-op resize.
        assert!(resolved_dimensions(100, 100, Some(100), Some(100)).is_none());
    }

    #[test]
    fn resolved_derives_height_from_width_for_single_axis_request() {
        // 200×100 source, request width=100 → height must be 50 (1:2 AR preserved).
        assert_eq!(resolved_dimensions(200, 100, Some(100), None), Some((100, 50)));
    }

    #[test]
    fn resolved_derives_width_from_height_for_single_axis_request() {
        assert_eq!(resolved_dimensions(200, 100, None, Some(50)), Some((100, 50)));
    }

    #[test]
    fn resolved_treats_zero_dimension_as_missing() {
        // Some clients send 0 to mean "auto". Behave the same as None.
        assert_eq!(resolved_dimensions(200, 100, Some(100), Some(0)), Some((100, 50)));
        assert_eq!(resolved_dimensions(200, 100, Some(0), Some(50)), Some((100, 50)));
    }

    #[test]
    fn resolved_uses_both_when_both_are_set() {
        assert_eq!(resolved_dimensions(200, 100, Some(80), Some(80)), Some((80, 80)));
    }

    #[test]
    fn resolved_aspect_derivation_never_returns_zero_dimension() {
        // Tiny target on a wide source — derived height could mathematically be
        // 0 (200x100, width=1 → height=0.5 → 0). We clamp up to 1 so we never
        // produce a zero-pixel image.
        assert_eq!(resolved_dimensions(200, 100, Some(1), None), Some((1, 1)));
    }

    // ──────────────── apply_resize ────────────────

    #[test]
    fn noop_request_returns_image_with_same_dimensions() {
        let src = make_image(50, 50);
        let out = apply_resize(src, &opts(None, None, FitMode::Cover));
        assert_eq!(out.dimensions(), (50, 50));
    }

    #[test]
    fn width_only_preserves_aspect_ratio() {
        // 400×200 source, target width 200 → output 200×100.
        let src = make_image(400, 200);
        let out = apply_resize(src, &opts(Some(200), None, FitMode::Cover));
        assert_eq!(out.dimensions(), (200, 100));
    }

    #[test]
    fn height_only_preserves_aspect_ratio() {
        let src = make_image(400, 200);
        let out = apply_resize(src, &opts(None, Some(100), FitMode::Cover));
        assert_eq!(out.dimensions(), (200, 100));
    }

    #[test]
    fn stretch_fit_produces_exact_target_even_at_wrong_aspect() {
        // 400×200 (2:1) → 100×100 (1:1). Output ignores AR.
        let src = make_image(400, 200);
        let out = apply_resize(src, &opts(Some(100), Some(100), FitMode::Stretch));
        assert_eq!(out.dimensions(), (100, 100));
    }

    #[test]
    fn contain_fit_keeps_aspect_and_shrinks_inside_target() {
        // 400×200 (2:1) inside 100×100 box → 100×50 (limited by width).
        let src = make_image(400, 200);
        let out = apply_resize(src, &opts(Some(100), Some(100), FitMode::Contain));
        assert_eq!(out.dimensions(), (100, 50));
    }

    #[test]
    fn cover_fit_fills_target_exactly_centre_cropping_overflow() {
        // 400×200 (2:1) into 100×100 (1:1) — Cover scales to fill, then crops.
        // scale = max(100/400, 100/200) = max(0.25, 0.5) = 0.5
        // scaled = (200, 100); crop centred to (100, 100).
        let src = make_image(400, 200);
        let out = apply_resize(src, &opts(Some(100), Some(100), FitMode::Cover));
        assert_eq!(out.dimensions(), (100, 100));
    }

    #[test]
    fn cover_fit_handles_portrait_source_into_landscape_target() {
        // 200×400 portrait → 100×50 landscape target.
        // scale = max(100/200, 50/400) = max(0.5, 0.125) = 0.5
        // scaled = (100, 200); crop to (100, 50).
        let src = make_image(200, 400);
        let out = apply_resize(src, &opts(Some(100), Some(50), FitMode::Cover));
        assert_eq!(out.dimensions(), (100, 50));
    }

    #[test]
    fn cover_fit_handles_perfect_aspect_match_without_overcropping() {
        // Same aspect, smaller — Cover should produce exact target.
        let src = make_image(400, 200);
        let out = apply_resize(src, &opts(Some(200), Some(100), FitMode::Cover));
        assert_eq!(out.dimensions(), (200, 100));
    }
}
