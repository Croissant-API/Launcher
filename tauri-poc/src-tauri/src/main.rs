#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

use tauri::{Manager, Window};
use serde::Serialize;
use std::path::PathBuf;
use std::fs;

#[derive(Serialize)]
struct GameInfo {
  gameId: String,
  state: String,
}

#[tauri::command]
fn list_games() -> Result<Vec<GameInfo>, String> {
  // Minimal emulation of server.js /list: check local `games` folder
  let mut home = std::env::var("APPDATA").unwrap_or_else(|_| ".".into());
  let games_dir = PathBuf::from(&home).join("Croissant-Launcher").join("games");
  let mut out = vec![];
  if games_dir.exists() {
    let entries = fs::read_dir(&games_dir).map_err(|e| e.to_string())?;
    for e in entries {
      if let Ok(entry) = e {
        let file_name = entry.file_name().into_string().unwrap_or_default();
        let state = if entry.path().is_dir() { "installed" } else { "not_installed" };
        out.push(GameInfo { gameId: file_name, state: state.to_string() });
      }
    }
  }
  Ok(out)
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![list_games])
    .setup(|app| {
      let main_window = app.get_window("main").unwrap();
      main_window.set_title("Croissant Launcher (POC)").ok();
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
