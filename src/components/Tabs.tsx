import { Home, Search, Compass, UserRound } from 'lucide-react'
import { useStore } from '../store'
import type { Tab } from '../data/types'

const items: { key: Tab; label: string; icon: typeof Home }[] = [
  { key: 'home', label: '主页', icon: Home },
  { key: 'search', label: '搜索', icon: Search },
  { key: 'explore', label: '发现', icon: Compass },
  { key: 'me', label: '我的', icon: UserRound },
]

export default function Tabs() {
  const tab = useStore((s) => s.tab)
  const setTab = useStore((s) => s.setTab)

  return (
    <nav className="flex shrink-0 border-t border-black/5 bg-white/45 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      {items.map(({ key, label, icon: Icon }) => {
        const active = tab === key
        return (
          <button
            key={key}
            onClick={() => setTab(key)}
            aria-current={active ? 'page' : undefined}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition-colors"
            style={{ color: active ? 'var(--accent)' : '#8a8176' }}
          >
            <Icon size={21} strokeWidth={active ? 2.4 : 1.8} />
            <span className={active ? 'font-semibold' : ''}>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
