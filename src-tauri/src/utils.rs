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

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;

    // ────────────── get_format_from_string ──────────────

    #[test]
    fn format_from_string_recognizes_supported_formats() {
        assert!(matches!(get_format_from_string("png"), Some(ImageFormat::Png)));
        assert!(matches!(get_format_from_string("jpg"), Some(ImageFormat::Jpeg)));
        assert!(matches!(get_format_from_string("jpeg"), Some(ImageFormat::Jpeg)));
        assert!(matches!(get_format_from_string("webp"), Some(ImageFormat::WebP)));
        assert!(matches!(get_format_from_string("gif"), Some(ImageFormat::Gif)));
        assert!(matches!(get_format_from_string("bmp"), Some(ImageFormat::Bmp)));
        assert!(matches!(get_format_from_string("ico"), Some(ImageFormat::Ico)));
        assert!(matches!(get_format_from_string("tiff"), Some(ImageFormat::Tiff)));
        assert!(matches!(get_format_from_string("tif"), Some(ImageFormat::Tiff)));
    }

    #[test]
    fn format_from_string_is_case_insensitive() {
        assert!(matches!(get_format_from_string("PNG"), Some(ImageFormat::Png)));
        assert!(matches!(get_format_from_string("WebP"), Some(ImageFormat::WebP)));
    }

    #[test]
    fn format_from_string_returns_none_for_unknown() {
        assert!(get_format_from_string("avif").is_none());
        assert!(get_format_from_string("").is_none());
    }

    // ────────────── get_format_extension ──────────────

    #[test]
    fn extension_for_each_format() {
        assert_eq!(get_format_extension(&ImageFormat::Png), "png");
        assert_eq!(get_format_extension(&ImageFormat::Jpeg), "jpg");
        assert_eq!(get_format_extension(&ImageFormat::WebP), "webp");
        assert_eq!(get_format_extension(&ImageFormat::Gif), "gif");
        assert_eq!(get_format_extension(&ImageFormat::Bmp), "bmp");
        assert_eq!(get_format_extension(&ImageFormat::Ico), "ico");
        assert_eq!(get_format_extension(&ImageFormat::Tiff), "tiff");
    }

    #[test]
    fn format_extension_round_trips_through_string() {
        // The extension produced by get_format_extension must always parse back
        // via get_format_from_string. Otherwise we'd be writing files with
        // names we can't subsequently load.
        for fmt in [
            ImageFormat::Png,
            ImageFormat::Jpeg,
            ImageFormat::WebP,
            ImageFormat::Gif,
            ImageFormat::Bmp,
            ImageFormat::Ico,
            ImageFormat::Tiff,
        ] {
            let ext = get_format_extension(&fmt);
            assert!(
                get_format_from_string(ext).is_some(),
                "extension {ext:?} did not round-trip through get_format_from_string"
            );
        }
    }

    // ────────────── detect_format ──────────────

    #[test]
    fn detect_format_lowercases_extension() {
        assert_eq!(detect_format(Path::new("photo.JPG")), Some("jpg".to_string()));
        assert_eq!(detect_format(Path::new("/foo/bar.PNG")), Some("png".to_string()));
    }

    #[test]
    fn detect_format_returns_none_when_no_extension() {
        assert!(detect_format(Path::new("README")).is_none());
        assert!(detect_format(Path::new("")).is_none());
    }

    // ────────────── resolve_output_dir ──────────────

    #[test]
    fn resolve_output_dir_returns_option_when_set() {
        let tmp = tempfile::tempdir().unwrap();
        let target = tmp.path().join("explicit_out");
        let dir = resolve_output_dir(
            &Some(target.to_string_lossy().to_string()),
            Path::new("/anywhere/photo.png"),
        );
        assert_eq!(dir, target);
        assert!(dir.exists(), "resolve_output_dir should create the directory");
    }

    #[test]
    fn resolve_output_dir_falls_back_to_input_parent() {
        let tmp = tempfile::tempdir().unwrap();
        let input = tmp.path().join("photo.png");
        File::create(&input).unwrap();
        let dir = resolve_output_dir(&None, &input);
        assert_eq!(dir, tmp.path());
    }

    // ────────────── unique_output_path ──────────────

    #[test]
    fn unique_path_uses_base_name_when_free() {
        let tmp = tempfile::tempdir().unwrap();
        let p = unique_output_path(tmp.path(), "photo", "cropped", "png");
        assert_eq!(p.file_name().unwrap(), "photo_cropped.png");
    }

    #[test]
    fn unique_path_appends_counter_on_collision() {
        let tmp = tempfile::tempdir().unwrap();
        // Pre-create the base file to force collision
        File::create(tmp.path().join("photo_cropped.png")).unwrap();
        let p = unique_output_path(tmp.path(), "photo", "cropped", "png");
        assert_eq!(p.file_name().unwrap(), "photo_cropped (1).png");
    }

    #[test]
    fn unique_path_increments_until_free() {
        let tmp = tempfile::tempdir().unwrap();
        File::create(tmp.path().join("photo_cropped.png")).unwrap();
        File::create(tmp.path().join("photo_cropped (1).png")).unwrap();
        File::create(tmp.path().join("photo_cropped (2).png")).unwrap();
        let p = unique_output_path(tmp.path(), "photo", "cropped", "png");
        assert_eq!(p.file_name().unwrap(), "photo_cropped (3).png");
    }

    #[test]
    fn unique_path_skips_suffix_when_empty() {
        let tmp = tempfile::tempdir().unwrap();
        let p = unique_output_path(tmp.path(), "photo", "", "png");
        assert_eq!(p.file_name().unwrap(), "photo.png");
    }
}
