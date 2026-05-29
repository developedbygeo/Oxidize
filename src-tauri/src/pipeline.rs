use image::ImageReader;
use rayon::prelude::*;
use std::path::Path;

use crate::beautify::{apply_beautify, beautify_is_noop};
use crate::convert::encode_image;
use crate::crop::apply_crop;
use crate::effects::{apply_pipeline_effect, effect_is_noop};
use crate::types::{PipelineOptions, PipelineResult};
use crate::utils::{
    detect_format, get_format_extension, get_format_from_string, resolve_output_dir,
    unique_output_path,
};

const DEFAULT_QUALITY: u8 = 92;

fn process_pipeline_sync(
    input_path: String,
    options: &PipelineOptions,
) -> Result<PipelineResult, String> {
    let input = Path::new(&input_path);
    let original_size = std::fs::metadata(&input_path).map(|m| m.len()).unwrap_or(0);

    let mut img = ImageReader::open(&input_path)
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;

    // 1. Crop — geometry change first so downstream stages work on the
    // reduced canvas (less pixel work, smaller intermediate buffers)
    if let Some(params) = options.crop.as_ref() {
        img = apply_crop(img, params);
    }

    // 2. Beautify (pixel adjustments) — work on max-quality decoded image
    if let Some(params) = options.beautify.as_ref() {
        if !beautify_is_noop(params) {
            img = apply_beautify(img, params);
        }
    }

    // 3. Effects (pixel transforms)
    if let Some(params) = options.effects.as_ref() {
        if !effect_is_noop(params) {
            img = apply_pipeline_effect(&img, params);
        }
    }

    // 4 + 5. Convert decides FORMAT, Compress decides QUALITY. Encode once.
    let source_format_str = detect_format(input).unwrap_or_else(|| "png".to_string());
    let target_format = match options.convert.as_ref() {
        Some(c) => get_format_from_string(&c.format)
            .ok_or_else(|| format!("Unsupported format: {}", c.format))?,
        None => get_format_from_string(&source_format_str)
            .unwrap_or(image::ImageFormat::Png),
    };
    let quality = options
        .compress
        .as_ref()
        .map(|c| c.quality)
        .or_else(|| options.convert.as_ref().map(|c| c.quality))
        .unwrap_or(DEFAULT_QUALITY);

    let output_data = encode_image(&img, target_format, quality)?;
    let new_size = output_data.len() as u64;

    let stem = input
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let extension = get_format_extension(&target_format);
    let output_dir = resolve_output_dir(&options.output_dir, input);
    let output_path = unique_output_path(&output_dir, stem, "processed", extension);

    std::fs::write(&output_path, output_data).map_err(|e| e.to_string())?;

    Ok(PipelineResult {
        success: true,
        input_path,
        output_path: Some(output_path.to_string_lossy().to_string()),
        error: None,
        original_size,
        new_size,
    })
}

#[tauri::command]
pub async fn process_pipeline_batch(
    input_paths: Vec<String>,
    options: PipelineOptions,
) -> Vec<PipelineResult> {
    input_paths
        .par_iter()
        .map(|path| {
            process_pipeline_sync(path.clone(), &options).unwrap_or_else(|e| PipelineResult {
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
