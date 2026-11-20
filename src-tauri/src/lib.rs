//! 诗音桌面壳（Tauri 2）：Rust 侧只做五件事——
//! 1. 插件注册：single-instance（必须第一个注册）、fs、dialog、
//!    updater + process（自动更新）、autostart（开机自启）；
//! 2. 系统托盘：图标 + 菜单（显示主窗口 / 退出），左键单击唤起窗口；
//! 3. 关窗口拦截：点关闭按钮改为隐藏到托盘，播放不中断（托盘菜单退出才真退）；
//! 4. 窄命令 read_picked_file / read_picked_file_meta：读取「用户经系统
//!    对话框选中 / 拖进窗口 / CI 测试钩子列明」的源文件字节与元信息。
//!    fs 插件的 capability scope 只放行应用数据目录（$APPDATA/**），
//!    目录外的源文件只能走这条命令——它不被页面内任何业务代码直接调用，
//!    入口收敛在前端 platform/tauriFiles.ts；
//!    路径登记校验（审计 A-08）：上述三路来源的路径必须先经
//!    register_picked_paths 在 Rust 侧登记（规范化后入集合），读命令与
//!    copy_import_file 的源路径只接受登记内路径——前端页面即便被注入
//!    脚本，也无法借这组命令读任意本地文件；
//! 5. 窄命令 copy_import_file：把导入源音频流式复制进曲库目录（大文件
//!    不整读入内存），目标路径在 Rust 侧拼装并校验，只许落在曲库目录内。
//!
//! 媒体控制不走 Rust 桥：页面 Media Session 在 WebView2 里接 SMTC
//!（验证包实测定案，媒体键可用；souvlaki 等原生媒体桥许可证未核实，不引入）。
//!
//! CI 验收专用的内嵌 WebDriver 插件只在 ci-webdriver feature 下编译进来
//!（默认关闭，正式发布包不含，见 Cargo.toml 的 [features] 注释）。

use std::io::Read;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

/// 已登记可读路径集合（审计 A-08）：只放行经系统对话框 / 拖放 / CI 钩子
/// 递到前端、再由前端登记回 Rust 的源文件路径，本进程生命周期内有效。
#[derive(Default)]
struct PickedPaths(std::sync::Mutex<std::collections::HashSet<std::path::PathBuf>>);

/// 登记一批源文件路径为可读。规范化失败（文件不存在等）的路径跳过——
/// 后续读命令自然会以「未登记」拒绝，不在此处报错打断整批。
#[tauri::command]
fn register_picked_paths(state: tauri::State<'_, PickedPaths>, paths: Vec<String>) {
    let mut set = state.0.lock().unwrap();
    for p in paths {
        if let Ok(canon) = std::fs::canonicalize(&p) {
            set.insert(canon);
        }
    }
}

/// 校验路径已登记（规范化后比对），未登记直接拒绝。
fn ensure_registered(state: &PickedPaths, path: &str) -> Result<std::path::PathBuf, String> {
    let canon = std::fs::canonicalize(path)
        .map_err(|e| format!("读取文件失败（{path}）：{e}"))?;
    let set = state.0.lock().unwrap();
    if set.contains(&canon) {
        Ok(canon)
    } else {
        Err(format!("路径未登记，拒绝读取：{path}"))
    }
}

