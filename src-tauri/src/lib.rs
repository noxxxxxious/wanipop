mod config;
mod commands;
mod wanikani;

use std::sync::{Arc, Mutex};
use reqwest::Client;
use config::WanipopConfig;
use commands::*;

use std::time::Duration;
use tokio::time::sleep;
use tauri::{
    async_runtime::spawn, menu::{Menu, MenuItem}, tray::TrayIconBuilder, AppHandle, Emitter, LogicalSize, Manager, PhysicalSize, Size, WebviewWindowBuilder, WindowEvent
};

pub struct AppState {
    pub http_client: Client,
    pub config: Arc<Mutex<WanipopConfig>>,
}

pub fn run() {
    let config = WanipopConfig::load_or_create().expect("Failed to load or create config");
    let config_copy = config.clone();
    let http_client = Client::new();
    let state = AppState { config: Arc::new(Mutex::new(config)), http_client };

    tauri::Builder::default()
        .on_window_event(|window, event| {
            // when the user tries to close the "main" window…
            if let WindowEvent::CloseRequested { api, .. } = event {
                // stop Tauri from actually destroying the window:
                api.prevent_close();
                // just hide it instead:
                let _ = window.hide();
            }
        })
        .setup(move |app| {
            //Set window decorations
            let win = app.get_webview_window("main").unwrap();
            let _ = win.set_decorations(!config_copy.hide_window_decorations);

            //Menu
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&quit])?;

            //Create system tray icon
            let _ = TrayIconBuilder::new()
                .menu(&tray_menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                  "quit" => {
                    println!("quit menu item was clicked");
                    app.exit(0);
                  }
                  _ => {
                    println!("menu item {:?} not handled", event.id);
                  }
                })
                .build(app)?;

            //Set up timer to pop up after interval
            let minutes = config_copy.time_between_popups_in_minutes;
            let interval = Duration::from_secs((minutes * 60) as u64);

            let app_handle: AppHandle = app.handle().clone();
            spawn(async move {
                loop {
                    // wait
                    sleep(interval).await;

                    // Reopen window and reinitialize if it's not already open
                    if let Some(win) = app_handle.get_webview_window("main"){
                        if let Ok(is_visible) = win.is_visible()  {
                            if !is_visible {
                                let _ = win.show();
                                let _ = win.set_focus();
                                let _ = app_handle.emit("reset-session", ());
                            }
                        }
                    }
                }
            });

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            // Config
            get_config,
            set_api_key,
            set_num_of_reviews_per_batch,
            set_time_between_popups_in_minutes,
            // User
            get_wanikani_user,
            // Reviews
            get_review_batch,
            submit_review_batch,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
