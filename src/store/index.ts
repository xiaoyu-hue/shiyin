import { create } from 'zustand'
import { themes } from '../data/themes'
import { createPlayerSlice } from './playerSlice'
import { createUiSlice } from './uiSlice'
import { createCollectionSlice } from './collectionSlice'
import { createThemeSlice } from './themeSlice'
import type { AppState } from './types'

/**
 * 统一 store：由 player / ui / collection / theme 四个 slice 组装（架构 §4.2）。
 * 对外 selector 与动作签名保持不变，组件无需感知切片划分。
 * 曲目列表以 store 中的 tracks 为唯一数据源（全部为用户导入的本地曲目）。
 */
export const useStore = create<AppState>()((...a) => ({
  ...createPlayerSlice(...a),
  ...createUiSlice(...a),
  ...createCollectionSlice(...a),
  ...createThemeSlice(...a),
}))

export { themes }
