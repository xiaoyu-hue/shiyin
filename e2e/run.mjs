/**
 * 诗音桌面验证包 CI 验收编排（Windows runner 上运行）。
 *
 * 驱动方式：应用内嵌 WebDriver 服务器（tauri-plugin-wdio-webdriver，
 * Tauri 官方文档现行首选路线）。编排器拉起已安装的应用并在其启动环境里
 * 带 TAURI_WEBDRIVER_PORT 激活内嵌服务器，再用 WebdriverIO remote 直连。
 * 此前两条路线均已实测走不通：tauri-driver 的 launch 模式下 msedgedriver
 * 始终等不到 DevToolsActivePort（CI 第 2/4/5/6 轮复现，应用独立启动正常、
 * 驱动版本与 WebView2 用户数据目录对齐均无效）；attach 模式要求 WebView2
 * 开远程调试口，但 wry 恒定显式设置 WebView2 浏览器参数、覆盖
 * WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS 环境变量，调试口不开（第 7 轮实测）。
 *
 * 环境变量：
 * - SHIYIN_EXE     已安装的诗音 exe 绝对路径（必填）
 * - SHIYIN_PROC    进程名（如 shiyin.exe，清理与托盘脚本用）
 * - HOOK_PATH      test-import.json 的绝对路径（验其被应用删除）
 * - SHORT_NAME / LONG_NAME  两首测试音频的曲名（文件名去扩展名）
 *
 * 产物：e2e/artifacts/ 下的 report.json 与分步截图。
 * 退出码：门槛断言全过为 0，否则 1。媒体键模拟只记录不设门槛。
 */
import { remote } from 'webdriverio'
import { spawn, execFile } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ART = join(HERE, 'artifacts')
mkdirSync(ART, { recursive: true })

const EXE = process.env.SHIYIN_EXE
if (!EXE) {
  console.error('SHIYIN_EXE 未设置')
  process.exit(2)
}
const SHORT = process.env.SHORT_NAME || 'TestToneShort'
const LONG = process.env.LONG_NAME || 'TestToneLong'
const HOOK = process.env.HOOK_PATH || ''
/** 内嵌 WebDriver 服务器端口（经 TAURI_WEBDRIVER_PORT 告知应用内插件） */
const DRIVER_PORT = 4445

const report = { checks: {}, info: {}, samples: [] }
const gate = (name, ok, extra = {}) => {
  report.checks[name] = { ok: Boolean(ok), ...extra }
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`, JSON.stringify(extra))
  return Boolean(ok)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function killApp() {
  return new Promise((resolve) => {
    execFile('taskkill', ['/IM', process.env.SHIYIN_PROC || 'shiyin.exe', '/F'], () => resolve())
  })
}

/** 拉起应用（激活内嵌 WebDriver 服务器）并等其 /status 就绪 */
async function launchApp() {
  const child = spawn(EXE, [], {
    env: { ...process.env, TAURI_WEBDRIVER_PORT: String(DRIVER_PORT) },
    stdio: 'ignore',
  })
  child.on('error', (e) => console.error('应用拉起失败：', e))
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${DRIVER_PORT}/status`)
      if (res.ok) {
        report.info.embeddedDriver = { ready: true }
        return child
      }
    } catch {
      /* 服务器还没起来 */
    }
    await sleep(500)
  }
  report.info.embeddedDriver = { ready: false }
  throw new Error(`内嵌 WebDriver 服务器 ${DRIVER_PORT} 30 秒内未就绪`)
}

/** 连接应用内嵌 WebDriver 服务器建会话 */
async function attachSession() {
  return remote({
    hostname: '127.0.0.1',
    port: DRIVER_PORT,
    path: '/',
    logLevel: 'warn',
    capabilities: {},
  })
}

/** 页面状态采样：audio 元素（引擎测试钩子）+ Media Session + 正文文本 */
function sampleFn() {
  const el = window.__shiyinAudioEl
  const ms = navigator.mediaSession
  return {
    hasShell: Boolean(document.querySelector('.app-shell')),
    audio: el
      ? {
          paused: el.paused,
          t: el.currentTime,
          dur: Number.isFinite(el.duration) ? el.duration : 0,
          readyState: el.readyState,
          src: el.src,
        }
      : null,
    msState: ms ? ms.playbackState : 'unsupported',
    msTitle: ms && ms.metadata ? ms.metadata.title : null,
    text: document.body ? document.body.innerText : '',
  }
}

async function clickButtonByLabel(browser, label) {
  return browser.execute((lbl) => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === lbl)
    if (!btn) return false
    btn.click()
    return true
  }, label)
}

