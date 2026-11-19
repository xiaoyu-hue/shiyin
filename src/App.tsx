import { useEffect } from 'react'
import { useStore } from './store'
import { bindAudioEngine, restoreLocalTracks } from './store/bootstrap'
import { useTheme } from './hooks/useTheme'
import Tabs from './components/Tabs'
import HomeView from './components/HomeView'
import SearchView from './components/SearchView'
import ExploreView from './components/ExploreView'
import MeView from './components/MeView'
import MiniBar from './components/MiniBar'
import PlayerView from './components/PlayerView'
import LyricView from './components/LyricView'
import ErrorBoundary from './components/common/ErrorBoundary'

export default function App() {
  useTheme()
  const tab = useStore((s) => s.tab)

  // 音频事件接入与本地曲目恢复：仅需在应用启动时执行一次
  useEffect(() => {
    bindAudioEngine()
    void restoreLocalTracks()
  }, [])

  const views = {
    home: <HomeView />,
    search: <SearchView />,
    explore: <ExploreView />,
    me: <MeView />,
  }

  return (
    <ErrorBoundary>
      <div className="app-shell">
        <main className="scroll-area">{views[tab]}</main>
        <MiniBar />
        <Tabs />
        <PlayerView />
        <LyricView />
        <span className="sr-only" aria-live="polite">当前页面：{tab}</span>
      </div>
    </ErrorBoundary>
  )
}
