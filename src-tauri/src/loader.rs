use base64::{engine::general_purpose::STANDARD, Engine};
use image::{GenericImageView, ImageFormat, ImageReader};
use rayon::prelude::*;
use std::io::Cursor;
use std::path::Path;

use crate::types::ImageInfo;
use crate::utils::detect_format;

pub fn load_image_info_sync(path: String) -> Result<ImageInfo, String> {
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
pub async fn load_image_info(path: String) -> Result<ImageInfo, String> {
    load_image_info_sync(path)
}

#[tauri::command]
pub async fn load_images_batch(paths: Vec<String>) -> Vec<Result<ImageInfo, String>> {
    paths
        .par_iter()
        .map(|path| load_image_info_sync(path.clone()))
        .collect()
}

#[tauri::command]
pub async fn get_image_preview(path: String, max_dimension: Option<u32>) -> Result<String, String> {
    let img = ImageReader::open(&path)
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;

    let preview = if let Some(max_dim) = max_dimension {
        let (width, height) = img.dimensions();
        if width > max_dim || height > max_dim {
            img.thumbnail(max_dim, max_dim)
        } else {
            img
        }
    } else {
        img
    };

    let mut buffer = Cursor::new(Vec::new());
    preview
        .write_to(&mut buffer, ImageFormat::Png)
        .map_err(|e| e.to_string())?;

    Ok(format!(
        "data:image/png;base64,{}",
        STANDARD.encode(buffer.into_inner())
    ))
}

#[tauri::command]
pub fn get_supported_formats() -> Vec<String> {
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

#[tauri::command]
pub fn check_path_exists(path: String) -> bool {
    Path::new(&path).exists()
}
