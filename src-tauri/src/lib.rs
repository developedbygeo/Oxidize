use base64::{engine::general_purpose::STANDARD, Engine};
use image::{ImageFormat, ImageReader};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::io::Cursor;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct ImageInfo {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub width: u32,
    pub height: u32,
    pub format: String,
    pub thumbnail: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConversionResult {
    pub success: bool,
    pub output_path: Option<String>,
    pub error: Option<String>,
    pub original_size: u64,
    pub new_size: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConversionOptions {
    pub format: String,
    pub quality: u8,
    pub output_dir: Option<String>,
}

fn get_format_from_string(format: &str) -> Option<ImageFormat> {
    match format.to_lowercase().as_str() {
        "png" => Some(ImageFormat::Png),
        "jpg" | "jpeg" => Some(ImageFormat::Jpeg),
        "webp" => Some(ImageFormat::WebP),
        "gif" => Some(ImageFormat::Gif),
        "bmp" => Some(ImageFormat::Bmp),
        "ico" => Some(ImageFormat::Ico),
        "tiff" | "tif" => Some(ImageFormat::Tiff),
        _ => None,
    }
}

fn get_format_extension(format: &ImageFormat) -> &'static str {
    match format {
        ImageFormat::Png => "png",
        ImageFormat::Jpeg => "jpg",
        ImageFormat::WebP => "webp",
        ImageFormat::Gif => "gif",
        ImageFormat::Bmp => "bmp",
        ImageFormat::Ico => "ico",
        ImageFormat::Tiff => "tiff",
        _ => "png",
    }
}

fn detect_format(path: &Path) -> Option<String> {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase())
}

#[tauri::command]
fn load_image_info(path: String) -> Result<ImageInfo, String> {
    let path_obj = Path::new(&path);

    let metadata = std::fs::metadata(&path).map_err(|e| e.to_string())?;
    let size = metadata.len();

    let img = ImageReader::open(&path)
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;

    let (width, height) = (img.width(), img.height());

    // Create thumbnail (max 200px)
    let thumb = img.thumbnail(200, 200);
    let mut thumb_bytes = Cursor::new(Vec::new());
    thumb
        .write_to(&mut thumb_bytes, ImageFormat::Png)
        .map_err(|e| e.to_string())?;
    let thumbnail = format!(
        "data:image/png;base64,{}",
        STANDARD.encode(thumb_bytes.into_inner())
    );

    let format = detect_format(path_obj).unwrap_or_else(|| "unknown".to_string());
    let name = path_obj
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    Ok(ImageInfo {
        path,
        name,
        size,
        width,
        height,
        format,
        thumbnail,
    })
}

#[tauri::command]
fn load_images_batch(paths: Vec<String>) -> Vec<Result<ImageInfo, String>> {
    paths
        .par_iter()
        .map(|path| load_image_info(path.clone()))
        .collect()
}

#[tauri::command]
fn convert_image(input_path: String, options: ConversionOptions) -> Result<ConversionResult, String> {
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

    // Determine output path
    let output_dir = options
        .output_dir
        .map(|d| Path::new(&d).to_path_buf())
        .unwrap_or_else(|| input.parent().unwrap_or(Path::new(".")).to_path_buf());

    let stem = input.file_stem().and_then(|s| s.to_str()).unwrap_or("output");
    let extension = get_format_extension(&target_format);
    let output_path = output_dir.join(format!("{}_converted.{}", stem, extension));

    // Convert and save
    let mut output_bytes = Cursor::new(Vec::new());

    match target_format {
        ImageFormat::Jpeg => {
            let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(
                &mut output_bytes,
                options.quality,
            );
            img.write_with_encoder(encoder).map_err(|e| e.to_string())?;
        }
        ImageFormat::WebP => {
            // WebP doesn't support quality in the same way, use default
            img.write_to(&mut output_bytes, target_format)
                .map_err(|e| e.to_string())?;
        }
        _ => {
            img.write_to(&mut output_bytes, target_format)
                .map_err(|e| e.to_string())?;
        }
    }

    let output_data = output_bytes.into_inner();
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
fn convert_images_batch(
    input_paths: Vec<String>,
    options: ConversionOptions,
) -> Vec<ConversionResult> {
    input_paths
        .par_iter()
        .map(|path| {
            convert_image(path.clone(), ConversionOptions {
                format: options.format.clone(),
                quality: options.quality,
                output_dir: options.output_dir.clone(),
            })
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

#[tauri::command]
fn get_supported_formats() -> Vec<String> {
    vec![
        "png".to_string(),
        "jpg".to_string(),
        "jpeg".to_string(),
        "webp".to_string(),
        "gif".to_string(),
        "bmp".to_string(),
        "ico".to_string(),
        "tiff".to_string(),
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_image_info,
            load_images_batch,
            convert_image,
            convert_images_batch,
            get_supported_formats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
