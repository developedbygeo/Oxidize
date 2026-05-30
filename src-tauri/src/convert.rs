use image::{DynamicImage, GenericImageView, ImageFormat, ImageReader};
use std::io::Cursor;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

use crate::compress::{compress_jpeg_mozjpeg, compress_png_oxipng, compress_webp};
use crate::image_jobs::run_image_batch;
use crate::types::{ConversionOptions, ConversionResult};
use crate::utils::{
    get_format_extension, get_format_from_string, resolve_output_dir, resolve_output_path,
    ResolvedPath, TemplateContext,
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
            // Convert always rebuilds the PNG from decoded pixels, so any
            // source metadata is already gone by this point. Preservation
            // would have to plumb the original bytes through encode_image,
            // which is out of scope for the current preserve-metadata pass.
            compress_png_oxipng(&png_data, quality, false)
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
    let (width, height) = img.dimensions();
    let naming = options.naming.clone().unwrap_or_default();
    let ctx = TemplateContext {
        name: stem,
        op: "converted",
        width: Some(width),
        height: Some(height),
    };
    let output_path = match resolve_output_path(output_dir, &naming, &ctx, extension) {
        ResolvedPath::Write(p) => p,
        ResolvedPath::Skip(p) => {
            return Ok(ConversionResult {
                success: false,
                output_path: Some(p.to_string_lossy().to_string()),
                error: Some("skipped".to_string()),
                original_size,
                new_size: 0,
            });
        }
    };

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

#[cfg(test)]
mod tests {
    use super::*;
    use image::{Rgba, RgbaImage};

    fn tiny_image() -> DynamicImage {
        // 8x8 is large enough for AVIF's tile machinery to do something
        // meaningful without making the test slow.
        DynamicImage::ImageRgba8(RgbaImage::from_pixel(8, 8, Rgba([200, 100, 50, 255])))
    }

    #[test]
    fn encode_to_avif_produces_a_valid_avif_payload() {
        // Proves the `avif` feature is enabled and the fallback arm of
        // `encode_image` routes AVIF through `image::write_to`.
        //
        // We only check encoding — AVIF decoding requires the `avif-native`
        // feature which pulls in dav1d (a C library) and complicates
        // cross-platform builds. AVIF here is output-only; loading an
        // .avif file as a source will fail at the decode step.
        let img = tiny_image();
        let bytes = encode_image(&img, ImageFormat::Avif, 80)
            .expect("AVIF encoding should succeed when the feature flag is on");
        assert!(!bytes.is_empty(), "encoded AVIF payload must not be empty");

        // AVIF is an ISO-BMFF container — bytes 4..8 spell "ftyp", a
        // version-stable assertion that we produced an ISO-BMFF file
        // without locking to a specific brand (avif / avis / mif1).
        assert!(bytes.len() >= 12, "AVIF header missing");
        assert_eq!(&bytes[4..8], b"ftyp", "expected ISO-BMFF ftyp box header");
    }
}
