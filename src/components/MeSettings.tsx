import { useEffect, useState, useSyncExternalStore } from 'react'
import { Check, ChevronRight, FileText, Monitor, Moon, Sun } from 'lucide-react'
import { useStore, themes } from '../store'
import type { Appearance } from '../data/types'
import { useResolvedDark } from '../hooks/useTheme'
import { APP_VERSION } from '../lib/appVersion'
import { clearAllMusic, storageUsage } from '../store/bootstrap'
import { isTauriPlatform } from '../platform/env'
import {
  checkForUpdate,
  getAutostartEnabled,
  getUpdateStatus,
  installPendingUpdate,
  setAutostartEnabled,
  subscribeUpdateStatus,
} from '../platform/tauriUpdate'
import { BackHeader } from './MePages'

const APPEARANCE_OPTIONS: { value: Appearance; label: string; Icon: typeof Sun }[] = [
  { value: 'system', label: '跟随系统', Icon: Monitor },
  { value: 'light', label: '浅色', Icon: Sun },
  { value: 'dark', label: '深色', Icon: Moon },
]

export function SettingsPage() {
  const setMePage = useStore((s) => s.setMePage)
  const themeIdx = useStore((s) => s.themeIdx)
  const setTheme = useStore((s) => s.setTheme)
  const appearance = useStore((s) => s.appearance)
  const setAppearance = useStore((s) => s.setAppearance)
  const smoothMode = useStore((s) => s.smoothMode)
  const setSmoothMode = useStore((s) => s.setSmoothMode)
  const swipeAnywhere = useStore((s) => s.swipeAnywhere)
  const setSwipeAnywhere = useStore((s) => s.setSwipeAnywhere)
  const dark = useResolvedDark()
  const tracks = useStore((s) => s.tracks)
  const [usage, setUsage] = useState<number | null>(null)
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [cleared, setCleared] = useState(false)

  useEffect(() => {
    let alive = true
    void storageUsage()
      .then((u) => {
        if (alive) setUsage(u)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [tracks.length])

  const usageText =
    usage === null
      ? '读取中…'
      : usage < 1024 * 1024
        ? `${(usage / 1024).toFixed(0)} KB`
        : `${(usage / 1024 / 1024).toFixed(1)} MB`

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6">
      <BackHeader title="设置" />

      <section className="mb-7">
        <h2 className="mb-3 text-heading font-semibold">外观</h2>
        <div className="grid grid-cols-3 gap-2">
          {APPEARANCE_OPTIONS.map(({ value, label, Icon }) => {
            const active = appearance === value
            return (
              <button
                key={value}
                onClick={() => setAppearance(value)}
                aria-pressed={active}
                className={`flex min-h-11 items-center justify-center gap-1.5 rounded-full px-3 text-body transition-transform active:scale-[0.97] ${
                  // 未选主题名签的 text-ink/70 压在主题色块上、随主题漂移，属刻意弱化（审计 A-42 归类保留）
                  active ? 'font-semibold text-white' : 'bg-surface/60 text-ink/70 shadow-sm'
                }`}
                style={active ? { background: 'var(--accent)' } : undefined}
              >
                <Icon size={16} />
                {label}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-sub text-ink2">深色外观下，每套主题配色都有对应的深色底色。</p>
      </section>

      <section className="mb-7">
        <h2 className="mb-3 text-heading font-semibold">主题配色</h2>
        <p className="mb-3 text-sub text-ink2">
          当前：{themes[themeIdx].name}（共 {themes.length} 套）
        </p>
        <div className="grid grid-cols-6 gap-2">
          {themes.map((t, i) => {
            const active = i === themeIdx
            const swBg = dark ? t.bgDark : t.bg
            const swBgEnd = dark ? t.bgEndDark : t.bgEnd
            const swAccent = dark ? t.accentDark : t.accent
            return (
              <button
                key={t.slug}
                onClick={() => setTheme(i)}
                className="flex flex-col items-center"
                aria-pressed={active}
              >
                <span
                  className="grid h-11 w-11 place-items-center rounded-full shadow-sm transition-transform active:scale-95"
                  style={{
                    background: `linear-gradient(135deg, ${swBg}, ${swBgEnd})`,
                    outline: active ? `2px solid ${swAccent}` : '1px solid rgba(0,0,0,0.06)',
                    outlineOffset: 2,
                  }}
                >
                  {active && <Check size={18} style={{ color: swAccent }} />}
                </span>
                <span
                  className={`mt-1.5 w-full truncate text-center text-caption ${active ? 'font-semibold text-ink' : 'text-ink2'}`}
                >
                  {t.name}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="mb-7">
        <h2 className="mb-3 text-heading font-semibold">流畅度</h2>
        <div className="flex items-center gap-3 rounded-[var(--r-card)] bg-surface/60 p-4 shadow-sm">
          <div className="min-w-0 flex-1">
            <p className="text-body font-medium">流畅模式</p>
            <p className="mt-0.5 text-sub leading-relaxed text-ink2">
              关掉毛玻璃的实时模糊效果，换成不透明的质感填充。手机滚动或切页发卡时可以打开它。
            </p>
          </div>
          <button
            onClick={() => setSmoothMode(!smoothMode)}
            aria-pressed={smoothMode}
            aria-label="流畅模式开关"
            className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors ${smoothMode ? '' : 'bg-ink/15'}`}
            style={smoothMode ? { background: 'var(--accent)' } : undefined}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform left-1 ${smoothMode ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>
      </section>

      <section className="mb-7">
        <h2 className="mb-3 text-heading font-semibold">播放手势</h2>
        <div className="flex items-center gap-3 rounded-[var(--r-card)] bg-surface/60 p-4 shadow-sm">
          <div className="min-w-0 flex-1">
            <p className="text-body font-medium">播放页全屏滑动切歌</p>
            <p className="mt-0.5 text-sub leading-relaxed text-ink2">
              默认只有封面区域左右滑能切歌。打开后，播放页任意处左右滑都可以切歌；点封面左右两侧快退 / 快进 10
              秒不受影响。
            </p>
          </div>
          <button
            onClick={() => setSwipeAnywhere(!swipeAnywhere)}
            aria-pressed={swipeAnywhere}
            aria-label="播放页全屏滑动切歌开关"
            className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors ${swipeAnywhere ? '' : 'bg-ink/15'}`}
            style={swipeAnywhere ? { background: 'var(--accent)' } : undefined}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform left-1 ${swipeAnywhere ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>
      </section>

      <section className="mb-7">
        <h2 className="mb-3 text-heading font-semibold">数据管理</h2>
        <div className="rounded-[var(--r-card)] bg-surface/60 p-4 shadow-sm">
          <div className="flex items-center justify-between text-body">
            <span className="text-ink2">本地音乐占用</span>
            <span className="font-medium">
              {tracks.length} 首 · {usageText}
            </span>
          </div>
          <p className="mt-2 text-sub leading-relaxed text-ink2">
            所有音频与封面只存在这台设备的浏览器里。清除后需要重新导入（你设备里的原文件不受影响）。
          </p>
          {cleared ? (
            <p className="mt-3 text-body text-ink2">已清除全部本地音乐 ✓</p>
          ) : confirmingClear ? (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  void clearAllMusic().then(
                    () => {
                      setConfirmingClear(false)
                      setCleared(true)
                    },
                    () => setConfirmingClear(false),
                  )
                }}
                className="min-h-11 flex-1 rounded-full bg-danger text-body font-semibold text-white"
              >
                确认清除 {tracks.length} 首
              </button>
              <button
                onClick={() => setConfirmingClear(false)}
                className="min-h-11 flex-1 rounded-full bg-surface/60 text-body text-ink2"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingClear(true)}
              disabled={tracks.length === 0}
              className="mt-3 min-h-11 w-full rounded-full bg-surface/60 text-body font-medium text-danger disabled:opacity-40"
            >
              清除全部本地音乐
            </button>
          )}
        </div>
      </section>

      {isTauriPlatform() && <DesktopSection />}

      <section>
        <h2 className="mb-3 text-heading font-semibold">关于</h2>
        <div className="rounded-[var(--r-card)] bg-surface/60 p-4 text-body leading-relaxed text-ink2 shadow-sm">
          <p className="font-semibold text-ink">诗音 Shiyin · v{APP_VERSION}</p>
          <p className="mt-1.5">
            一款只播放你自己音乐的本地播放器：没有账号、没有上传、没有推荐流。你的音乐、收藏与歌单都只保存在这台设备上。
          </p>
          {isTauriPlatform() && (
            <p className="mt-1.5">
              这是 Windows
              桌面版：关掉窗口会缩到系统托盘继续播放；新版发布后会在上方「桌面版」一栏提示你一键更新，不用重新下载安装。
            </p>
          )}
        </div>
        <button
          onClick={() => setMePage('licenses')}
          className="mt-3 flex w-full items-center gap-3 rounded-[var(--r-card)] bg-surface/60 px-4 py-4 text-left shadow-sm transition-transform active:scale-[0.99]"
        >
          <FileText size={20} style={{ color: 'var(--accent)' }} />
          <span className="flex-1">
            <span className="block text-body font-medium">开源许可与致谢</span>
            <span className="mt-0.5 block text-sub text-ink2">本项目许可证与第三方开源组件清单</span>
          </span>
          <ChevronRight size={18} className="text-ink3" />
        </button>
      </section>
    </div>
  )
}

export function DesktopSection() {
  const [autostart, setAutostart] = useState(false)
  const [autostartFailed, setAutostartFailed] = useState(false)
  const update = useSyncExternalStore(subscribeUpdateStatus, getUpdateStatus)

  useEffect(() => {
    let alive = true
    void getAutostartEnabled()
      .then((v) => {
        if (alive) setAutostart(v)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  const toggleAutostart = () => {
    const next = !autostart
    setAutostart(next)
    setAutostartFailed(false)
    void setAutostartEnabled(next).catch(() => {
      setAutostart(!next)
      setAutostartFailed(true)
    })
  }

  return (
    <section className="mb-7">
      <h2 className="mb-3 text-heading font-semibold">桌面版</h2>
      <div className="rounded-[var(--r-card)] bg-surface/60 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-body font-medium">开机时自动启动</p>
            <p className="mt-0.5 text-sub leading-relaxed text-ink2">打开后，电脑开机登录时诗音会自动在托盘里待命。</p>
          </div>
          <button
            onClick={toggleAutostart}
            aria-pressed={autostart}
            aria-label="开机自启开关"
            className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors ${autostart ? '' : 'bg-ink/15'}`}
            style={autostart ? { background: 'var(--accent)' } : undefined}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform left-1 ${autostart ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>
        {autostartFailed && <p className="mt-2 text-sub text-danger">设置没成功，请再试一次。</p>}
      </div>

      <div className="mt-3 rounded-[var(--r-card)] bg-surface/60 p-4 shadow-sm">
        <p className="text-body font-medium">应用更新</p>
        {update.kind === 'available' ? (
          <>
            <p className="mt-0.5 text-sub leading-relaxed text-ink2">
              发现新版 v{update.version}，下载安装后会自动重启诗音。
            </p>
            <button
              onClick={() => void installPendingUpdate()}
              className="mt-3 min-h-11 w-full rounded-full text-body font-semibold text-white"
              style={{ background: 'var(--accent)' }}
            >
              更新到 v{update.version}
            </button>
          </>
        ) : update.kind === 'updating' ? (
          <p className="mt-0.5 text-sub leading-relaxed text-ink2">
            正在下载更新{update.percent !== null ? `（${update.percent}%）` : ''}，装好后会自动重启…
          </p>
        ) : (
          <>
            <p className="mt-0.5 text-sub leading-relaxed text-ink2">
              {update.kind === 'checking'
                ? '正在检查有没有新版…'
                : update.kind === 'latest'
                  ? '已是最新版 ✓'
                  : update.kind === 'error'
                    ? '检查失败，请确认联网后再试一次。'
                    : '应用会在启动时自动检查，也可以现在手动检查。'}
            </p>
            <button
              onClick={() => void checkForUpdate()}
              disabled={update.kind === 'checking'}
              className="mt-3 min-h-11 w-full rounded-full bg-surface/60 text-body font-medium disabled:opacity-40"
            >
              检查更新
            </button>
          </>
        )}
      </div>
    </section>
  )
}
