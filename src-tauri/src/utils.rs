use image::ImageFormat;
use std::path::{Path, PathBuf};

pub fn get_format_from_string(format: &str) -> Option<ImageFormat> {
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

pub fn get_format_extension(format: &ImageFormat) -> &'static str {
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

pub fn detect_format(path: &Path) -> Option<String> {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase())
}

pub fn resolve_output_dir(option_dir: &Option<String>, input_path: &Path) -> PathBuf {
    let dir = option_dir
        .as_ref()
        .map(|d| Path::new(d).to_path_buf())
        .unwrap_or_else(|| input_path.parent().unwrap_or(Path::new(".")).to_path_buf());
    std::fs::create_dir_all(&dir).ok();
    dir
}

/// Returns a non-colliding path of the form `{dir}/{stem}_{suffix}.{ext}`.
/// If that path is taken, appends ` (1)`, ` (2)`, etc. until a free name is found.
pub fn unique_output_path(dir: &Path, stem: &str, suffix: &str, ext: &str) -> PathBuf {
    let base = if suffix.is_empty() {
        stem.to_string()
    } else {
        format!("{}_{}", stem, suffix)
    };

    let first = dir.join(format!("{}.{}", base, ext));
    if !first.exists() {
        return first;
    }

    let mut counter = 1u32;
    loop {
        let candidate = dir.join(format!("{} ({}).{}", base, counter, ext));
        if !candidate.exists() {
            return candidate;
        }
        counter += 1;
    }
}
