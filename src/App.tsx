import { useEffect, useRef } from 'react'
import { MotionConfig, motion } from 'motion/react'
import { pageTransition } from './lib/motion'
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
import Toast from './components/Toast'
import ErrorBoundary from './components/common/ErrorBoundary'

export default function App() {
  useTheme()
  const tab = useStore((s) => s.tab)
  const setChromeCompact = useStore((s) => s.setChromeCompact)

  // 分页滚动记忆 + 导航紧凑态（1.4.0）：每个主标签记住自己的滚动位置，
  // 切回来接着看；主区向下滚过阈值时底栏/迷你条收紧凑，让位给内容
  const mainRef = useRef<HTMLElement>(null)
  const scrollByTab = useRef<Partial<Record<string, number>>>({})
  const lastY = useRef(0)
  const compactRef = useRef(false)
  const applyCompact = (v: boolean) => {
    if (compactRef.current !== v) {
      compactRef.current = v
      setChromeCompact(v)
    }
  }
  const handleScroll = () => {
    const el = mainRef.current
    if (!el) return
    const y = el.scrollTop
    scrollByTab.current[useStore.getState().tab] = y
    if (y > 120 && y > lastY.current + 4) applyCompact(true)
    else if (y < lastY.current - 4 || y < 60) applyCompact(false)
    lastY.current = y
  }
  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const y = scrollByTab.current[tab] ?? 0
    const id = requestAnimationFrame(() => {
      el.scrollTop = y
      lastY.current = y
      applyCompact(y > 120)
    })
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

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
      {/* reducedMotion="user"：系统要求减少动态时，Motion 的位移/布局动画自动降为瞬时（1.4.0） */}
      <MotionConfig reducedMotion="user">
      <div className="app-shell">
        <main ref={mainRef} className="scroll-area" onScroll={handleScroll}>
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={pageTransition}>
            {views[tab]}
          </motion.div>
        </main>
        <MiniBar />
        <Tabs />
        <PlayerView />
        <LyricView />
        <QueueView />
        <SongMenu />
        <SelectionBar />
        <OnboardingGuide />
        <Toast />
        <span className="sr-only" aria-live="polite">当前页面：{tab}</span>
      </div>
      </MotionConfig>
    </ErrorBoundary>
  )
}
