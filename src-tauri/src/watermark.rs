use image::{
    imageops::FilterType, DynamicImage, GenericImageView, ImageFormat, ImageReader, RgbaImage,
};
use std::io::Cursor;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::AppHandle;

use crate::compress::{compress_jpeg_mozjpeg, compress_webp};
use crate::image_jobs::run_image_batch;
use crate::types::{WatermarkOptions, WatermarkPosition, WatermarkResult};
use crate::utils::{
    detect_format, get_format_from_string, resolve_output_dir, resolve_output_path, ResolvedPath,
    TemplateContext,
};

const WATERMARK_FILTER: FilterType = FilterType::Lanczos3;

/// Top-left corner where the watermark should be drawn, given the base and
/// watermark dimensions, the grid cell, and a pixel margin. Coordinates may be
/// negative (watermark larger than the base on an axis) — the compositor clips
/// to the visible region, mirroring ffmpeg's `overlay` behaviour.
pub fn position_offset(
    base_w: u32,
    base_h: u32,
    wm_w: u32,
    wm_h: u32,
    position: WatermarkPosition,
    margin: i64,
) -> (i64, i64) {
    let left = margin;
    let center_x = (base_w as i64 - wm_w as i64) / 2;
    let right = base_w as i64 - wm_w as i64 - margin;
    let top = margin;
    let middle_y = (base_h as i64 - wm_h as i64) / 2;
    let bottom = base_h as i64 - wm_h as i64 - margin;

    use WatermarkPosition::*;
    match position {
        TopLeft => (left, top),
        TopCenter => (center_x, top),
        TopRight => (right, top),
        MiddleLeft => (left, middle_y),
        MiddleCenter => (center_x, middle_y),
        MiddleRight => (right, middle_y),
        BottomLeft => (left, bottom),
        BottomCenter => (center_x, bottom),
        BottomRight => (right, bottom),
    }
}

/// Source-over composite of `wm` onto `base` at `(x, y)`, multiplying the
/// watermark's own alpha by `opacity` first. Hand-rolled rather than using
/// `image::imageops::overlay` so partial opacity is honoured uniformly across
/// `image` versions (overlay's alpha handling has shifted between releases).
fn composite(base: &mut RgbaImage, wm: &RgbaImage, x: i64, y: i64, opacity: f32) {
    let (base_w, base_h) = base.dimensions();
    let (wm_w, wm_h) = wm.dimensions();

    for wy in 0..wm_h {
        let by = y + wy as i64;
        if by < 0 || by >= base_h as i64 {
            continue;
        }
        for wx in 0..wm_w {
            let bx = x + wx as i64;
            if bx < 0 || bx >= base_w as i64 {
                continue;
            }
            let top = wm.get_pixel(wx, wy).0;
            let ta = (top[3] as f32 / 255.0) * opacity;
            if ta <= 0.0 {
                continue;
            }
            let bottom = base.get_pixel_mut(bx as u32, by as u32);
            for c in 0..3 {
                let blended = top[c] as f32 * ta + bottom.0[c] as f32 * (1.0 - ta);
                bottom.0[c] = blended.round().clamp(0.0, 255.0) as u8;
            }
            let ba = bottom.0[3] as f32 / 255.0;
            let out_a = ta + ba * (1.0 - ta);
            bottom.0[3] = (out_a * 255.0).round().clamp(0.0, 255.0) as u8;
        }
    }
}

/// Pure transform: overlay `watermark` onto `base` per `options`. Returns the
/// base untouched when the request is a no-op (zero opacity/scale, or a
/// degenerate watermark/base) so callers can still encode a sensible output.
pub fn apply_watermark(
    base: DynamicImage,
    watermark: &DynamicImage,
    options: &WatermarkOptions,
) -> DynamicImage {
    let (base_w, base_h) = base.dimensions();
    let (wm_w, wm_h) = watermark.dimensions();

    let opacity = options.opacity.clamp(0.0, 1.0);
    let scale_pct = options.scale_percent.max(0.0);

    if base_w == 0 || base_h == 0 || wm_w == 0 || wm_h == 0 || opacity <= 0.0 || scale_pct <= 0.0 {
        return base;
    }

    let target_w = ((base_w as f32 * scale_pct / 100.0).round() as u32).max(1);
    let target_h = ((target_w as u64 * wm_h as u64) / wm_w as u64).max(1) as u32;
    let wm_scaled = watermark
        .resize_exact(target_w, target_h, WATERMARK_FILTER)
        .to_rgba8();

    let margin = (base_w as f32 * options.margin_percent.max(0.0) / 100.0).round() as i64;
    let (x, y) = position_offset(base_w, base_h, target_w, target_h, options.position, margin);

    let mut base_rgba = base.to_rgba8();
    composite(&mut base_rgba, &wm_scaled, x, y, opacity);
    DynamicImage::ImageRgba8(base_rgba)
}

