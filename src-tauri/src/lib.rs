pub mod commands;
pub mod config;
pub mod image_proc;
pub mod r2;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{LogicalPosition, LogicalSize, Manager, WindowEvent};

fn save_current_window_bounds(window: &tauri::WebviewWindow) {
    let is_min = window.is_minimized().unwrap_or(false);
    let is_max = window.is_maximized().unwrap_or(false);
    if is_min || is_max {
        return;
    }

    let scale = window.scale_factor().unwrap_or(1.0);
    if let (Ok(size), Ok(pos)) = (window.inner_size(), window.outer_position()) {
        let logical_size = size.to_logical::<u32>(scale);
        let logical_pos = pos.to_logical::<i32>(scale);
        if logical_size.width >= 600 && logical_size.height >= 500 {
            config::set_window_bounds(config::WindowBounds {
                x: Some(logical_pos.x),
                y: Some(logical_pos.y),
                width: logical_size.width,
                height: logical_size.height,
            });
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    config::init_and_migrate_config();

    let is_quitting = Arc::new(AtomicBool::new(false));
    let is_quitting_setup = is_quitting.clone();
    let is_quitting_event = is_quitting.clone();

    tauri::Builder::default()
        .setup(move |app| {
            // Restore saved window bounds and show window
            if let Some(main_window) = app.get_webview_window("main") {
                let saved = config::get_window_bounds();
                let _ = main_window.set_size(LogicalSize::new(saved.width, saved.height));
                if let (Some(x), Some(y)) = (saved.x, saved.y) {
                    let _ = main_window.set_position(LogicalPosition::new(x, y));
                }
                let _ = main_window.show();
                let _ = main_window.set_focus();
            }

            // Build system tray context menu
            let show_item = MenuItem::with_id(
                app,
                "show",
                "Show Cloudflare R2 Image Uploader",
                true,
                None::<&str>,
            )?;
            let separator = PredefinedMenuItem::separator(app)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &separator, &quit_item])?;

            let quit_flag = is_quitting_setup.clone();
            let mut tray_builder = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("Cloudflare R2 Image Uploader")
                .show_menu_on_left_click(false)
                .on_menu_event(move |app_handle, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(w) = app_handle.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.unminimize();
                            let _ = w.set_focus();
                        }
                    }
                    "quit" => {
                        quit_flag.store(true, Ordering::SeqCst);
                        app_handle.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    }
                    | TrayIconEvent::DoubleClick {
                        button: MouseButton::Left,
                        ..
                    } = event
                    {
                        let app_handle = tray.app_handle();
                        if let Some(w) = app_handle.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.unminimize();
                            let _ = w.set_focus();
                        }
                    }
                });

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            let _tray = tray_builder.build(app)?;

            Ok(())
        })
        .on_window_event(move |window, event| {
            if window.label() != "main" {
                return;
            }
            match event {
                WindowEvent::CloseRequested { api, .. } => {
                    if !is_quitting_event.load(Ordering::SeqCst) {
                        let cfg = config::get_config();
                        if cfg.minimize_to_tray {
                            api.prevent_close();
                            let _ = window.hide();
                        }
                    }
                }
                WindowEvent::Resized(_) | WindowEvent::Moved(_) => {
                    if let Some(wv) = window.app_handle().get_webview_window("main") {
                        save_current_window_bounds(&wv);
                    }
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::config_get,
            commands::config_set,
            commands::config_set_profile,
            commands::config_delete_profile,
            commands::config_get_path,
            commands::config_get_history_path,
            commands::config_export,
            commands::config_import,
            commands::upload_file,
            commands::shell_show_item_in_folder,
            commands::r2_test_connection,
            commands::clipboard_copy,
            commands::clipboard_read_image,
            commands::dialog_open_file,
            commands::read_local_files,
            commands::history_get,
            commands::history_clear,
            commands::image_process,
            commands::theme_update
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
