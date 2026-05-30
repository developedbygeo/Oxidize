use image::{DynamicImage, GenericImageView, ImageFormat, ImageReader};
use std::io::Cursor;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

use crate::compress::{compress_jpeg_mozjpeg, compress_webp};
use crate::image_jobs::run_image_batch;
use crate::types::{RotateOptions, RotateResult};
use crate::utils::{
    detect_format, get_format_from_string, resolve_output_dir, resolve_output_path, ResolvedPath,
    TemplateContext,
};

/// Pure transform: rotate by 0/90/180/270°, then optionally flip horizontally,
/// then optionally flip vertically. Order is fixed — rotate-then-flip matches
/// the convention every major image editor uses (Photoshop, GIMP, Affinity),
/// so the operations compose predictably from the user's mental model.
///
/// `rotation_degrees` that aren't exactly 0/90/180/270 are treated as 0 (no
/// rotation) — we don't do arbitrary-angle rotation here because that
/// requires interpolation and bbox decisions that don't fit the "fast batch
/// orient" use case this command is built for.
pub fn apply_rotate_flip(
    img: DynamicImage,
    rotation_degrees: u16,
    flip_horizontal: bool,
    flip_vertical: bool,
) -> DynamicImage {
    let rotated = match rotation_degrees {
        90 => img.rotate90(),
        180 => img.rotate180(),
        270 => img.rotate270(),
        _ => img,
    };
    let h_flipped = if flip_horizontal {
        rotated.fliph()
    } else {
        rotated
    };
    if flip_vertical {
        h_flipped.flipv()
    } else {
        h_flipped
    }
}

/// True when the supplied params would leave the image untouched. Lets the
/// caller short-circuit the encode step if nothing would change.
pub fn is_noop(rotation_degrees: u16, flip_horizontal: bool, flip_vertical: bool) -> bool {
    let no_rotation = !matches!(rotation_degrees, 90 | 180 | 270);
    no_rotation && !flip_horizontal && !flip_vertical
}

