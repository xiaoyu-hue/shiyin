# 独立启动自检（CI 诊断用）：不经 WebDriver，直接拉起已安装的诗音，
# 等 10 秒后报告进程存活与可见窗口标题，区分「应用自身启动失败」
# 与「WebDriver 驱动层问题」。进程留着不杀，由工作流后续步骤截图后清理。
import json
import os
import subprocess
import time

import psutil
import win32gui

EXE = os.environ["SHIYIN_EXE"]
PROC = os.environ.get("SHIYIN_PROC", "shiyin.exe")

p = subprocess.Popen([EXE])
time.sleep(10)

alive = any((x.info.get("name") or "").lower() == PROC.lower() for x in psutil.process_iter(["name"]))
titles = []


def cb(hwnd, _):
    if win32gui.IsWindowVisible(hwnd):
        t = win32gui.GetWindowText(hwnd)
        if t:
            titles.append(t)


win32gui.EnumWindows(cb, None)
# 注意：runner 的 stdout 是 cp1252，中文标题必须走 ensure_ascii 转义否则打印崩溃
print(json.dumps({"alive": alive, "exitCode": p.poll(), "windows": titles}))
