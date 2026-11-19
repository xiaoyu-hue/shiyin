// 发布版在 Windows 上不弹控制台窗口（官方模板约定，勿删）
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    shiyin_lib::run()
}
