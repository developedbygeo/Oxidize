use chrono::Local;
use image::ImageFormat;
use std::path::{Path, PathBuf};

use crate::types::{OutputNaming, OverwriteMode};

pub fn get_format_from_string(format: &str) -> Option<ImageFormat> {
    match format.to_lowercase().as_str() {
        "png" => Some(ImageFormat::Png),
        "jpg" | "jpeg" => Some(ImageFormat::Jpeg),
        "webp" => Some(ImageFormat::WebP),
        "gif" => Some(ImageFormat::Gif),
        "bmp" => Some(ImageFormat::Bmp),
        "ico" => Some(ImageFormat::Ico),
        "tiff" | "tif" => Some(ImageFormat::Tiff),
        "avif" => Some(ImageFormat::Avif),
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
        ImageFormat::Avif => "avif",
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

/// Default filename template. `{op}` resolves to the per-operation suffix
/// (e.g. "converted", "compressed") — matches the historical naming exactly.
pub const DEFAULT_FILENAME_TEMPLATE: &str = "{name}_{op}";

/// Per-file context the template engine resolves against. `width`/`height`
/// are optional because some pipelines (video trim/extract) don't have them
/// at hand without an extra probe.
pub struct TemplateContext<'a> {
    pub name: &'a str,
    pub op: &'a str,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

/// Render a filename template against `ctx`. Supported placeholders:
///
/// - `{name}` — source file stem (no extension)
/// - `{op}`   — operation suffix ("converted", "compressed", …)
/// - `{date}` — local YYYY-MM-DD
/// - `{time}` — local HHMMSS
/// - `{width}`, `{height}` — source dimensions (empty when not provided)
///
/// Unknown placeholders are left intact so the user sees `{nope}` literally
/// and can fix their template; we don't fail or panic on typos.
pub fn apply_template(template: &str, ctx: &TemplateContext) -> String {
    // Compute date/time once even if the template uses them more than once.
    let now = Local::now();
    let date = now.format("%Y-%m-%d").to_string();
    let time = now.format("%H%M%S").to_string();

    let mut out = String::with_capacity(template.len());
    let mut chars = template.chars().peekable();
    while let Some(c) = chars.next() {
        if c != '{' {
            out.push(c);
            continue;
        }
        // Look ahead to the matching `}`. If we never find one, emit the
        // unmatched `{` literally so the user can see the malformed input.
        let mut placeholder = String::new();
        let mut closed = false;
        while let Some(&pk) = chars.peek() {
            chars.next();
            if pk == '}' {
                closed = true;
                break;
            }
            placeholder.push(pk);
        }
        if !closed {
            out.push('{');
            out.push_str(&placeholder);
            continue;
        }
        match placeholder.as_str() {
            "name" => out.push_str(ctx.name),
            "op" => out.push_str(ctx.op),
            "date" => out.push_str(&date),
            "time" => out.push_str(&time),
            "width" => {
                if let Some(w) = ctx.width {
                    out.push_str(&w.to_string());
                }
            }
            "height" => {
                if let Some(h) = ctx.height {
                    out.push_str(&h.to_string());
                }
            }
            // Unknown placeholder → leave it literal so the typo is visible.
            other => {
                out.push('{');
                out.push_str(other);
                out.push('}');
            }
        }
    }
    out
}

/// Outcome of resolving an output path. `Skip` is returned only when the
/// user has opted into `OverwriteMode::Skip` and the target file already
/// exists — callers should treat it as a soft non-error.
#[derive(Debug, PartialEq, Eq)]
pub enum ResolvedPath {
    Write(PathBuf),
    Skip(PathBuf),
}

/// Apply the user's template to compute a target filename, then resolve
/// the final path according to the overwrite mode. Auto-number is the
/// historical default.
pub fn resolve_output_path(
    dir: &Path,
    naming: &OutputNaming,
    ctx: &TemplateContext,
    ext: &str,
) -> ResolvedPath {
    let template = naming
        .filename_template
        .as_deref()
        .filter(|t| !t.trim().is_empty())
        .unwrap_or(DEFAULT_FILENAME_TEMPLATE);
    let base = apply_template(template, ctx);
    let target = dir.join(format!("{}.{}", base, ext));
    let mode = naming.overwrite_mode.unwrap_or_default();

    match mode {
        OverwriteMode::Overwrite => ResolvedPath::Write(target),
        OverwriteMode::Skip => {
            if target.exists() {
                ResolvedPath::Skip(target)
            } else {
                ResolvedPath::Write(target)
            }
        }
        OverwriteMode::AutoNumber => {
            if !target.exists() {
                return ResolvedPath::Write(target);
            }
            let mut counter = 1u32;
            loop {
                let candidate = dir.join(format!("{} ({}).{}", base, counter, ext));
                if !candidate.exists() {
                    return ResolvedPath::Write(candidate);
                }
                counter += 1;
            }
        }
    }
}

/// Convenience wrapper for callers that don't care about the Skip arm:
/// returns the path to write to, or `None` if Skip was selected and the
/// file already exists. The original `unique_output_path` API kept for
/// the simplest call sites (currently the video modules); image modules
/// take the richer `resolve_output_path` path so they can surface skips.
pub fn unique_output_path(dir: &Path, stem: &str, suffix: &str, ext: &str) -> PathBuf {
    let template = if suffix.is_empty() {
        "{name}".to_string()
    } else {
        format!("{{name}}_{}", suffix)
    };
    let naming = OutputNaming::default();
    let ctx = TemplateContext {
        name: stem,
        op: suffix,
        width: None,
        height: None,
    };
    match resolve_output_path(
        dir,
        &OutputNaming {
            filename_template: Some(template),
            overwrite_mode: naming.overwrite_mode,
        },
        &ctx,
        ext,
    ) {
        ResolvedPath::Write(p) => p,
        // AutoNumber mode never returns Skip — this arm is unreachable in
        // practice but kept exhaustive so the compiler enforces it if
        // ResolvedPath grows new variants.
        ResolvedPath::Skip(p) => p,
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
        assert!(matches!(get_format_from_string("avif"), Some(ImageFormat::Avif)));
    }

    #[test]
    fn format_from_string_is_case_insensitive() {
        assert!(matches!(get_format_from_string("PNG"), Some(ImageFormat::Png)));
        assert!(matches!(get_format_from_string("WebP"), Some(ImageFormat::WebP)));
    }

    #[test]
    fn format_from_string_returns_none_for_unknown() {
        assert!(get_format_from_string("heic").is_none());
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
        assert_eq!(get_format_extension(&ImageFormat::Avif), "avif");
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
            ImageFormat::Avif,
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

    // ────────────── apply_template ──────────────

    fn ctx<'a>(name: &'a str, op: &'a str) -> TemplateContext<'a> {
        TemplateContext { name, op, width: None, height: None }
    }

    fn ctx_sized<'a>(name: &'a str, op: &'a str, w: u32, h: u32) -> TemplateContext<'a> {
        TemplateContext { name, op, width: Some(w), height: Some(h) }
    }

    #[test]
    fn template_default_matches_historical_naming() {
        assert_eq!(apply_template(DEFAULT_FILENAME_TEMPLATE, &ctx("photo", "converted")), "photo_converted");
    }

    #[test]
    fn template_substitutes_name_and_op() {
        assert_eq!(
            apply_template("{name}-{op}", &ctx("vacation", "compressed")),
            "vacation-compressed"
        );
    }

    #[test]
    fn template_substitutes_dimensions_when_provided() {
        assert_eq!(
            apply_template("{name}@{width}x{height}", &ctx_sized("photo", "resized", 1920, 1080)),
            "photo@1920x1080"
        );
    }

    #[test]
    fn template_emits_empty_string_for_missing_dimensions() {
        // If the user puts {width} in their template but we have no dims (e.g.
        // video trim), it shouldn't blow up — just renders empty.
        assert_eq!(
            apply_template("{name}@{width}x{height}", &ctx("photo", "trimmed")),
            "photo@x"
        );
    }

    #[test]
    fn template_leaves_unknown_placeholders_literal() {
        // Typos shouldn't silently vanish — the user needs to see them.
        assert_eq!(
            apply_template("{name}_{nope}_{op}", &ctx("photo", "converted")),
            "photo_{nope}_converted"
        );
    }

    #[test]
    fn template_emits_date_in_yyyy_mm_dd() {
        let out = apply_template("{name}_{date}", &ctx("photo", "converted"));
        // Don't pin to a specific date — just shape-check.
        assert!(out.starts_with("photo_"));
        let date_part = &out["photo_".len()..];
        assert_eq!(date_part.len(), 10, "expected YYYY-MM-DD");
        assert!(date_part.chars().nth(4) == Some('-'));
        assert!(date_part.chars().nth(7) == Some('-'));
    }

    #[test]
    fn template_handles_unmatched_brace_gracefully() {
        // Trailing `{foo` (no `}`) should pass through verbatim, not panic
        // and not silently swallow content.
        let out = apply_template("{name}_{op", &ctx("photo", "x"));
        assert_eq!(out, "photo_{op");
    }

    #[test]
    fn template_resolves_repeated_placeholders() {
        assert_eq!(
            apply_template("{name}_{name}", &ctx("photo", "x")),
            "photo_photo"
        );
    }

    // ────────────── resolve_output_path ──────────────

    fn write_template(template: &str) -> OutputNaming {
        OutputNaming {
            filename_template: Some(template.to_string()),
            overwrite_mode: Some(OverwriteMode::AutoNumber),
        }
    }

    #[test]
    fn resolve_returns_write_for_default_template_when_free() {
        let tmp = tempfile::tempdir().unwrap();
        let r = resolve_output_path(
            tmp.path(),
            &OutputNaming::default(),
            &ctx("photo", "converted"),
            "webp",
        );
        assert_eq!(r, ResolvedPath::Write(tmp.path().join("photo_converted.webp")));
    }

    #[test]
    fn resolve_auto_number_appends_counter_on_collision() {
        let tmp = tempfile::tempdir().unwrap();
        File::create(tmp.path().join("photo_converted.webp")).unwrap();
        let r = resolve_output_path(
            tmp.path(),
            &OutputNaming::default(),
            &ctx("photo", "converted"),
            "webp",
        );
        assert_eq!(r, ResolvedPath::Write(tmp.path().join("photo_converted (1).webp")));
    }

    #[test]
    fn resolve_skip_returns_skip_when_file_exists() {
        let tmp = tempfile::tempdir().unwrap();
        File::create(tmp.path().join("photo_converted.webp")).unwrap();
        let naming = OutputNaming {
            filename_template: None,
            overwrite_mode: Some(OverwriteMode::Skip),
        };
        let r = resolve_output_path(tmp.path(), &naming, &ctx("photo", "converted"), "webp");
        assert_eq!(r, ResolvedPath::Skip(tmp.path().join("photo_converted.webp")));
    }

    #[test]
    fn resolve_skip_writes_when_file_does_not_exist() {
        let tmp = tempfile::tempdir().unwrap();
        let naming = OutputNaming {
            filename_template: None,
            overwrite_mode: Some(OverwriteMode::Skip),
        };
        let r = resolve_output_path(tmp.path(), &naming, &ctx("photo", "converted"), "webp");
        assert_eq!(r, ResolvedPath::Write(tmp.path().join("photo_converted.webp")));
    }

    #[test]
    fn resolve_overwrite_returns_write_even_when_file_exists() {
        let tmp = tempfile::tempdir().unwrap();
        File::create(tmp.path().join("photo_converted.webp")).unwrap();
        let naming = OutputNaming {
            filename_template: None,
            overwrite_mode: Some(OverwriteMode::Overwrite),
        };
        let r = resolve_output_path(tmp.path(), &naming, &ctx("photo", "converted"), "webp");
        assert_eq!(r, ResolvedPath::Write(tmp.path().join("photo_converted.webp")));
    }

    #[test]
    fn resolve_uses_custom_template_when_provided() {
        let tmp = tempfile::tempdir().unwrap();
        let naming = write_template("{name}-mini");
        let r = resolve_output_path(tmp.path(), &naming, &ctx("photo", "compressed"), "jpg");
        assert_eq!(r, ResolvedPath::Write(tmp.path().join("photo-mini.jpg")));
    }

    #[test]
    fn resolve_treats_empty_template_as_default() {
        // Whitespace-only template should fall back to default, not produce
        // a file literally named ".webp".
        let tmp = tempfile::tempdir().unwrap();
        let naming = OutputNaming {
            filename_template: Some("   ".to_string()),
            overwrite_mode: None,
        };
        let r = resolve_output_path(tmp.path(), &naming, &ctx("photo", "converted"), "webp");
        assert_eq!(r, ResolvedPath::Write(tmp.path().join("photo_converted.webp")));
    }
}
