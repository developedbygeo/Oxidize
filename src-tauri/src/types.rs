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
