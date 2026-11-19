/**
 * 页面 Media Session（W3C 标准 API）：把播放状态同步给宿主系统的媒体控件，
 * 并把系统侧动作（键盘媒体键、系统音量浮层按钮）转发回 store。
 *
 * 启用环境：普通网页与 Tauri 桌面（WebView2 的 Media Session 会接到
 * Windows 的系统媒体传输控件 SMTC，媒体键因此到达页面）。
 * Capacitor 安卓环境不启用——其 WebView 禁用了该 API，改走
 * mediaSessionNative 的插件桥，两边动作语义保持一致。
 *
 * 与原生桥同一套同步策略：元数据按曲目+封面地址去重、播放态按值去重、
 * 进度按整秒节流。API 不可用（老浏览器）时整体静默跳过。
 */
import { useStore } from '../store/index'
import { isCapacitorPlatform } from './env'

let bound = false

/** 应用生命周期内只绑定一次；Capacitor 环境或 API 不可用时为空操作 */
export function bindWebMediaSession(): void {
  if (bound) return
  bound = true
  if (isCapacitorPlatform()) return
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
  const ms = navigator.mediaSession

  const s = () => useStore.getState()
  const setHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
    try {
      ms.setActionHandler(action, handler)
    } catch {
      // 个别宿主不支持某些动作（如 seekto），忽略单个动作失败
    }
  }

  setHandler('play', () => {
    if (!s().playing) s().toggle()
  })
  setHandler('pause', () => {
    if (s().playing) s().toggle()
  })
  setHandler('previoustrack', () => s().prev())
  setHandler('nexttrack', () => s().next())
  setHandler('seekto', (details) => {
    if (typeof details.seekTime === 'number') s().seek(details.seekTime)
  })
  setHandler('seekbackward', (details) => {
    s().seek(Math.max(0, s().pos - (details.seekOffset || 10)))
  })
  setHandler('seekforward', (details) => {
    s().seek(s().pos + (details.seekOffset || 10))
  })
  setHandler('stop', () => {
    if (s().playing) s().toggle()
  })

  let lastMetaKey = ''
  let lastStateKey = ''
  let lastPosSec = -1
  const sync = () => {
    const state = s()
    const track = state.tracks[state.cur]
    if (!track) {
      if (lastStateKey !== 'none') {
        lastStateKey = 'none'
        try {
          ms.playbackState = 'none'
        } catch {
          /* 宿主不支持时忽略 */
        }
      }
      return
    }
    const metaKey = `${track.id}|${track.name}|${track.artist}|${track.album}|${track.coverSrc ?? ''}`
    if (metaKey !== lastMetaKey) {
      lastMetaKey = metaKey
      lastPosSec = -1
      try {
        ms.metadata = new MediaMetadata({
          title: track.name,
          artist: track.artist,
          album: track.album,
          artwork: track.coverSrc ? [{ src: track.coverSrc }] : undefined,
        })
      } catch {
        /* 元数据设置失败不影响播放 */
      }
    }
    const stateKey = state.playing ? 'playing' : 'paused'
    if (stateKey !== lastStateKey) {
      lastStateKey = stateKey
      try {
        ms.playbackState = stateKey
      } catch {
        /* 同上 */
      }
    }
    const posSec = Math.floor(state.pos)
    if (posSec !== lastPosSec && track.dur > 0 && typeof ms.setPositionState === 'function') {
      lastPosSec = posSec
      try {
        ms.setPositionState({
          duration: track.dur,
          position: Math.min(state.pos, track.dur),
          playbackRate: state.playing ? 1 : 0,
        })
      } catch {
        /* 位置状态是锦上添花，失败忽略 */
      }
    }
  }
  useStore.subscribe(sync)
  sync()
}
