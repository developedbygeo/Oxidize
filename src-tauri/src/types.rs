use serde::{Deserialize, Serialize};

/// What to do when the resolved output path already exists on disk.
#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Default)]
#[serde(rename_all = "kebab-case")]
pub enum OverwriteMode {
    /// Append ` (1)`, ` (2)`, … to find a free name. (Historical default.)
    #[default]
    AutoNumber,
    /// Refuse to write; surface the file as "skipped" in results.
    Skip,
    /// Overwrite the existing file in place.
    Overwrite,
}

/// User-controllable output naming. Both fields are optional; absent means
/// "use the historical defaults" — `{name}_{op}` template + auto-number on
/// collision. Threaded through every `*Options` struct so each page can
/// opt in independently.
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct OutputNaming {
    /// Template string with `{name}`, `{op}`, `{date}`, `{time}`, `{width}`,
    /// `{height}` placeholders. The extension is appended automatically.
    pub filename_template: Option<String>,
    pub overwrite_mode: Option<OverwriteMode>,
}

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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConversionOptions {
    pub format: String,
    pub quality: u8,
    pub output_dir: Option<String>,
    #[serde(default)]
    pub naming: Option<OutputNaming>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CompressionOptions {
    pub quality: u8,
    pub output_dir: Option<String>,
    #[serde(default)]
    pub naming: Option<OutputNaming>,
    /// When true, EXIF and ICC profile metadata is carried from the source
    /// file into the compressed output. Only effective for JPEG-out (mozjpeg
    /// `write_marker`) and lossless PNG-out (oxipng `StripChunks::None`);
    /// lossy PNG, GIF, BMP, TIFF, WebP outputs strip regardless.
    #[serde(default)]
    pub preserve_metadata: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompressionResult {
    pub success: bool,
    pub output_path: Option<String>,
    pub error: Option<String>,
    pub original_size: u64,
    pub new_size: u64,
    pub savings_percent: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BeautifyOptions {
    pub brightness: i32,
    pub contrast: f32,
    pub saturation: f32,
    pub sharpness: f32,
    pub exposure: f32,
    pub hue_shift: i32,
    pub temperature: i32,
    pub white_balance: String,
    pub output_dir: Option<String>,
    #[serde(default)]
    pub naming: Option<OutputNaming>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BeautifyResult {
    pub success: bool,
    pub input_path: String,
    pub output_path: Option<String>,
    pub error: Option<String>,
    pub original_size: u64,
    pub new_size: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CropOptions {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
    pub output_dir: Option<String>,
    #[serde(default)]
    pub naming: Option<OutputNaming>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CropResult {
    pub success: bool,
    pub input_path: String,
    pub output_path: Option<String>,
    pub error: Option<String>,
    pub original_size: u64,
    pub new_size: u64,
}

/// How to handle aspect-ratio mismatch when both target width and height are
/// specified. Ignored when only one dimension is given (the other auto-scales
/// to preserve aspect ratio).
#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Default)]
#[serde(rename_all = "kebab-case")]
pub enum FitMode {
    /// Stretch to exact target dimensions, ignoring source aspect ratio.
    /// Distorts the image — rarely the right answer; here for completeness.
    Stretch,
    /// Shrink to fit *inside* the target box, preserving aspect ratio. The
    /// output is smaller than the target on one axis — no
    /// padding/letterboxing in this v1.
    Contain,
    /// Scale to *fill* the target box, then centre-crop the overflow. Output
    /// matches the target exactly. The right answer for social-media presets
    /// (e.g. landscape photo → 1080×1080 square).
    #[default]
    Cover,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ResizeOptions {
    /// Target width in pixels. When None, computed from `height` + source AR.
    pub width: Option<u32>,
    /// Target height in pixels. When None, computed from `width` + source AR.
    pub height: Option<u32>,
    /// Aspect-mismatch policy when *both* width and height are set.
    #[serde(default)]
    pub fit: FitMode,
    pub output_dir: Option<String>,
    #[serde(default)]
    pub naming: Option<OutputNaming>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResizeResult {
    pub success: bool,
    pub input_path: String,
    pub output_path: Option<String>,
    pub error: Option<String>,
    pub original_size: u64,
    pub new_size: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RotateOptions {
    /// Quarter-turn rotation in degrees: 0 / 90 / 180 / 270. Anything else
    /// is treated as 0 (no rotation) — see `rotate::apply_rotate_flip`.
    pub rotation_degrees: u16,
    pub flip_horizontal: bool,
    pub flip_vertical: bool,
    pub output_dir: Option<String>,
    #[serde(default)]
    pub naming: Option<OutputNaming>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RotateResult {
    pub success: bool,
    pub input_path: String,
    pub output_path: Option<String>,
    pub error: Option<String>,
    pub original_size: u64,
    pub new_size: u64,
}

/// Where to anchor the watermark within the base image — a 9-cell grid.
/// The corner/edge cells respect the margin offset; the centre cells ignore
/// it (a margin from the centre is meaningless).
#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Default)]
#[serde(rename_all = "kebab-case")]
pub enum WatermarkPosition {
    TopLeft,
    TopCenter,
    TopRight,
    MiddleLeft,
    MiddleCenter,
    MiddleRight,
    BottomLeft,
    BottomCenter,
    #[default]
    BottomRight,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WatermarkOptions {
    /// Absolute path to the watermark/logo image (any decodable format).
    pub watermark_path: String,
    pub position: WatermarkPosition,
    /// Watermark alpha multiplier, 0.0..=1.0. Multiplied into the watermark's
    /// own alpha channel before compositing.
    pub opacity: f32,
    /// Watermark width as a percentage of the *base* image width, so the mark
    /// scales consistently across a mixed-size batch. Height follows the
    /// watermark's own aspect ratio.
    pub scale_percent: f32,
    /// Edge inset as a percentage of base width (also scales per source).
    /// Ignored for the centre cells.
    pub margin_percent: f32,
    pub output_dir: Option<String>,
    #[serde(default)]
    pub naming: Option<OutputNaming>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WatermarkResult {
    pub success: bool,
    pub input_path: String,
    pub output_path: Option<String>,
    pub error: Option<String>,
    pub original_size: u64,
    pub new_size: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EffectOptions {
    pub effect: String,
    pub intensity: u8,
    pub output_dir: Option<String>,
    #[serde(default)]
    pub naming: Option<OutputNaming>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EffectResult {
    pub success: bool,
    pub input_path: String,
    pub output_path: Option<String>,
    pub error: Option<String>,
    pub original_size: u64,
    pub new_size: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PipelineBeautifyParams {
    pub brightness: i32,
    pub contrast: f32,
    pub saturation: f32,
    pub sharpness: f32,
    pub exposure: f32,
    pub hue_shift: i32,
    pub temperature: i32,
    pub white_balance: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PipelineEffectParams {
    pub effect: String,
    pub intensity: u8,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PipelineConvertParams {
    pub format: String,
    pub quality: u8,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PipelineCompressParams {
    pub quality: u8,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PipelineCropParams {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PipelineOptions {
    pub crop: Option<PipelineCropParams>,
    pub beautify: Option<PipelineBeautifyParams>,
    pub effects: Option<PipelineEffectParams>,
    pub convert: Option<PipelineConvertParams>,
    pub compress: Option<PipelineCompressParams>,
    pub output_dir: Option<String>,
    #[serde(default)]
    pub naming: Option<OutputNaming>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PipelineResult {
    pub success: bool,
    pub input_path: String,
    pub output_path: Option<String>,
    pub error: Option<String>,
    pub original_size: u64,
    pub new_size: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoInfo {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub width: u32,
    pub height: u32,
    pub duration_seconds: f64,
    pub format: String,
    pub video_codec: String,
    pub audio_codec: Option<String>,
    pub bitrate: Option<u64>,
    pub thumbnail: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoResult {
    pub success: bool,
    pub input_path: String,
    pub output_path: Option<String>,
    pub error: Option<String>,
    pub original_size: u64,
    pub new_size: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoConvertOptions {
    pub format: String,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
    pub crf: Option<u8>,
    pub output_dir: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum VideoQualityMode {
    Crf,
    Bitrate,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoCompressOptions {
    pub format: String,
    pub mode: VideoQualityMode,
    pub crf: Option<u8>,
    pub bitrate_kbps: Option<u32>,
    pub preset: Option<String>,
    pub output_dir: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum VideoResizeMode {
    /// Lock to a target height; width auto-scales to maintain aspect ratio.
    PresetHeight,
    /// Both dimensions explicit.
    Custom,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoResizeOptions {
    pub format: String,
    pub mode: VideoResizeMode,
    /// Target height in pixels (used when mode == PresetHeight).
    pub target_height: Option<u32>,
    /// Target width in pixels (used when mode == Custom).
    pub width: Option<u32>,
    /// Target height in pixels (used when mode == Custom).
    pub height: Option<u32>,
    /// When true, the custom mode preserves the source aspect ratio (height auto-scales).
    pub maintain_aspect: Option<bool>,
    pub crf: Option<u8>,
    pub output_dir: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoWatermarkOptions {
    pub format: String,
    /// Absolute path to the watermark/logo image (any decodable format).
    pub watermark_path: String,
    pub position: WatermarkPosition,
    /// Watermark alpha multiplier, 0.0..=1.0.
    pub opacity: f32,
    /// Watermark width as a percentage of the source video width.
    pub scale_percent: f32,
    /// Edge inset as a percentage of source video width. Ignored for centre cells.
    pub margin_percent: f32,
    pub crf: Option<u8>,
    pub output_dir: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AudioExtractOptions {
    /// Output container/codec: "mp3", "aac", "opus", "flac", "wav".
    pub format: String,
    /// CBR audio bitrate in kbps. Ignored for lossless formats (flac/wav).
    pub bitrate_kbps: Option<u32>,
    pub output_dir: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum VideoTrimMode {
    /// Re-encode the trimmed portion — frame-accurate cuts, slower.
    Accurate,
    /// Stream-copy (`-c copy`) — instant, but the cut snaps to the nearest
    /// keyframe so start/end may shift by a second or two.
    Fast,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoTrimOptions {
    pub mode: VideoTrimMode,
    pub start_seconds: f64,
    pub end_seconds: f64,
    /// Re-encode quality (Accurate mode only).
    pub crf: Option<u8>,
    pub output_dir: Option<String>,
}