fn rotate_image_sync(
    input_path: String,
    options: &RotateOptions,
    output_dir: &PathBuf,
) -> Result<RotateResult, String> {
    let input = Path::new(&input_path);
    let original_size = std::fs::metadata(&input_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let format_str = detect_format(input).unwrap_or_else(|| "png".to_string());

    let img = ImageReader::open(&input_path)
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;

    let img = apply_rotate_flip(
        img,
        options.rotation_degrees,
        options.flip_horizontal,
        options.flip_vertical,
    );

    let stem = input
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let (width, height) = img.dimensions();
    let naming = options.naming.clone().unwrap_or_default();
    let ctx = TemplateContext {
        name: stem,
        op: "rotated",
        width: Some(width),
        height: Some(height),
    };
    let output_path = match resolve_output_path(output_dir, &naming, &ctx, &format_str) {
        ResolvedPath::Write(p) => p,
        ResolvedPath::Skip(p) => {
            return Ok(RotateResult {
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

    Ok(RotateResult {
        success: true,
        input_path,
        output_path: Some(output_path.to_string_lossy().to_string()),
        error: None,
        original_size,
        new_size,
    })
}

#[tauri::command]
pub async fn rotate_image(
    input_path: String,
    options: RotateOptions,
) -> Result<RotateResult, String> {
    let input = Path::new(&input_path);
    let output_dir = resolve_output_dir(&options.output_dir, input);
    rotate_image_sync(input_path, &options, &output_dir)
}

#[tauri::command]
pub async fn rotate_images_batch(
    app: AppHandle,
    input_paths: Vec<String>,
    options: RotateOptions,
) -> Vec<RotateResult> {
    run_image_batch(
        &app,
        input_paths,
        |path| {
            let input = Path::new(path);
            let output_dir = resolve_output_dir(&options.output_dir, input);
            rotate_image_sync(path.to_string(), &options, &output_dir).unwrap_or_else(|e| {
                RotateResult {
                    success: false,
                    input_path: path.to_string(),
                    output_path: None,
                    error: Some(e),
                    original_size: 0,
                    new_size: 0,
                }
            })
        },
        |path| RotateResult {
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

    fn checker(w: u32, h: u32) -> DynamicImage {
        // Distinct pixel at (0,0) so we can detect orientation changes.
        DynamicImage::ImageRgba8(RgbaImage::from_fn(w, h, |x, y| {
            if x == 0 && y == 0 {
                Rgba([255, 0, 0, 255]) // red corner = top-left marker
            } else {
                Rgba([10, 20, 30, 255])
            }
        }))
    }

    fn pixel_at(img: &DynamicImage, x: u32, y: u32) -> Rgba<u8> {
        let rgba = img.to_rgba8();
        *rgba.get_pixel(x, y)
    }

    #[test]
    fn is_noop_for_default_params() {
        assert!(is_noop(0, false, false));
    }

    #[test]
    fn is_noop_when_rotation_is_not_a_quarter_turn() {
        // 45 or 1 etc. fall through to no-rotation, so if no flips either it's a no-op.
        assert!(is_noop(45, false, false));
        assert!(is_noop(1, false, false));
        assert!(is_noop(360, false, false));
    }

    #[test]
    fn is_not_noop_when_any_quarter_rotation_is_set() {
        assert!(!is_noop(90, false, false));
        assert!(!is_noop(180, false, false));
        assert!(!is_noop(270, false, false));
    }

    #[test]
    fn is_not_noop_when_either_flip_is_set() {
        assert!(!is_noop(0, true, false));
        assert!(!is_noop(0, false, true));
    }

    #[test]
    fn noop_returns_image_with_same_dimensions_and_corner_pixel() {
        let src = checker(8, 5);
        let out = apply_rotate_flip(src, 0, false, false);
        assert_eq!(out.dimensions(), (8, 5));
        assert_eq!(pixel_at(&out, 0, 0), Rgba([255, 0, 0, 255]));
    }

    #[test]
    fn rotate90_swaps_dimensions_and_moves_corner_to_top_right() {
        // image::rotate90 rotates clockwise — top-left pixel ends up top-right.
        let src = checker(4, 3); // 4 wide, 3 tall
        let out = apply_rotate_flip(src, 90, false, false);
        assert_eq!(out.dimensions(), (3, 4));
        // Top-right of the new image is the original top-left.
        assert_eq!(pixel_at(&out, 2, 0), Rgba([255, 0, 0, 255]));
    }

    #[test]
    fn rotate180_keeps_dimensions_and_moves_corner_to_bottom_right() {
        let src = checker(4, 3);
        let out = apply_rotate_flip(src, 180, false, false);
        assert_eq!(out.dimensions(), (4, 3));
        assert_eq!(pixel_at(&out, 3, 2), Rgba([255, 0, 0, 255]));
    }

    #[test]
    fn rotate270_swaps_dimensions_and_moves_corner_to_bottom_left() {
        let src = checker(4, 3);
        let out = apply_rotate_flip(src, 270, false, false);
        assert_eq!(out.dimensions(), (3, 4));
        assert_eq!(pixel_at(&out, 0, 3), Rgba([255, 0, 0, 255]));
    }

    #[test]
    fn flip_horizontal_moves_corner_to_top_right() {
        let src = checker(4, 3);
        let out = apply_rotate_flip(src, 0, true, false);
        assert_eq!(out.dimensions(), (4, 3));
        assert_eq!(pixel_at(&out, 3, 0), Rgba([255, 0, 0, 255]));
    }

    #[test]
    fn flip_vertical_moves_corner_to_bottom_left() {
        let src = checker(4, 3);
        let out = apply_rotate_flip(src, 0, false, true);
        assert_eq!(out.dimensions(), (4, 3));
        assert_eq!(pixel_at(&out, 0, 2), Rgba([255, 0, 0, 255]));
    }

    #[test]
    fn rotate90_then_flip_horizontal_composes_correctly() {
        // rotate90 sends (0,0) → (2,0) on a 4x3 input (becomes 3x4).
        // fliph then sends (2,0) → (0,0). End result: corner back at (0,0).
        let src = checker(4, 3);
        let out = apply_rotate_flip(src, 90, true, false);
        assert_eq!(out.dimensions(), (3, 4));
        assert_eq!(pixel_at(&out, 0, 0), Rgba([255, 0, 0, 255]));
    }

    #[test]
    fn rotate90_then_flip_vertical_composes_correctly() {
        // rotate90 sends (0,0) → (2,0) on a 4x3 input (becomes 3x4).
        // flipv then sends (2,0) → (2,3). End result: corner at (2,3).
        let src = checker(4, 3);
        let out = apply_rotate_flip(src, 90, false, true);
        assert_eq!(out.dimensions(), (3, 4));
        assert_eq!(pixel_at(&out, 2, 3), Rgba([255, 0, 0, 255]));
    }
}
