use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

pub const CURRENT_CONFIG_VERSION: u32 = 2;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct R2Config {
    #[serde(default)]
    pub endpoint: String,
    #[serde(default)]
    pub access_key_id: String,
    #[serde(default)]
    pub secret_access_key: String,
    #[serde(default)]
    pub bucket_name: String,
    #[serde(default)]
    pub public_url_base: String,
    #[serde(default)]
    pub default_path_prefix: String,
}

impl Default for R2Config {
    fn default() -> Self {
        Self {
            endpoint: String::new(),
            access_key_id: String::new(),
            secret_access_key: String::new(),
            bucket_name: String::new(),
            public_url_base: String::new(),
            default_path_prefix: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompressionSettings {
    pub quality: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResizeSettings {
    pub percentage: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageProcessingConfig {
    pub enabled: bool,
    pub mode: String, // "compress" | "resize" | "both"
    pub compression: CompressionSettings,
    pub resize: ResizeSettings,
    pub auto_confirm: bool,
}

impl Default for ImageProcessingConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            mode: "compress".to_string(),
            compression: CompressionSettings { quality: 80 },
            resize: ResizeSettings { percentage: 100 },
            auto_confirm: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    #[serde(default = "default_config_version")]
    pub config_version: u32,
    #[serde(default = "default_profiles")]
    pub profiles: HashMap<String, R2Config>,
    #[serde(default = "default_active_profile")]
    pub active_profile: String,
    #[serde(default = "default_auto_rename")]
    pub auto_rename: String, // "off" | "timestamp" | "random"
    #[serde(default = "default_clipboard_format")]
    pub clipboard_format: String, // "raw" | "markdown" | "html"
    #[serde(default)]
    pub copy_to_clipboard: bool,
    #[serde(default = "default_theme")]
    pub theme: String, // "light" | "dark"
    #[serde(default = "default_minimize_to_tray")]
    pub minimize_to_tray: bool,
    #[serde(default)]
    pub image_processing: ImageProcessingConfig,
}

fn default_config_version() -> u32 {
    CURRENT_CONFIG_VERSION
}

fn default_profiles() -> HashMap<String, R2Config> {
    let mut map = HashMap::new();
    map.insert("Default".to_string(), R2Config::default());
    map
}

fn default_active_profile() -> String {
    "Default".to_string()
}

fn default_auto_rename() -> String {
    "timestamp".to_string()
}

fn default_clipboard_format() -> String {
    "raw".to_string()
}

fn default_theme() -> String {
    "dark".to_string()
}

fn default_minimize_to_tray() -> bool {
    true
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            config_version: CURRENT_CONFIG_VERSION,
            profiles: default_profiles(),
            active_profile: default_active_profile(),
            auto_rename: default_auto_rename(),
            clipboard_format: default_clipboard_format(),
            copy_to_clipboard: false,
            theme: default_theme(),
            minimize_to_tray: default_minimize_to_tray(),
            image_processing: ImageProcessingConfig::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadHistoryItem {
    pub url: String,
    pub key: String,
    pub file_name: String,
    pub original_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub original_path: Option<String>,
    pub file_size: u64,
    pub timestamp: u64,
    pub profile: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowBounds {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub x: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub y: Option<i32>,
    pub width: u32,
    pub height: u32,
}

impl Default for WindowBounds {
    fn default() -> Self {
        Self {
            x: None,
            y: None,
            width: 800,
            height: 650,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct ConfigFileWrapper {
    config: AppConfig,
}

#[derive(Debug, Serialize, Deserialize)]
struct HistoryFileWrapper {
    history: Vec<UploadHistoryItem>,
}

#[derive(Debug, Serialize, Deserialize)]
struct WindowStateWrapper {
    bounds: WindowBounds,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportedData {
    pub config: AppConfig,
    pub history: Vec<UploadHistoryItem>,
}

/// Returns the user data directory matching the original Electron store path:
/// Windows: %APPDATA%\cloudflare-r2-image-uploader
/// macOS: ~/Library/Application Support/cloudflare-r2-image-uploader
/// Linux: ~/.config/cloudflare-r2-image-uploader
pub fn get_app_data_dir() -> PathBuf {
    let base = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    let dir = base.join("cloudflare-r2-image-uploader");
    if !dir.exists() {
        let _ = fs::create_dir_all(&dir);
    }
    dir
}

pub fn get_config_path() -> PathBuf {
    get_app_data_dir().join("config.json")
}

pub fn get_history_path() -> PathBuf {
    get_app_data_dir().join("history.json")
}

pub fn get_window_state_path() -> PathBuf {
    get_app_data_dir().join("window-state.json")
}

/// Run config migrations on startup, keeping exact parity with electron-store migrations.
pub fn init_and_migrate_config() {
    let path = get_config_path();
    if !path.exists() {
        let default_cfg = AppConfig::default();
        save_config(&default_cfg);
        return;
    }

    let mut cfg = get_config();
    if cfg.config_version < CURRENT_CONFIG_VERSION {
        cfg.config_version = CURRENT_CONFIG_VERSION;
        if cfg.profiles.is_empty() {
            cfg.profiles = default_profiles();
        }
        save_config(&cfg);
    }
}

pub fn get_config() -> AppConfig {
    let path = get_config_path();
    if let Ok(raw) = fs::read_to_string(&path) {
        if let Ok(wrapper) = serde_json::from_str::<ConfigFileWrapper>(&raw) {
            return wrapper.config;
        }
        if let Ok(direct) = serde_json::from_str::<AppConfig>(&raw) {
            return direct;
        }
    }
    let default_cfg = AppConfig::default();
    save_config(&default_cfg);
    default_cfg
}

pub fn save_config(config: &AppConfig) {
    let path = get_config_path();
    let wrapper = ConfigFileWrapper {
        config: config.clone(),
    };
    if let Ok(json) = serde_json::to_string_pretty(&wrapper) {
        let _ = fs::write(path, json);
    }
}

/// Merge partial JSON updates into the current AppConfig and persist.
pub fn set_config_partial(updates: Value) -> AppConfig {
    let current = get_config();
    let mut current_val = serde_json::to_value(&current).unwrap_or(Value::Null);

    if let (Value::Object(ref mut cur_map), Value::Object(upd_map)) = (&mut current_val, updates) {
        for (k, v) in upd_map {
            cur_map.insert(k, v);
        }
    }

    let updated: AppConfig = serde_json::from_value(current_val).unwrap_or(current);
    save_config(&updated);
    updated
}

pub fn get_active_profile() -> Option<R2Config> {
    let config = get_config();
    config.profiles.get(&config.active_profile).cloned()
}

pub fn set_profile(name: &str, profile_updates: Value) -> AppConfig {
    let mut config = get_config();
    let existing = config
        .profiles
        .get(name)
        .cloned()
        .unwrap_or_else(R2Config::default);

    let mut existing_val = serde_json::to_value(&existing).unwrap_or(Value::Null);
    if let (Value::Object(ref mut cur_map), Value::Object(upd_map)) =
        (&mut existing_val, profile_updates)
    {
        for (k, v) in upd_map {
            cur_map.insert(k, v);
        }
    }

    let updated_profile: R2Config = serde_json::from_value(existing_val).unwrap_or(existing);
    config.profiles.insert(name.to_string(), updated_profile);
    save_config(&config);
    config
}

pub fn delete_profile(name: &str) -> AppConfig {
    let mut config = get_config();
    if name == "Default" {
        return config;
    }
    config.profiles.remove(name);
    if config.active_profile == name {
        config.active_profile = "Default".to_string();
    }
    save_config(&config);
    config
}

// ---- History ----

pub fn get_history() -> Vec<UploadHistoryItem> {
    let path = get_history_path();
    if let Ok(raw) = fs::read_to_string(&path) {
        if let Ok(wrapper) = serde_json::from_str::<HistoryFileWrapper>(&raw) {
            return wrapper.history;
        }
        if let Ok(direct) = serde_json::from_str::<Vec<UploadHistoryItem>>(&raw) {
            return direct;
        }
    }
    Vec::new()
}

pub fn save_history(history: &[UploadHistoryItem]) {
    let path = get_history_path();
    let wrapper = HistoryFileWrapper {
        history: history.to_vec(),
    };
    if let Ok(json) = serde_json::to_string_pretty(&wrapper) {
        let _ = fs::write(path, json);
    }
}

pub fn add_history_item(item: UploadHistoryItem) -> Vec<UploadHistoryItem> {
    let mut history = get_history();
    history.insert(0, item);
    if history.len() > 100 {
        history.truncate(100);
    }
    save_history(&history);
    history
}

pub fn clear_history() -> Vec<UploadHistoryItem> {
    save_history(&[]);
    Vec::new()
}

// ---- Window Bounds ----

pub fn get_window_bounds() -> WindowBounds {
    let path = get_window_state_path();
    if let Ok(raw) = fs::read_to_string(&path) {
        if let Ok(wrapper) = serde_json::from_str::<WindowStateWrapper>(&raw) {
            return wrapper.bounds;
        }
    }
    WindowBounds::default()
}

pub fn set_window_bounds(bounds: WindowBounds) {
    let path = get_window_state_path();
    let wrapper = WindowStateWrapper { bounds };
    if let Ok(json) = serde_json::to_string_pretty(&wrapper) {
        let _ = fs::write(path, json);
    }
}

// ---- Export / Import ----

pub fn export_config_to_file(file_path: &PathBuf) -> Result<(), String> {
    let data = ExportedData {
        config: get_config(),
        history: get_history(),
    };
    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(file_path, json).map_err(|e| e.to_string())
}

pub fn import_config_from_file(file_path: &PathBuf) -> Result<AppConfig, String> {
    let raw = fs::read_to_string(file_path).map_err(|e| e.to_string())?;
    let val: Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;

    if let Some(cfg_val) = val.get("config") {
        let updated = set_config_partial(cfg_val.clone());
        if let Some(hist_val) = val.get("history") {
            if let Ok(history) = serde_json::from_value::<Vec<UploadHistoryItem>>(hist_val.clone())
            {
                save_history(&history);
            }
        }
        return Ok(updated);
    }

    Err("Invalid configuration file format".to_string())
}
