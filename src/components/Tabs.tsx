import { Home, Search, Compass, UserRound } from 'lucide-react'
import { useStore } from '../store'
import type { Tab } from '../data/types'

const items: { key: Tab; label: string; icon: typeof Home }[] = [
  { key: 'home', label: '主页', icon: Home },
  { key: 'search', label: '搜索', icon: Search },
  { key: 'explore', label: '发现', icon: Compass },
  { key: 'me', label: '我的', icon: UserRound },
]

/** 底部导航：悬浮液态玻璃胶囊，选中项为玻璃药丸（0.5.0 液态玻璃改版） */
export default function Tabs() {
  const tab = useStore((s) => s.tab)
  const setTab = useStore((s) => s.setTab)

  return (
    <div className="shrink-0 px-4 pt-1 pb-[max(env(safe-area-inset-bottom),10px)]">
      <nav className="glass flex rounded-full p-1.5" aria-label="主导航">
        {items.map(({ key, label, icon: Icon }) => {
          const active = tab === key
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 text-[11px] transition-all duration-300 ${
                active ? 'bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_8px_rgba(31,27,22,0.10)]' : ''
              }`}
              style={{ color: active ? 'var(--accent)' : '#8a8176' }}
            >
              <Icon size={21} strokeWidth={active ? 2.4 : 1.8} fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.18 : 0} />
              <span className={active ? 'font-semibold' : ''}>{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