/// 读取已登记路径文件的全部字节（二进制 IPC 响应，避免大文件走 JSON 数组）。
/// 仅供导入管线读取用户选中的源文件（歌词、封面等小文件），见文件头说明。
/// 音频本体落盘走 copy_import_file 流式复制，不经本命令。
#[tauri::command]
fn read_picked_file(
    state: tauri::State<'_, PickedPaths>,
    path: String,
) -> Result<tauri::ipc::Response, String> {
    let canon = ensure_registered(&state, &path)?;
    let data = std::fs::read(&canon).map_err(|e| format!("读取文件失败（{path}）：{e}"))?;
    Ok(tauri::ipc::Response::new(data))
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct PickedFileMeta {
    size: u64,
    /// 修改时间（Unix 毫秒）；取不到时为 null，前端回退当前时间
    modified_ms: Option<u64>,
}

/// 读取已登记文件的元信息（导入管线用其构造与本地文件一致的 File.lastModified 做去重键）
#[tauri::command]
fn read_picked_file_meta(
    state: tauri::State<'_, PickedPaths>,
    path: String,
) -> Result<PickedFileMeta, String> {
    let canon = ensure_registered(&state, &path)?;
    let md = std::fs::metadata(&canon).map_err(|e| format!("读取文件信息失败（{path}）：{e}"))?;
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

/// 曲库音频子目录名（与前端 lib/trackIndex.ts 的 TRACKS_DIR 一致）
const TRACKS_DIR_NAME: &str = "tracks";

/// 把导入源文件流式复制到曲库目录，返回落盘字节数。
///
/// - src_path：源文件绝对路径（来自系统对话框 / 拖放 / CI 钩子，与 read_picked_file 同来源约束）；
/// - dest_file_name：目标文件名（形如 `tracks/<key>.<ext>` 中的相对部分由前端给定
///   「子目录/文件名」，这里逐段校验：只接受 TRACKS_DIR_NAME 一级子目录 + 纯文件名，
///   拒绝绝对路径、`..` 与多余层级），最终路径在 Rust 侧以 app data 目录拼装，
///   规范化后再次校验前缀，确保只落在曲库目录内；
/// - 复制用固定 256KB 缓冲逐块读写，内存占用与文件大小无关（1.3.0 起，
///   取代验证包整文件读入内存的 writeBlob 路径）。
#[tauri::command]
fn copy_import_file(
    app: tauri::AppHandle,
    state: tauri::State<'_, PickedPaths>,
    src_path: String,
    dest_rel_path: String,
) -> Result<u64, String> {
    // 源路径同样必须已登记（审计 A-08），与读命令同一道门
    let src_canon = ensure_registered(&state, &src_path)?;
    let mut parts = dest_rel_path.split(['/', '\\']);
    let dir = parts.next().unwrap_or("");
    let file_name = parts.next().unwrap_or("");
    if dir != TRACKS_DIR_NAME
        || parts.next().is_some()
        || file_name.is_empty()
        || file_name == "."
        || file_name == ".."
        || file_name.contains(['/', '\\'])
    {
        return Err(format!("目标路径不合法：{dest_rel_path}"));
    }
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("取应用数据目录失败：{e}"))?;
    let dest_dir = app_data.join(TRACKS_DIR_NAME);
    std::fs::create_dir_all(&dest_dir).map_err(|e| format!("创建曲库目录失败：{e}"))?;
    let dest = dest_dir.join(file_name);
    // 结构校验：dest 的父目录必须恰为曲库目录本身。
    // file_name 已在上方被限定为纯文件名（无分隔符、无 ..），
    // 路径逃逸在结构上不可能，这里再做一次父目录等值断言兜底。
    if dest.parent() != Some(dest_dir.as_path()) || !dest.starts_with(&app_data) {
        return Err(format!("目标路径越界：{dest_rel_path}"));
    }
    let mut src = std::fs::File::open(&src_canon)
        .map_err(|e| format!("打开源文件失败（{src_path}）：{e}"))?;
    let mut out = std::fs::File::create(&dest)
        .map_err(|e| format!("创建目标文件失败：{e}"))?;
    let mut buf = vec![0u8; 256 * 1024];
    let mut total: u64 = 0;
    loop {
        let n = src
            .read(&mut buf)
            .map_err(|e| format!("读取源文件失败：{e}"))?;
        if n == 0 {
            break;
        }
        use std::io::Write;
        out.write_all(&buf[..n])
            .map_err(|e| format!("写入目标文件失败：{e}"))?;
        total += n as u64;
    }
    Ok(total)
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
    let mut builder = tauri::Builder::default()
        // 已登记可读路径集合（审计 A-08）：读命令/流式拷贝的源路径白名单
        .manage(PickedPaths::default())
        // 单实例必须第一个注册：二次启动时只唤起已有窗口，新进程随即退出
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ));
    // CI 验收专用：内嵌 WebDriver 服务器（仅 ci-webdriver feature 编译进来，
    // 且仅当启动环境带 TAURI_WEBDRIVER_PORT 时才激活监听；正式包无此代码）
    #[cfg(feature = "ci-webdriver")]
    {
        builder = builder.plugin(tauri_plugin_wdio_webdriver::init());
    }
    builder
        .invoke_handler(tauri::generate_handler![
            register_picked_paths,
            read_picked_file,
            read_picked_file_meta,
            copy_import_file
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