async function clickTabByText(browser, text) {
  return browser.execute((t) => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === t)
    if (!btn) return false
    btn.click()
    return true
  }, text)
}

/** 媒体键模拟（informational）：keybd_event 发送 VK_MEDIA_PLAY_PAUSE(0xB3) */
function sendMediaPlayPause() {
  const ps =
    "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; " +
    'public class K { [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, int flags, int extra); }\'; ' +
    '[K]::keybd_event(0xB3, 0, 0, 0); [K]::keybd_event(0xB3, 0, 2, 0)'
  return new Promise((resolve) => {
    execFile('powershell', ['-NoProfile', '-Command', ps], (err) => resolve(!err))
  })
}

async function main() {
  let browser
  let app
  try {
    // ---------- 会话 A：渲染 / 导入 / 播放 ----------
    app = await launchApp()
    browser = await attachSession()
    const waitOpts = { timeoutMsg: '等待超时' }

    await browser.waitUntil(async () => (await browser.execute(sampleFn)).hasShell, {
      ...waitOpts,
      timeout: 60000,
      interval: 1000,
    })
    gate('render', true)
    await browser.saveScreenshot(join(ART, '01-home-initial.png'))

    // 等测试钩子导入完成：判定以音乐库 DOM 为准（两首都在列表里）。
    // 不拿 audio.src 当导入信号——导入后的自动播放可能被 WebView2 的
    // 自动播放策略拦下（引擎有专门提示文案），那是播放环节的事，不属导入成败。
    await clickTabByText(browser, '音乐库')
    let imported = false
    try {
      await browser.waitUntil(
        async () => {
          const t = await browser.execute(() => document.body.innerText)
          return t.includes(SHORT) && t.includes(LONG)
        },
        { ...waitOpts, timeout: 90000, interval: 1000 },
      )
      imported = true
    } catch {
      imported = false
    }
    gate('import', imported)
    await browser.saveScreenshot(join(ART, '02-library-after-import.png'))

    // 导入后自动播放是否生效（只记录）：采样引擎状态与页面上的拦截提示文案
    const s0 = await browser.execute(sampleFn)
    report.info.autoplayAfterImport = {
      worked: Boolean(s0.audio && !s0.audio.paused),
      paused: s0.audio?.paused,
      src: s0.audio?.src,
      msState: s0.msState,
      blockedHintShown: s0.text.includes('自动播放'),
    }
    report.samples.push({ at: 'after-import', ...s0, text: undefined })

    // 若自动播放被宿主策略拦下，点一次播放按钮（真实用户手势）再继续采样
    let s = await browser.execute(sampleFn)
    if (s.audio && s.audio.paused) {
      await clickButtonByLabel(browser, '播放')
      await sleep(1000)
      s = await browser.execute(sampleFn)
    }

    // 播放进度递增（或采样间已自动切歌，也算推进证据）
    const a1 = await browser.execute(sampleFn)
    await sleep(2500)
    const a2 = await browser.execute(sampleFn)
    report.samples.push({ at: 'progress-1', ...a1, text: undefined }, { at: 'progress-2', ...a2, text: undefined })
    const progressed =
      a1.audio && a2.audio && !a2.audio.paused && (a2.audio.t > a1.audio.t || a2.msTitle !== a1.msTitle)
    gate('progression', progressed, { t1: a1.audio?.t, t2: a2.audio?.t })

    // Media Session 元数据（当前曲目名应写入系统媒体会话）
    gate('metadata', a2.msTitle === SHORT || a2.msTitle === LONG, { msTitle: a2.msTitle, msState: a2.msState })

    // 自动接歌：短曲（约 4 秒）播完应切到长曲
    let autoNext = false
    try {
      await browser.waitUntil(
        async () => {
          const cur = await browser.execute(sampleFn)
          return cur.msTitle === LONG && cur.audio && !cur.audio.paused
        },
        { ...waitOpts, timeout: 45000, interval: 1000 },
      )
      autoNext = true
    } catch {
      autoNext = false
    }
    gate('autoNext', autoNext)
    await browser.saveScreenshot(join(ART, '03-after-autonext.png'))

    // 暂停冻结：点迷你条暂停，currentTime 应停止变化
    const clickedPause = await clickButtonByLabel(browser, '暂停')
    await sleep(600)
    const p1 = await browser.execute(sampleFn)
    await sleep(1500)
    const p2 = await browser.execute(sampleFn)
    const frozen =
      clickedPause && p1.audio && p2.audio && p1.audio.paused && p2.audio.paused && Math.abs(p2.audio.t - p1.audio.t) < 0.05
    gate('pauseFreeze', frozen, { t1: p1.audio?.t, t2: p2.audio?.t })
    // 恢复播放，供托盘阶段验证「关窗后还在播」
    await clickButtonByLabel(browser, '播放')
    await sleep(800)

    // 媒体键模拟（只记录，不设门槛）
    const beforeKey = await browser.execute(sampleFn)
    const sent = await sendMediaPlayPause()
    await sleep(1200)
    const afterKey = await browser.execute(sampleFn)
    report.info.mediaKeys = {
      sent,
      pausedBefore: beforeKey.audio?.paused,
      pausedAfter: afterKey.audio?.paused,
      toggled: Boolean(beforeKey.audio && afterKey.audio && beforeKey.audio.paused !== afterKey.audio.paused),
    }
    console.log('INFO mediaKeys', JSON.stringify(report.info.mediaKeys))
    // 若媒体键把播放暂停了，点播放恢复，避免影响托盘阶段
    const afterKey2 = await browser.execute(sampleFn)
    if (afterKey2.audio && afterKey2.audio.paused) await clickButtonByLabel(browser, '播放')
    await sleep(500)

    // ---------- 托盘断言（pywinauto 子进程） ----------
    const hiddenBefore = await browser.execute(sampleFn)
    const tray = await new Promise((resolve) => {
      execFile('python', [join(HERE, 'tray_check.py')], { env: process.env }, (err, stdout) => {
        const lines = (stdout || '').trim().split('\n')
        try {
          resolve({ code: err ? err.code : 0, ...JSON.parse(lines[lines.length - 1]) })
        } catch {
          resolve({ code: -1, raw: stdout })
        }
      })
    })
    report.info.tray = tray
    gate('trayAlive', tray.trayAlive === true)
    gate('relaunchWake', tray.relaunchWake === true)
    // 唤起后播放应仍在推进（关窗期间没有停）
    const hiddenAfter = await browser.execute(sampleFn)
    report.samples.push(
      { at: 'before-tray-close', ...hiddenBefore, text: undefined },
      { at: 'after-tray-wake', ...hiddenAfter, text: undefined },
    )
    report.info.playedWhileHidden = Boolean(
      hiddenBefore.audio && hiddenAfter.audio && hiddenAfter.audio.t !== hiddenBefore.audio.t,
    )
    await browser.saveScreenshot(join(ART, '04-after-tray-wake.png'))

    await browser.deleteSession().catch(() => undefined)
    browser = undefined
  } finally {
    if (browser) await browser.deleteSession().catch(() => undefined)
    await killApp()
    await sleep(1500)
  }

  // ---------- 会话 B：杀进程重启后曲库恢复 ----------
  try {
    app = await launchApp()
    browser = await attachSession()
    await browser.waitUntil(async () => (await browser.execute(sampleFn)).hasShell, {
      timeout: 60000,
      interval: 1000,
      timeoutMsg: '重启后界面未渲染',
    })
    await clickTabByText(browser, '音乐库')
    let restored = false
    try {
      await browser.waitUntil(
        async () => {
          const t = await browser.execute(() => document.body.innerText)
          return t.includes(SHORT) && t.includes(LONG)
        },
        { timeout: 60000, interval: 1000, timeoutMsg: '重启后曲库未恢复' },
      )
      restored = true
    } catch {
      restored = false
    }
    gate('restore', restored)
    await browser.saveScreenshot(join(ART, '05-library-after-restart.png'))
    gate('hookDeleted', HOOK ? !existsSync(HOOK) : false, { hook: HOOK })
    await browser.deleteSession().catch(() => undefined)
    browser = undefined
  } finally {
    if (browser) await browser.deleteSession().catch(() => undefined)
    await killApp()
  }

  writeFileSync(join(ART, 'report.json'), JSON.stringify(report, null, 2))
  const failed = Object.entries(report.checks).filter(([, v]) => !v.ok)
  console.log(failed.length ? `验收未全过：${failed.map(([k]) => k).join(', ')}` : '全部门槛断言通过')
  process.exit(failed.length ? 1 : 0)
}

main().catch((err) => {
  console.error('E2E 编排异常：', err)
  try {
    writeFileSync(join(ART, 'report.json'), JSON.stringify({ ...report, fatal: String(err) }, null, 2))
  } catch {
    /* 报告写失败不掩盖原始错误 */
  }
  process.exit(1)
})
