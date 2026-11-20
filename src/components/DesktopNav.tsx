import { useStore } from '../store'
import { hapticSelection } from '../platform/haptics'
import { NAV_ITEMS } from './Tabs'

/**
 * 桌面侧边导航（1.4.0 包 3）：≥lg 时取代底部标签栏。
 * 与底栏共用同一份导航项定义（Tabs 的 NAV_ITEMS），标签文字与底栏一致
 * （桌面验收按文字找按钮，口径不变）；窄屏完全隐藏，移动端形态零改动。
 */
export default function DesktopNav() {
  const tab = useStore((s) => s.tab)
  const setTab = useStore((s) => s.setTab)

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-ink/8 bg-surface/40 px-4 pt-8 pb-6 desk:flex" aria-label="主导航（桌面）">
      <div className="flex items-center gap-3 px-2">
        <span
          className="cover grid h-11 w-11 place-items-center rounded-full text-lg font-bold text-white shadow-md"
          style={{ ['--cover' as string]: 'var(--accent)' }}
          aria-hidden
        >
          诗
        </span>
        <div>
          <p className="text-heading font-bold leading-tight">诗音</p>
          <p className="text-caption tracking-widest text-ink3">SHIYIN</p>
        </div>
      </div>
      <nav className="mt-10 flex flex-col gap-1.5" aria-label="主导航">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const active = tab === key
          return (
            <button
              key={key}
              onClick={() => { hapticSelection(); setTab(key) }}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-12 items-center gap-3 rounded-full px-4 text-body transition-colors ${
                active ? 'pill-active font-semibold' : 'text-ink2 hover:bg-ink/5'
              }`}
              style={active ? { color: 'var(--accent)' } : undefined}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.18 : 0} />
              {label}
            </button>
          )
        })}
      </nav>
      <p className="mt-auto px-2 text-caption leading-relaxed text-ink3">
        只播放本地音乐
        <br />
        不联网 · 不上传 · 没有账号
      </p>
    </aside>
  )
}