fn load_image(path: &str) -> Result<DynamicImage, String> {
    ImageReader::open(path)
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())
}

fn watermark_image_sync(
    input_path: String,
    watermark: &DynamicImage,
    options: &WatermarkOptions,
    output_dir: &PathBuf,
) -> Result<WatermarkResult, String> {
    let input = Path::new(&input_path);
    let original_size = std::fs::metadata(&input_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let format_str = detect_format(input).unwrap_or_else(|| "png".to_string());

    let img = load_image(&input_path)?;
    let img = apply_watermark(img, watermark, options);

    let stem = input
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let (width, height) = img.dimensions();
    let naming = options.naming.clone().unwrap_or_default();
    let ctx = TemplateContext {
        name: stem,
        op: "watermarked",
        width: Some(width),
        height: Some(height),
    };
    let output_path = match resolve_output_path(output_dir, &naming, &ctx, &format_str) {
        ResolvedPath::Write(p) => p,
        ResolvedPath::Skip(p) => {
            return Ok(WatermarkResult {
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

    Ok(WatermarkResult {
        success: true,
        input_path,
        output_path: Some(output_path.to_string_lossy().to_string()),
        error: None,
        original_size,
        new_size,
    })
}

#[tauri::command]
pub async fn watermark_image(
    input_path: String,
    options: WatermarkOptions,
) -> Result<WatermarkResult, String> {
    let watermark = load_image(&options.watermark_path)
        .map_err(|e| format!("Failed to load watermark image: {}", e))?;
    let input = Path::new(&input_path);
    let output_dir = resolve_output_dir(&options.output_dir, input);
    watermark_image_sync(input_path, &watermark, &options, &output_dir)
}

#[tauri::command]
pub async fn watermark_images_batch(
    app: AppHandle,
    input_paths: Vec<String>,
    options: WatermarkOptions,
) -> Vec<WatermarkResult> {
    // Decode the watermark once and share it across the batch — every source
    // composites the same mark, and decoding per-file would be wasteful.
    let watermark = match load_image(&options.watermark_path) {
        Ok(wm) => Arc::new(wm),
        Err(e) => {
            let msg = format!("Failed to load watermark image: {}", e);
            return input_paths
                .into_iter()
                .map(|input_path| WatermarkResult {
                    success: false,
                    input_path,
                    output_path: None,
                    error: Some(msg.clone()),
                    original_size: 0,
                    new_size: 0,
                })
                .collect();
        }
    };

    run_image_batch(
        &app,
        input_paths,
        |path| {
            let input = Path::new(path);
            let output_dir = resolve_output_dir(&options.output_dir, input);
            watermark_image_sync(path.to_string(), &watermark, &options, &output_dir)
                .unwrap_or_else(|e| WatermarkResult {
                    success: false,
                    input_path: path.to_string(),
                    output_path: None,
                    error: Some(e),
                    original_size: 0,
                    new_size: 0,
                })
        },
        |path| WatermarkResult {
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

    fn solid(w: u32, h: u32, px: [u8; 4]) -> DynamicImage {
        DynamicImage::ImageRgba8(RgbaImage::from_pixel(w, h, Rgba(px)))
    }

    fn opts(position: WatermarkPosition, opacity: f32, scale: f32, margin: f32) -> WatermarkOptions {
        WatermarkOptions {
            watermark_path: String::new(),
            position,
            opacity,
            scale_percent: scale,
            margin_percent: margin,
            output_dir: None,
            naming: None,
        }
    }

    // ──────────────── position_offset ────────────────

    #[test]
    fn top_left_uses_margin_for_both_axes() {
        assert_eq!(
            position_offset(100, 100, 20, 10, WatermarkPosition::TopLeft, 5),
            (5, 5)
        );
    }

    #[test]
    fn bottom_right_insets_from_far_edges_by_margin() {
        // x = 100 - 20 - 5 = 75 ; y = 100 - 10 - 5 = 85
        assert_eq!(
            position_offset(100, 100, 20, 10, WatermarkPosition::BottomRight, 5),
            (75, 85)
        );
    }

    #[test]
    fn top_right_anchors_x_to_right_y_to_top() {
        assert_eq!(
            position_offset(100, 100, 20, 10, WatermarkPosition::TopRight, 5),
            (75, 5)
        );
    }

    #[test]
    fn bottom_left_anchors_x_to_left_y_to_bottom() {
        assert_eq!(
            position_offset(100, 100, 20, 10, WatermarkPosition::BottomLeft, 5),
            (5, 85)
        );
    }

    #[test]
    fn middle_center_ignores_margin_and_centres() {
        // x = (100 - 20) / 2 = 40 ; y = (100 - 10) / 2 = 45
        assert_eq!(
            position_offset(100, 100, 20, 10, WatermarkPosition::MiddleCenter, 5),
            (40, 45)
        );
    }

    #[test]
    fn top_center_centres_x_keeps_top_margin() {
        assert_eq!(
            position_offset(100, 100, 20, 10, WatermarkPosition::TopCenter, 5),
            (40, 5)
        );
    }

    #[test]
    fn middle_left_centres_y_keeps_left_margin() {
        assert_eq!(
            position_offset(100, 100, 20, 10, WatermarkPosition::MiddleLeft, 5),
            (5, 45)
        );
    }

    #[test]
    fn oversized_watermark_yields_negative_offset() {
        // 120-wide mark on a 100-wide base, bottom-right → negative x, clipped
        // by the compositor rather than panicking.
        let (x, _) = position_offset(100, 100, 120, 10, WatermarkPosition::BottomRight, 0);
        assert!(x < 0);
    }

    // ──────────────── apply_watermark ────────────────

    #[test]
    fn zero_opacity_returns_base_unchanged() {
        let base = solid(50, 50, [10, 20, 30, 255]);
        let out = apply_watermark(base, &solid(10, 10, [255, 0, 0, 255]), &opts(WatermarkPosition::TopLeft, 0.0, 50.0, 0.0));
        assert_eq!(out.to_rgba8().get_pixel(0, 0).0, [10, 20, 30, 255]);
    }

    #[test]
    fn zero_scale_returns_base_unchanged() {
        let base = solid(50, 50, [10, 20, 30, 255]);
        let out = apply_watermark(base, &solid(10, 10, [255, 0, 0, 255]), &opts(WatermarkPosition::TopLeft, 1.0, 0.0, 0.0));
        assert_eq!(out.to_rgba8().get_pixel(0, 0).0, [10, 20, 30, 255]);
    }

    #[test]
    fn full_opacity_opaque_mark_overwrites_pixels_at_anchor() {
        // 100×100 base, 50%-width opaque red mark at top-left, no margin →
        // a 50×50 red block covering the origin.
        let base = solid(100, 100, [10, 20, 30, 255]);
        let out = apply_watermark(
            base,
            &solid(10, 10, [255, 0, 0, 255]),
            &opts(WatermarkPosition::TopLeft, 1.0, 50.0, 0.0),
        )
        .to_rgba8();
        assert_eq!(out.get_pixel(0, 0).0, [255, 0, 0, 255]);
        assert_eq!(out.get_pixel(49, 49).0, [255, 0, 0, 255]);
        // Outside the mark, the base survives.
        assert_eq!(out.get_pixel(60, 60).0, [10, 20, 30, 255]);
    }

    #[test]
    fn half_opacity_blends_halfway_between_base_and_mark() {
        // Base black, opaque white mark at 50% opacity → mid-grey (≈128).
        let base = solid(20, 20, [0, 0, 0, 255]);
        let out = apply_watermark(
            base,
            &solid(10, 10, [255, 255, 255, 255]),
            &opts(WatermarkPosition::TopLeft, 0.5, 100.0, 0.0),
        )
        .to_rgba8();
        let px = out.get_pixel(0, 0).0;
        assert!((px[0] as i32 - 128).abs() <= 1, "got {}", px[0]);
        assert_eq!(px[3], 255);
    }

    #[test]
    fn transparent_watermark_pixels_leave_base_untouched() {
        // A fully transparent mark contributes nothing even at full opacity.
        let base = solid(20, 20, [42, 42, 42, 255]);
        let out = apply_watermark(
            base,
            &solid(10, 10, [255, 0, 0, 0]),
            &opts(WatermarkPosition::TopLeft, 1.0, 100.0, 0.0),
        )
        .to_rgba8();
        assert_eq!(out.get_pixel(0, 0).0, [42, 42, 42, 255]);
    }

    #[test]
    fn margin_percent_offsets_from_base_width() {
        // 200×200 base, 10%-width mark (20px), bottom-right, 5% margin (10px).
        // anchor x = 200 - 20 - 10 = 170. Pixel just inside that corner is red.
        let base = solid(200, 200, [0, 0, 0, 255]);
        let out = apply_watermark(
            base,
            &solid(10, 10, [255, 0, 0, 255]),
            &opts(WatermarkPosition::BottomRight, 1.0, 10.0, 5.0),
        )
        .to_rgba8();
        assert_eq!(out.get_pixel(175, 185).0, [255, 0, 0, 255]);
        // The margin gap stays as base.
        assert_eq!(out.get_pixel(195, 195).0, [0, 0, 0, 255]);
    }

    #[test]
    fn output_preserves_base_dimensions() {
        let base = solid(123, 77, [5, 5, 5, 255]);
        let out = apply_watermark(
            base,
            &solid(40, 40, [255, 255, 255, 255]),
            &opts(WatermarkPosition::MiddleCenter, 1.0, 30.0, 0.0),
        );
        assert_eq!(out.dimensions(), (123, 77));
    }
}
