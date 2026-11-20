/**
 * 诗音桌面版自动更新端到端回验（1.3.1 起，收 1.3.0 的遗留待办）。
 *
 * 前提：目标新版的 GitHub Release 已发布，releases/latest/download/latest.json
 * 已指向新版。runner 上装的是「旧版验收构建」（从旧版 tag 源码构建，
 * 版本号/更新公钥/端点与旧版正式包一致，仅多 ci-webdriver 内嵌驱动）。
 *
 * 流程：拉起旧版 → 进「我的」页读关于版本号（应为旧版）→ 等应用检出新版
 *（启动静默检查或手动点「检查更新」）→ 点「更新到 vX」→ 等待下载验签、
 * 安装与重启 → 重新连上后读关于版本号（应为新版）。
 *
 * 诚实分级：检测到新版 + 点下更新后进入安装/重启，是「下载与签名校验通过」
 * 的可观察证据（updater 验签不过不会进入安装）；若安装/重启在 CI 环境
 * 走不通，脚本会把卡住的阶段与原始现象写进报告并以非零码退出，不假装全通。
 *
 * 终局断言不用 WebDriver（第四轮回验教训）：更新装上的新版本是正式发布
 * 构建，本就不含内嵌驱动，重启后永远等不到驱动端口——此前两轮就卡在这。
 * 改用驱动无关的硬证据：轮询磁盘上已安装 exe 的 FileVersion（Tauri 构建
 * 写入的版本资源，等于应用版本），变成新版即证明安装真正落盘；再普通
 * 拉起新版断言进程存活并整屏截图留档。
 *
 * 环境变量：
 * - SHIYIN_EXE        已安装的旧版诗音 exe 绝对路径（必填）
 * - SHIYIN_PROC       进程名（如 shiyin.exe）
 * - EXPECTED_VERSION  期望升级到的版本号（如 1.3.1，必填）
 * - FROM_VERSION      期望的旧版本号（如 1.3.0，可选，仅记录比对）
 *
 * 产物：e2e/artifacts-update/report.json 与分步截图。退出码：全通 0，否则 1。
 */
import { remote } from 'webdriverio'
import { spawn, execFile } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ART = join(HERE, 'artifacts-update')
mkdirSync(ART, { recursive: true })

const EXE = process.env.SHIYIN_EXE
const EXPECTED = process.env.EXPECTED_VERSION
if (!EXE || !EXPECTED) {
  console.error('SHIYIN_EXE / EXPECTED_VERSION 未设置')
  process.exit(2)
}
const FROM = process.env.FROM_VERSION || ''
const DRIVER_PORT = 4445

const report = { checks: {}, info: { expectedVersion: EXPECTED, fromVersion: FROM } }
const gate = (name, ok, extra = {}) => {
  report.checks[name] = { ok: Boolean(ok), ...extra }
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`, JSON.stringify(extra))
  return Boolean(ok)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function saveReport() {
  writeFileSync(join(ART, 'report.json'), JSON.stringify(report, null, 2))
}

function killApp() {
  return new Promise((resolve) => {
    execFile('taskkill', ['/IM', process.env.SHIYIN_PROC || 'shiyin.exe', '/F'], () => resolve())
  })
}

function appAlive() {
  return new Promise((resolve) => {
    execFile(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `(Get-Process -Name '${(process.env.SHIYIN_PROC || 'shiyin.exe').replace(/\.exe$/, '')}' -ErrorAction SilentlyContinue) -ne $null`,
      ],
      (err, stdout) => resolve(String(stdout).trim().toLowerCase() === 'true'),
    )
  })
}

/** 读已安装 exe 的 FileVersion（Tauri 构建写入的版本资源，等于应用版本） */
function readDiskFileVersion() {
  return new Promise((resolve) => {
    execFile(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `[Diagnostics.FileVersionInfo]::GetVersionInfo('${EXE.replace(/'/g, "''")}').FileVersion`,
      ],
      (err, stdout) => resolve(err ? null : String(stdout).trim() || null),
    )
  })
}

/** 整屏截图（与验收流水线的独立启动截图同法，正式构建无驱动时留档用） */
function screenShot(dest) {
  const ps =
    'Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; ' +
    '$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; ' +
    '$bmp = New-Object System.Drawing.Bitmap($b.Width, $b.Height); ' +
    '$g = [System.Drawing.Graphics]::FromImage($bmp); ' +
    `$g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size); $bmp.Save('${dest.replace(/'/g, "''")}')`
  return new Promise((resolve) => {
    execFile('powershell', ['-NoProfile', '-Command', ps], () => resolve())
  })
}

