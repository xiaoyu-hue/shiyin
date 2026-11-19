/**
 * 安卓层级返回（1.1.0）：系统返回手势/按键的接管与分发。
 *
 * 分发顺序（从最上层往下）：
 * 1. 弹层栈（lib/backStack 单例）：歌曲菜单、队列、睡眠菜单、海报等弹层
 *    打开时登记自己的关闭处理器，后登记先处理；
 * 2. 视图层级链：歌词页 → 播放页 → 音乐库详情 / 「我的」二级页 → 非主页 Tab；
 * 3. 已在主页根层：minimizeApp() 切后台保播放——直接退出会销毁 WebView，
 *    连带弄断后台播放推进，所以根层不退出。
 *
 * 仅原生环境注册监听；网页端 registerBackHandler 仍可登记（无副作用）。
 * 纯分发逻辑在 lib/backStack.ts（有单测），本模块只做平台接线。
 */
import { createBackDispatcher, type BackHandler } from '../lib/backStack'
import { useStore } from '../store/index'
import { isNativePlatform } from './env'

const dispatcher = createBackDispatcher()

/** 弹层打开时登记关闭处理器，返回注销函数（关闭/卸载时调用） */
export function registerBackHandler(handler: BackHandler): () => void {
  return dispatcher.register(handler)
}

let bound = false

/** 应用生命周期内只绑定一次；非原生环境为空操作 */
export function bindBackButton(): void {
  if (bound) return
  bound = true
  if (!isNativePlatform()) return

  void import('@capacitor/app')
    .then(({ App }) => {
      void App.addListener('backButton', () => {
        if (dispatcher.dispatch()) return
        const s = useStore.getState()
        if (s.lyricOpen) {
          s.setLyricOpen(false)
        } else if (s.playerOpen) {
          s.setPlayerOpen(false)
        } else if (s.libraryDetail) {
          s.setLibraryDetail(null)
        } else if (s.mePage) {
          s.setMePage(null)
        } else if (s.tab !== 'home') {
          s.setTab('home')
        } else {
          void App.minimizeApp().catch(() => undefined)
        }
      }).catch(() => undefined)
    })
    .catch(() => undefined)
}
