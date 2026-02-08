use tauri_plugin_shell::ShellExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      // Open devtools for debugging (works in both dev and release)
      #[cfg(debug_assertions)]
      {
        let window = app.get_webview_window("main").unwrap();
        window.open_devtools();
      }
      
      let handle = app.handle().clone();
      tauri::async_runtime::spawn(async move {
          println!("🚀 Starting backend sidecar...");
          match handle.shell().sidecar("backend") {
              Ok(sidecar_command) => {
                  match sidecar_command
                      .env("APP_ENV", "desktop")
                      .spawn()
                  {
                      Ok((_rx, child)) => {
                          println!("✅ Backend sidecar started successfully with PID: {:?}", child.pid());
                      }
                      Err(e) => {
                          eprintln!("❌ Failed to spawn backend sidecar: {}", e);
                      }
                  }
              }
              Err(e) => {
                  eprintln!("❌ Failed to create backend sidecar command: {}", e);
              }
          }
      });

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
