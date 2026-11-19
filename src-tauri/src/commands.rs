use crate::config::{
    self, AppConfig, ImageProcessingConfig, R2Config, UploadHistoryItem,
};
use crate::image_proc::{self, RawImageProcessingResult};
use crate::r2::{self, ConnectionTestResult, UploadResult};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use image::codecs::png::PngEncoder;
use image::{ExtendedColorType, ImageEncoder};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::Path;
use std::process::Command;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub config: Option<AppConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SimpleResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileDataInput {
    pub buffer_base64: String,
    pub name: String,
    pub size: u64,
    pub original_path: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadOptionsInput {
    pub target_path: String,
    pub auto_rename: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RawClipboardImage {
    pub buffer_base64: String,
    pub width: u32,
    pub height: u32,
    pub size: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RawLocalFile {
    pub path: String,
    pub name: String,
    pub mime_type: String,
    pub data_base64: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageProcessResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<RawImageProcessingResult>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

// ---- Config Commands ----

#[tauri::command]
pub fn config_get() -> AppConfig {
    config::get_config()
}

#[tauri::command]
pub fn config_set(config: Value) -> AppConfig {
    config::set_config_partial(config)
}

#[tauri::command]
pub fn config_set_profile(name: String, profile: Value) -> AppConfig {
    config::set_profile(&name, profile)
}

#[tauri::command]
pub fn config_delete_profile(name: String) -> AppConfig {
    config::delete_profile(&name)
}

#[tauri::command]
pub fn config_get_path() -> String {
    config::get_config_path().to_string_lossy().to_string()
}

#[tauri::command]
pub fn config_get_history_path() -> String {
    config::get_history_path().to_string_lossy().to_string()
}

#[tauri::command]
pub async fn config_export() -> ExportResponse {
    let file_handle = rfd::AsyncFileDialog::new()
        .set_title("Export Settings")
        .set_file_name("r2-uploader-config.json")
        .add_filter("JSON", &["json"])
        .save_file()
        .await;

    let Some(handle) = file_handle else {
        return ExportResponse {
            success: false,
            path: None,
            error: None,
        };
    };

    let target_path = handle.path().to_path_buf();
    match config::export_config_to_file(&target_path) {
        Ok(()) => ExportResponse {
            success: true,
            path: Some(target_path.to_string_lossy().to_string()),
            error: None,
        },
        Err(err) => ExportResponse {
            success: false,
            path: None,
            error: Some(err),
        },
    }
}

#[tauri::command]
pub async fn config_import() -> ImportResponse {
    let file_handle = rfd::AsyncFileDialog::new()
        .set_title("Import Settings")
        .add_filter("JSON", &["json"])
        .pick_file()
        .await;

    let Some(handle) = file_handle else {
        return ImportResponse {
            success: false,
            config: None,
            error: None,
        };
    };

    let source_path = handle.path().to_path_buf();
    match config::import_config_from_file(&source_path) {
        Ok(cfg) => ImportResponse {
            success: true,
            config: Some(cfg),
            error: None,
        },
        Err(err) => ImportResponse {
            success: false,
            config: None,
            error: Some(err),
        },
    }
}

// ---- Upload Command ----

#[tauri::command]
pub async fn upload_file(file_data: FileDataInput, options: UploadOptionsInput) -> UploadResult {
    let Some(profile) = config::get_active_profile() else {
        return UploadResult {
            success: false,
            url: None,
            key: None,
            file_name: None,
            original_name: Some(file_data.name),
            original_path: file_data.original_path,
            file_size: None,
            error: Some(
                "No active R2 profile configured. Please configure your R2 settings first."
                    .to_string(),
            ),
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
        };
    };

    let buffer = match BASE64.decode(&file_data.buffer_base64) {
        Ok(b) => b,
        Err(e) => {
            return UploadResult {
                success: false,
                url: None,
                key: None,
                file_name: None,
                original_name: Some(file_data.name),
                original_path: file_data.original_path,
                file_size: None,
                error: Some(format!("Invalid file buffer: {}", e)),
                timestamp: chrono::Utc::now().timestamp_millis() as u64,
            };
        }
    };

    let mut result = r2::upload_file(
        &profile,
        &buffer,
        &file_data.name,
        &options.target_path,
        &options.auto_rename,
    )
    .await;

    if result.success {
        if let Some(ref url) = result.url {
            let cfg = config::get_config();
            let display_name = result
                .file_name
                .clone()
                .unwrap_or_else(|| "image".to_string());

            if cfg.copy_to_clipboard {
                let clipboard_text = match cfg.clipboard_format.as_str() {
                    "markdown" => format!("![{}]({})", display_name, url),
                    "html" => format!("<img src=\"{}\" alt=\"{}\" />", url, display_name),
                    _ => url.clone(),
                };
                if let Ok(mut cb) = arboard::Clipboard::new() {
                    let _ = cb.set_text(clipboard_text);
                }
            }

            let history_item = UploadHistoryItem {
                url: url.clone(),
                key: result.key.clone().unwrap_or_default(),
                file_name: result.file_name.clone().unwrap_or_default(),
                original_name: file_data.name.clone(),
                original_path: file_data.original_path.clone(),
                file_size: file_data.size,
                timestamp: result.timestamp,
                profile: cfg.active_profile,
            };
            config::add_history_item(history_item);
        }
    }

    result.original_name = Some(file_data.name);
    result.original_path = file_data.original_path;
    result
}

// ---- Shell Command ----

#[tauri::command]
pub fn shell_show_item_in_folder(full_path: String) -> SimpleResponse {
    if full_path.trim().is_empty() {
        return SimpleResponse {
            success: false,
            error: Some("No path specified".to_string()),
        };
    }

    let path = Path::new(&full_path);
    if !path.exists() {
        return SimpleResponse {
            success: false,
            error: Some("Original file no longer exists at this location".to_string()),
        };
    }

    #[cfg(target_os = "windows")]
    let status = Command::new("explorer")
        .arg(format!("/select,{}", full_path))
        .spawn();

    #[cfg(target_os = "macos")]
    let status = Command::new("open").arg("-R").arg(&full_path).spawn();

    #[cfg(target_os = "linux")]
    let status = {
        let dir = path.parent().unwrap_or(path);
        Command::new("xdg-open").arg(dir).spawn()
    };

    match status {
        Ok(_) => SimpleResponse {
            success: true,
            error: None,
        },
        Err(e) => SimpleResponse {
            success: false,
            error: Some(format!("Failed to locate file: {}", e)),
        },
    }
}

// ---- Connection Test ----

#[tauri::command]
pub async fn r2_test_connection(profile: R2Config) -> ConnectionTestResult {
    r2::test_connection(&profile).await
}

// ---- Clipboard ----

#[tauri::command]
pub fn clipboard_copy(text: String) -> bool {
    if let Ok(mut cb) = arboard::Clipboard::new() {
        cb.set_text(text).is_ok()
    } else {
        false
    }
}

#[tauri::command]
pub fn clipboard_read_image() -> Option<RawClipboardImage> {
    let mut cb = arboard::Clipboard::new().ok()?;
    let img_data = cb.get_image().ok()?;
    if img_data.width == 0 || img_data.height == 0 {
        return None;
    }

    let width = img_data.width as u32;
    let height = img_data.height as u32;

    let mut png_bytes = Vec::new();
    let encoder = PngEncoder::new(&mut png_bytes);
    encoder
        .write_image(&img_data.bytes, width, height, ExtendedColorType::Rgba8)
        .ok()?;

    let size = png_bytes.len();
    Some(RawClipboardImage {
        buffer_base64: BASE64.encode(&png_bytes),
        width,
        height,
        size,
    })
}

// ---- File Dialog & Local File Reading ----

#[tauri::command]
pub async fn dialog_open_file() -> Option<Vec<String>> {
    let handles = rfd::AsyncFileDialog::new()
        .set_title("Select Image(s)")
        .add_filter(
            "Images",
            &[
                "jpg", "jpeg", "png", "gif", "webp", "avif", "svg", "bmp", "tiff", "tif", "ico",
                "heic", "heif",
            ],
        )
        .pick_files()
        .await?;

    let paths: Vec<String> = handles
        .into_iter()
        .map(|h| h.path().to_string_lossy().to_string())
        .collect();

    if paths.is_empty() {
        None
    } else {
        Some(paths)
    }
}

#[tauri::command]
pub async fn read_local_files(paths: Vec<String>) -> Vec<RawLocalFile> {
    tokio::task::spawn_blocking(move || {
        let mut results = Vec::new();
        for p in paths {
            let path_obj = Path::new(&p);
            if let Ok(bytes) = fs::read(path_obj) {
                let name = path_obj
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_else(|| "image".to_string());
                let mime_type = mime_guess::from_path(path_obj)
                    .first_or_octet_stream()
                    .essence_str()
                    .to_string();
                results.push(RawLocalFile {
                    path: p,
                    name,
                    mime_type,
                    data_base64: BASE64.encode(&bytes),
                });
            }
        }
        results
    })
    .await
    .unwrap_or_default()
}

// ---- History ----

#[tauri::command]
pub fn history_get() -> Vec<UploadHistoryItem> {
    config::get_history()
}

#[tauri::command]
pub fn history_clear() -> Vec<UploadHistoryItem> {
    config::clear_history()
}

// ---- Image Processing ----

#[tauri::command]
pub async fn image_process(
    file_data: FileDataInput,
    config: ImageProcessingConfig,
) -> ImageProcessResponse {
    let buffer = match BASE64.decode(&file_data.buffer_base64) {
        Ok(b) => b,
        Err(e) => {
            return ImageProcessResponse {
                success: false,
                result: None,
                error: Some(format!("Invalid image buffer: {}", e)),
            };
        }
    };

    let file_name = file_data.name;
    match tokio::task::spawn_blocking(move || image_proc::process_image(&buffer, &file_name, &config))
        .await
    {
        Ok(Ok(res)) => ImageProcessResponse {
            success: true,
            result: Some(res),
            error: None,
        },
        Ok(Err(err)) => ImageProcessResponse {
            success: false,
            result: None,
            error: Some(err),
        },
        Err(err) => ImageProcessResponse {
            success: false,
            result: None,
            error: Some(err.to_string()),
        },
    }
}

// ---- Theme ----

#[tauri::command]
pub fn theme_update(_theme: String) {
    // Custom frameless title bar adapts automatically via CSS [data-theme] variables
}
