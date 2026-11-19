import { useEffect } from 'react'
import { useStore } from './store'
import { bindAudioEngine, bindSleepTimer, restoreLocalTracks } from './store/bootstrap'
import { bindNativeMediaSession } from './platform/mediaSessionNative'
import { bindWebMediaSession } from './platform/mediaSessionWeb'
import { bindTauriDesktop } from './platform/tauriDesktop'
import { bindBackButton } from './platform/backButton'
import { hideSplashScreen } from './platform/splashScreen'
import { useTheme } from './hooks/useTheme'
import Tabs from './components/Tabs'
import HomeView from './components/HomeView'
import SearchView from './components/SearchView'
import LibraryView from './components/LibraryView'
import MeView from './components/MeView'
import MiniBar from './components/MiniBar'
import PlayerView from './components/PlayerView'
import LyricView from './components/LyricView'
import SongMenu from './components/SongMenu'
import QueueView from './components/QueueView'
import SelectionBar from './components/SelectionBar'
import OnboardingGuide from './components/OnboardingGuide'
import ErrorBoundary from './components/common/ErrorBoundary'

export default function App() {
  useTheme()
  const tab = useStore((s) => s.tab)

  // 音频事件接入与本地曲目恢复：仅需在应用启动时执行一次
  useEffect(() => {
    bindAudioEngine()
    bindSleepTimer()
    bindNativeMediaSession()
    bindWebMediaSession()
    bindTauriDesktop()
    bindBackButton()
    void restoreLocalTracks()
    // 首帧已挂载：下一帧隐藏原生启动屏（config 里关了自动隐藏），避免白屏闪与桥调用被拖慢
    const raf = requestAnimationFrame(() => hideSplashScreen())
    return () => cancelAnimationFrame(raf)
  }, [])

  const views = {
    home: <HomeView />,
    search: <SearchView />,
    explore: <LibraryView />,
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
        <QueueView />
        <SongMenu />
        <SelectionBar />
        <OnboardingGuide />
        <span className="sr-only" aria-live="polite">当前页面：{tab}</span>
      </div>
    </ErrorBoundary>
  )
}
