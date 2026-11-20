/**
 * 网页端滚动防回归探针（1.5.0 发布前真机实报折叠修复的留痕门禁）：
 *
 * 背景：.app-shell（height:100dvh; overflow:hidden）里的内容列曾只有
 * min-w-0、缺 min-h-0，内容超一屏时内容列被撑出壳外、main.scroll-area
 * 形不成滚动区——网页端整页不能滚、底栏被顶出屏幕。整页长截图自检天然
 * 测不出此问题，故立此探针：真实无头 Chrome 打开构建产物，注入超高
 * 内容模拟「内容超一屏」，断言三项（任一不过即非零退出）：
 *   1. 内容列高度 ≤ 壳高度；
 *   2. main.scrollHeight > main.clientHeight（滚动区成立）；
 *   3. main.scrollTo(0, 500) 后 scrollTop 真实变化（能滚得动）。
 *
 * 用法：先 npm run build，再 node scripts/scroll-probe.mjs
 * Chrome 路径可用 SHIYIN_CHROME 环境变量覆盖（默认 /opt/meta-chromium/chrome）。
 */
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { readFileSync, existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { extname, join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const CHROME = process.env.SHIYIN_CHROME || '/opt/meta-chromium/chrome'
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' }

if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist 不存在，请先 npm run build')
  process.exit(2)
}

const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  // 网页构建的基路径是 /shiyin/（GitHub Pages 子路径），本地服务剥掉前缀
  if (p.startsWith('/shiyin/')) p = p.slice('/shiyin'.length)
  if (p === '/' || p === '') p = '/index.html'
  const file = join(dist, p)
  if (!existsSync(file)) {
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end(readFileSync(join(dist, 'index.html')))
    return
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' })
  res.end(readFileSync(file))
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const port = server.address().port

const profile = mkdtempSync(join(tmpdir(), 'shiyin-probe-'))
const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--remote-debugging-port=0',
  `--user-data-dir=${profile}`,
  '--window-size=390,844',
  'about:blank',
])

function waitPortFile() {
  return new Promise((resolvePort, reject) => {
    const t0 = Date.now()
    const tick = () => {
      const f = join(profile, 'DevToolsActivePort')
      if (existsSync(f)) {
        const lines = readFileSync(f, 'utf8').trim().split('\n')
        resolvePort(`ws://127.0.0.1:${lines[0]}${lines[1]}`)
      } else if (Date.now() - t0 > 20000) reject(new Error('Chrome 调试端口未就绪'))
      else setTimeout(tick, 200)
    }
    tick()
  })
}

let seq = 0
const pending = new Map()
let ws
function send(method, params = {}, sessionId) {
  const id = ++seq
  return new Promise((res, rej) => {
    pending.set(id, { res, rej })
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
  })
}

try {
  const wsUrl = await waitPortFile()
  ws = new WebSocket(wsUrl)
  await new Promise((res, rej) => {
    ws.onopen = res
    ws.onerror = rej
  })
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) rej(new Error(msg.error.message))
      else res(msg.result)
    }
  }

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  await send('Page.enable', {}, sessionId)
  await send('Runtime.enable', {}, sessionId)
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/shiyin/` }, sessionId)

  async function evaluate(expression) {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId)
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text || 'evaluate failed')
    return r.result.value
  }

  // 等应用挂载出 .app-shell
  let mounted = false
  for (let i = 0; i < 50 && !mounted; i++) {
    mounted = await evaluate(`!!document.querySelector('.app-shell')`)
    if (!mounted) await new Promise((r) => setTimeout(r, 200))
  }
  if (!mounted) throw new Error('应用未挂载（.app-shell 未出现）')

  const metrics = await evaluate(`(() => {
    const shell = document.querySelector('.app-shell')
    const main = document.querySelector('main.scroll-area')
    const column = main.parentElement
    // 注入超高填充，模拟内容超一屏（回归机理是布局，与具体曲库内容无关）
    const filler = document.createElement('div')
    filler.style.height = '3000px'
    filler.id = 'scroll-probe-filler'
    main.appendChild(filler)
    const before = {
      shellH: shell.clientHeight,
      columnH: column.offsetHeight,
      mainClientH: main.clientHeight,
      mainScrollH: main.scrollHeight,
    }
    main.scrollTo(0, 500)
    return { ...before, scrollTopAfter: main.scrollTop }
  })()`)

  const checks = [
    ['内容列高度 ≤ 壳高度', metrics.columnH <= metrics.shellH + 1, `column=${metrics.columnH} shell=${metrics.shellH}`],
    ['滚动区成立（scrollHeight > clientHeight）', metrics.mainScrollH > metrics.mainClientH, `scroll=${metrics.mainScrollH} client=${metrics.mainClientH}`],
    ['scrollTo 后 scrollTop 真实变化', metrics.scrollTopAfter > 0, `scrollTop=${metrics.scrollTopAfter}`],
  ]
  let failed = 0
  for (const [name, ok, detail] of checks) {
    console.log(`${ok ? '✓' : '✗'} ${name}（${detail}）`)
    if (!ok) failed++
  }
  if (failed > 0) {
    console.error(`滚动探针失败：${failed}/3 项不过`)
    process.exitCode = 1
  } else {
    console.log('滚动探针全过（3/3）')
  }
} finally {
  try {
    chrome.kill('SIGKILL')
  } catch {}
  server.close()
}
