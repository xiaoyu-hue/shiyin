/**
 * 原生媒体会话桥（1.0.0 转正；spike 阶段已真机验证锁屏控制链路成立）。
 *
 * 作用：把播放状态同步给手机系统媒体会话（锁屏/通知栏控制条），并把系统侧的
 * 播放/暂停/上一首/下一首动作转发回 store。播放引擎仍是网页的 HTMLAudio，
 * 靠插件的前台服务在息屏/后台保活。
 *
 * 仅在 Capacitor 原生环境启用；普通浏览器里直接返回，网页版行为零变化。
 * 插件 API 以 @capgo/capacitor-media-session 的类型定义为准（与 W3C Media Session 同构）：
 * setMetadata / setPlaybackState / setPositionState / setActionHandler。
 */
import { MediaSession } from '@capgo/capacitor-media-session'
import { useStore } from '../store/index'
import { isNativePlatform } from './env'

let bound = false

/** 应用生命周期内只绑定一次；非原生环境为空操作 */
export function bindNativeMediaSession(): void {
  if (bound) return
  bound = true
  if (!isNativePlatform()) return

  const s = () => useStore.getState()
  const ignore = () => undefined

  // 系统侧动作 → store 现有动作（toggle 为播放/暂停切换，按当前状态收敛）
  void MediaSession.setActionHandler({ action: 'play' }, () => {
    if (!s().playing) s().toggle()
  }).catch(ignore)
  void MediaSession.setActionHandler({ action: 'pause' }, () => {
    if (s().playing) s().toggle()
  }).catch(ignore)
  void MediaSession.setActionHandler({ action: 'previoustrack' }, () => s().prev()).catch(ignore)
  void MediaSession.setActionHandler({ action: 'nexttrack' }, () => s().next()).catch(ignore)
  void MediaSession.setActionHandler({ action: 'seekto' }, (details) => {
    if (typeof details.seekTime === 'number') s().seek(details.seekTime)
  }).catch(ignore)
  void MediaSession.setActionHandler({ action: 'seekbackward' }, () => {
    s().seek(Math.max(0, s().pos - 10))
  }).catch(ignore)
  void MediaSession.setActionHandler({ action: 'seekforward' }, () => {
    s().seek(s().pos + 10)
  }).catch(ignore)
  void MediaSession.setActionHandler({ action: 'stop' }, () => {
    if (s().playing) s().toggle()
  }).catch(ignore)

  // store → 系统侧：曲目/播放态变化时同步元数据与状态，进度按整秒节流同步
  let lastMetaKey = ''
  let lastStateKey = ''
  let lastPosSec = -1
  const sync = () => {
    const state = s()
    const track = state.tracks[state.cur]
    if (!track) {
      if (lastStateKey !== 'none') {
        lastStateKey = 'none'
        void MediaSession.setPlaybackState({ playbackState: 'none' }).catch(ignore)
      }
      return
    }
    // 封面地址纳入 metaKey：恢复完成后 coverSrc 从空变为文件地址时也要刷新一次元数据
    const metaKey = `${track.id}|${track.name}|${track.artist}|${track.album}|${track.coverSrc ?? ''}`
    if (metaKey !== lastMetaKey) {
      lastMetaKey = metaKey
      lastPosSec = -1
      void MediaSession.setMetadata({
        title: track.name,
        artist: track.artist,
        album: track.album,
        // 1.0.0 起封面是 App 本地文件服务地址（convertFileSrc），与音频同源，
        // 系统侧应可直接加载；真机显示效果仍属验收项
        artwork: track.coverSrc ? [{ src: track.coverSrc }] : undefined,
      }).catch(ignore)
    }
    const stateKey = state.playing ? 'playing' : 'paused'
    if (stateKey !== lastStateKey) {
      lastStateKey = stateKey
      void MediaSession.setPlaybackState({ playbackState: stateKey }).catch(ignore)
    }
    const posSec = Math.floor(state.pos)
    if (posSec !== lastPosSec && track.dur > 0) {
      lastPosSec = posSec
      void MediaSession.setPositionState({
        duration: track.dur,
        position: Math.min(state.pos, track.dur),
        playbackRate: state.playing ? 1 : 0,
      }).catch(ignore)
    }
  }
  useStore.subscribe(sync)
  sync()
}
