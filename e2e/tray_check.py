# 托盘存活断言（CI 专用）：对诗音主窗口发 WM_CLOSE（等价于点窗口关闭按钮），
# 验证进程未退出（隐藏到托盘）；再重新启动 exe，验证单实例唤起已有窗口。
# 结果以最后一行 JSON 输出，退出码 0 = 两项都通过。
import json
import os
import subprocess
import sys
import time

import psutil
import win32con
import win32gui

EXE = os.environ["SHIYIN_EXE"]
PROC = os.environ.get("SHIYIN_PROC", "shiyin.exe")
TITLE = "诗音 Shiyin"


def visible_windows():
    found = []

    def cb(hwnd, _):
        if win32gui.IsWindowVisible(hwnd) and win32gui.GetWindowText(hwnd) == TITLE:
            found.append(hwnd)

    win32gui.EnumWindows(cb, None)
    return found


def proc_alive():
    return any((p.info.get("name") or "").lower() == PROC.lower() for p in psutil.process_iter(["name"]))


def wait_for(predicate, timeout_s):
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        if predicate():
            return True
        time.sleep(0.5)
    return False


def main():
    result = {"trayAlive": False, "relaunchWake": False}

    wins = visible_windows()
    if not wins:
        print(json.dumps({**result, "error": "main window not found before close"}))
        return 1
    win32gui.PostMessage(wins[0], win32con.WM_CLOSE, 0, 0)

    # 关窗后：进程应存活且窗口不可见（隐藏到托盘）
    result["trayAlive"] = wait_for(lambda: proc_alive() and not visible_windows(), 10)
    if not result["trayAlive"]:
        print(json.dumps({**result, "error": "process died or window still visible after close"}))
        return 1

    # 再次启动 exe：单实例应唤起已隐藏的窗口，新进程不常驻
    subprocess.Popen([EXE])
    result["relaunchWake"] = wait_for(lambda: len(visible_windows()) > 0, 15)

    print(json.dumps(result))
    return 0 if result["relaunchWake"] else 1


if __name__ == "__main__":
    sys.exit(main())
