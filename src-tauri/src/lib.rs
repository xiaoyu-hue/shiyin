//! 诗音桌面壳（Tauri 2）：Rust 侧只做四件事——
//! 1. 插件注册：single-instance（必须第一个注册）、fs、dialog；
//! 2. 系统托盘：图标 + 菜单（显示主窗口 / 退出），左键单击唤起窗口；
//! 3. 关窗口拦截：点关闭按钮改为隐藏到托盘，播放不中断（托盘菜单退出才真退）；
//! 4. 窄命令 read_picked_file / read_picked_file_meta：读取「用户经系统
//!    对话框选中 / 拖进窗口 / CI 测试钩子列明」的源文件字节与元信息。
//!    fs 插件的 capability scope 只放行应用数据目录（$APPDATA/**），
//!    目录外的源文件只能走这条命令——它不被页面内任何业务代码直接调用，
//!    入口收敛在前端 platform/tauriFiles.ts。
//!
//! 媒体控制不走 Rust 桥：页面 Media Session 在 WebView2 里接 SMTC
//!（验证包定案；souvlaki 等原生媒体桥的许可证未核实前不引入，
//! 待正式版评估，见 Windows 阶段调研报告）。

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

/// 读取任意路径文件的全部字节（二进制 IPC 响应，避免大文件走 JSON 数组）。
/// 仅供导入管线读取用户选中的源文件，见文件头说明。
#[tauri::command]
fn read_picked_file(path: String) -> Result<tauri::ipc::Response, String> {
    let data = std::fs::read(&path).map_err(|e| format!("读取文件失败（{path}）：{e}"))?;
    Ok(tauri::ipc::Response::new(data))
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct PickedFileMeta {
    size: u64,
    /// 修改时间（Unix 毫秒）；取不到时为 null，前端回退当前时间
    modified_ms: Option<u64>,
}

/// 读取文件元信息（导入管线用其构造与本地文件一致的 File.lastModified 做去重键）
#[tauri::command]
fn read_picked_file_meta(path: String) -> Result<PickedFileMeta, String> {
    let md = std::fs::metadata(&path).map_err(|e| format!("读取文件信息失败（{path}）：{e}"))?;
    let modified_ms = md
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64);
    Ok(PickedFileMeta {
        size: md.len(),
        modified_ms,
    })
}

/// 把主窗口带回前台（托盘唤起 / 二次启动共用）
fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 单实例必须第一个注册：二次启动时只唤起已有窗口，新进程随即退出
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        // 验证包专用：内嵌 WebDriver 服务器（见 Cargo.toml 注释，正式版移除）
        .plugin(tauri_plugin_wdio_webdriver::init())
        .invoke_handler(tauri::generate_handler![
            read_picked_file,
            read_picked_file_meta
        ])
        .setup(|app| {
            // 系统托盘：菜单（显示主窗口 / 退出）+ 左键单击唤起
            let show_item = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出诗音", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;
            if let Some(icon) = app.default_window_icon() {
                TrayIconBuilder::with_id("main-tray")
                    .icon(icon.clone())
                    .tooltip("诗音 Shiyin")
                    .menu(&menu)
                    .show_menu_on_left_click(false)
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "show" => show_main_window(app),
                        "quit" => app.exit(0),
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            show_main_window(tray.app_handle());
                        }
                    })
                    .build(app)?;
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            // 关窗口 = 隐藏到托盘（播放不中断）；真正退出走托盘菜单
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
