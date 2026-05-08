use tauri::{
    menu::{AboutMetadata, Menu, MenuBuilder, SubmenuBuilder},
    AppHandle, Wry,
};

// Native macOS menu. Without an Edit submenu, Cut / Copy / Paste can fail in
// the webview because the OS never gets the chance to route the standard
// keybindings. Window and App submenus match macOS conventions so the app
// feels native on launch.
pub fn build(app: &AppHandle) -> tauri::Result<Menu<Wry>> {
    let app_menu = SubmenuBuilder::new(app, "VoiceRoundAI")
        .about(Some(AboutMetadata::default()))
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .separator()
        .close_window()
        .build()?;

    MenuBuilder::new(app)
        .item(&app_menu)
        .item(&edit_menu)
        .item(&window_menu)
        .build()
}
