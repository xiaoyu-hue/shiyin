import { Home, Search, Library, UserRound } from 'lucide-react'
import { useStore } from '../store'
import { hapticSelection } from '../platform/haptics'
import type { Tab } from '../data/types'

const items: { key: Tab; label: string; icon: typeof Home }[] = [
  { key: 'home', label: '主页', icon: Home },
  { key: 'search', label: '搜索', icon: Search },
  { key: 'explore', label: '音乐库', icon: Library },
  { key: 'me', label: '我的', icon: UserRound },
]

/** 底部导航：悬浮液态玻璃胶囊，选中项为玻璃药丸（0.5.0 液态玻璃改版） */
export default function Tabs() {
  const tab = useStore((s) => s.tab)
  const setTab = useStore((s) => s.setTab)
  const compact = useStore((s) => s.chromeCompact)

  return (
    <div className="shrink-0 px-4 pt-1 pb-[max(var(--sab),10px)]">
      <nav
        className="glass group relative flex overflow-hidden rounded-full p-1.5"
        aria-label="主导航"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          e.currentTarget.style.setProperty('--mx', `${(((e.clientX - r.left) / Math.max(1, r.width)) * 100).toFixed(1)}%`)
        }}
      >
        {/* 玻璃高光微动（1.4.0）：指针划过时玻璃上有一道光泽跟着走，仅悬停设备可见 */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: 'radial-gradient(150px circle at var(--mx, 50%) 50%, rgba(255,255,255,0.30), transparent 70%)' }}
        />
        {items.map(({ key, label, icon: Icon }) => {
          const active = tab === key
          return (
            <button
              key={key}
              onClick={() => { hapticSelection(); setTab(key) }}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 text-caption transition-all duration-300 ${
                active ? 'pill-active' : 'text-ink2'
              }`}
              style={active ? { color: 'var(--accent)' } : undefined}
            >
              <Icon size={21} strokeWidth={active ? 2.4 : 1.8} fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.18 : 0} />
              {/* 紧凑态（1.4.0）：列表下滚时标签收起只剩图标，文字保留在 DOM（读屏/验收口径不变） */}
              <span className={`overflow-hidden transition-all duration-300 ${compact ? 'max-h-0 opacity-0' : 'max-h-4 opacity-100'} ${active ? 'font-semibold' : ''}`}>{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