/** 拉起应用（激活内嵌 WebDriver 服务器）并等其 /status 就绪 */
async function launchApp() {
  const child = spawn(EXE, [], {
    env: { ...process.env, TAURI_WEBDRIVER_PORT: String(DRIVER_PORT) },
    stdio: 'ignore',
    detached: true,
  })
  child.on('error', (e) => console.error('应用拉起失败：', e))
  child.unref()
  return waitDriverReady(60000)
}

async function waitDriverReady(timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${DRIVER_PORT}/status`)
      if (res.ok) return true
    } catch {
      /* 还没起来 */
    }
    await sleep(1000)
  }
  return false
}

async function attachSession() {
  return remote({
    hostname: '127.0.0.1',
    port: DRIVER_PORT,
    path: '/',
    logLevel: 'warn',
    capabilities: {},
  })
}

/**
 * 预热启动（首轮回验教训）：验收流水线里被测会话前有独立启动自检先跑过一次应用，
 * WebView2 首次初始化与应用数据目录创建都在那时完成；本脚本第一版省了预热，
 * 被测会话成为进程的第一次冷启动，60 秒内等不到外壳渲染（run 44663926536）。
 * 这里先无驱动环境拉起一次、等窗口进程稳定后杀掉，再进正式被测会话。
 */
async function warmUpLaunch() {
  const child = spawn(EXE, [], { stdio: 'ignore', detached: true })
  child.on('error', (e) => console.error('预热拉起失败：', e))
  child.unref()
  await sleep(20000)
  const alive = await appAlive()
  report.info.warmUp = { appAliveAfter20s: alive }
  await killApp()
  await sleep(3000)
}

/**
 * 关掉首启导入引导（第二轮回验教训）：全新安装曲库为空时，应用先弹全屏
 * 「欢迎来到诗音」引导层，盖住一切界面——读不到关于页、也点不到检查更新。
 * 点「稍后再说」落 onboarded 标记后引导不再出现（升级后同一数据目录亦然）。
 */
async function dismissOnboarding(browser) {
  const clicked = await browser.execute(() => {
    const el = [...document.querySelectorAll('button, a, [role="button"]')].find(
      (b) => b.textContent.trim() === '稍后再说',
    )
    if (!el) return false
    el.click()
    return true
  })
  if (clicked) await sleep(1200)
  return clicked
}

async function gotoMe(browser) {
  await browser.execute(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '我的')
    if (btn) btn.click()
  })
  await sleep(1200)
}

/**
 * 进设置子页（第三轮回验教训）：「我的」标签页只是概览（收藏/本地音乐/最近播放
 * + 设置入口卡），「桌面版（应用更新）」与「关于（版本号）」都在设置子页里，
 * 要先点那张写着「主题配色 · 数据管理 · 关于诗音」的设置入口卡。
 */
async function gotoSettings(browser) {
  await gotoMe(browser)
  const clicked = await browser.execute(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('主题配色'))
    if (!btn) return false
    btn.click()
    return true
  })
  if (clicked) await sleep(1500)
  return clicked
}

async function aboutVersion(browser) {
  const text = await browser.execute(() => document.body.innerText)
  const m = text.match(/诗音 Shiyin · v(\d+\.\d+\.\d+)/)
  return m ? m[1] : null
}

async function main() {
  let browser
  try {
    // ---------- 阶段 1：旧版启动，读关于版本号 ----------
    await warmUpLaunch()
    const ready = await launchApp()
    if (!ready) {
      gate('launchOld', false, { reason: '内嵌 WebDriver 60 秒未就绪' })
      saveReport()
      process.exit(1)
    }
    gate('launchOld', true)
    browser = await attachSession()
    // 等外壳渲染（放宽到 120 秒）；超时前把页面原始状态记进报告，便于区分
    // 「没渲染」与「渲染了但选择器对不上」，并留一张失败截图。
    const shellDeadline = Date.now() + 120000
    let shellOk = false
    while (Date.now() < shellDeadline) {
      const diag = await browser
        .execute(() => ({
          url: location.href,
          readyState: document.readyState,
          hasShell: Boolean(document.querySelector('.app-shell')),
          bodyLen: document.body ? document.body.innerText.length : -1,
        }))
        .catch((e) => ({ error: String(e && e.message ? e.message : e) }))
      report.info.shellDiag = diag
      if (diag && diag.hasShell) {
        shellOk = true
        break
      }
      await sleep(3000)
    }
    if (!shellOk) {
      await browser.saveScreenshot(join(ART, '00-shell-timeout.png')).catch(() => {})
      gate('shellRender', false, { diag: report.info.shellDiag })
      saveReport()
      process.exit(1)
    }
    gate('shellRender', true)
    report.info.onboardingDismissed = await dismissOnboarding(browser)
    report.info.settingsOpened = await gotoSettings(browser)
    const v0 = await aboutVersion(browser)
    report.info.aboutVersionBefore = v0
    gate('oldVersionShown', Boolean(v0) && (!FROM || v0 === FROM), { aboutVersion: v0 })
    await browser.saveScreenshot(join(ART, '01-old-about.png'))

    // ---------- 阶段 2：等待检出新版（静默检查可能已触发；没有就手动点） ----------
    let detected = false
    const detectDeadline = Date.now() + 120000
    let manualClicked = false
    while (Date.now() < detectDeadline) {
      const state = await browser.execute((exp) => {
        const text = document.body.innerText
        const hasUpdateBtn = [...document.querySelectorAll('button')].some((b) =>
          b.textContent.includes(`更新到 v${exp}`),
        )
        return { found: text.includes(`发现新版 v${exp}`) || hasUpdateBtn, text }
      }, EXPECTED)
      if (state.found) {
        detected = true
        break
      }
      if (!manualClicked && state.text.includes('检查更新')) {
        await browser.execute(() => {
          const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '检查更新')
          if (btn) btn.click()
        })
        manualClicked = true
      }
      await sleep(2000)
    }
    gate('updateDetected', detected, { manualCheckClicked: manualClicked })
    await browser.saveScreenshot(join(ART, '02-update-detected.png'))
    if (!detected) {
      report.info.stopAt = 'detect'
      saveReport()
      process.exit(1)
    }

    // ---------- 阶段 3：点「更新到 vX」，观察进入下载/安装 ----------
    const clicked = await browser.execute((exp) => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes(`更新到 v${exp}`))
      if (!btn) return false
      btn.click()
      return true
    }, EXPECTED)
    gate('installTriggered', clicked)
    if (!clicked) {
      report.info.stopAt = 'installTrigger'
      saveReport()
      process.exit(1)
    }

    // 下载验签通过的可观察证据：界面进入「正在下载更新」或会话因应用退出/重启而断开。
    // 验签失败会走 error 状态显示「检查失败」，据此判负。
    let enteredInstall = false
    let sawError = false
    const dlDeadline = Date.now() + 120000
    while (Date.now() < dlDeadline) {
      try {
        const text = await browser.execute(() => document.body.innerText)
        if (text.includes('正在下载更新')) enteredInstall = true
        if (text.includes('检查失败')) {
          sawError = true
          break
        }
        if (enteredInstall && !text.includes('正在下载更新')) break // 已离开下载态（进入安装/重启）
      } catch {
        // 会话断开 = 应用已退出进入安装/重启阶段
        enteredInstall = true
        break
      }
      await sleep(1000)
    }
    gate('downloadAndVerifyPassed', enteredInstall && !sawError, { sawError })
    await browser.saveScreenshot(join(ART, '03-downloading.png')).catch(() => {})

    // ---------- 阶段 4：终局断言（驱动无关，见文件头说明） ----------
    try {
      await browser.deleteSession()
    } catch {
      /* 已断开 */
    }
    browser = undefined

    // 轮询磁盘上已安装 exe 的 FileVersion：变成新版 = 更新安装真正落盘完成。
    const diskDeadline = Date.now() + 240000
    let diskVersion = null
    while (Date.now() < diskDeadline) {
      diskVersion = await readDiskFileVersion()
      report.info.diskFileVersion = diskVersion
      if (diskVersion === EXPECTED) break
      await sleep(5000)
    }
    const diskOk = gate('diskVersionUpgraded', diskVersion === EXPECTED, { diskFileVersion: diskVersion })
    if (!diskOk) {
      report.info.stopAt = 'diskVersion'
      report.info.appAliveAtStop = await appAlive()
      saveReport()
      process.exit(1)
    }

    // 普通拉起新版（正式构建，无驱动）：断言进程存活 + 整屏截图留档。
    await killApp()
    await sleep(2000)
    const child = spawn(EXE, [], { stdio: 'ignore', detached: true })
    child.on('error', (e) => console.error('新版拉起失败：', e))
    child.unref()
    await sleep(20000)
    const aliveNew = await appAlive()
    gate('newVersionRuns', aliveNew)
    await screenShot(join(ART, '04-new-version-running.png'))
    saveReport()
    process.exit(aliveNew ? 0 : 1)
  } catch (e) {
    report.info.fatal = String(e && e.message ? e.message : e)
    console.error('回验异常：', e)
    saveReport()
    process.exit(1)
  } finally {
    try {
      if (browser) await browser.deleteSession()
    } catch {
      /* 忽略 */
    }
    await killApp()
  }
}

main()
