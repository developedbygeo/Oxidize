mod beautify;
mod commands;
mod compress;
mod convert;
mod effects;
mod loader;
mod pipeline;
mod types;
mod utils;

pub use types::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            // Loader
            loader::load_image_info,
            loader::load_images_batch,
            loader::get_image_preview,
            loader::get_supported_formats,
            loader::check_path_exists,
            // Convert
            convert::convert_image,
            convert::convert_images_batch,
            // Compress
            compress::compress_image,
            compress::compress_images_batch,
            // Beautify
            beautify::beautify_image,
            beautify::beautify_images_batch,
            // Effects
            effects::apply_image_effect,
            effects::apply_image_effects_batch,
            // Pipeline
            pipeline::process_pipeline_batch,
            // Commands
            commands::open_folder,
            commands::reveal_file,
            commands::delete_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
