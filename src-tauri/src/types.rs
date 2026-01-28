use serde::{Deserialize, Serialize};

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
    pub skip_timestamp_dir: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CompressionOptions {
    pub quality: u8,
    pub output_dir: Option<String>,
    #[serde(default)]
    pub skip_timestamp_dir: bool,
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
    pub skip_timestamp_dir: bool,
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
pub struct EffectOptions {
    pub effect: String,
    pub intensity: u8,
    pub output_dir: Option<String>,
    #[serde(default)]
    pub skip_timestamp_dir: bool,
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
