import { create } from 'zustand'
import { themes, playSets } from '../data/sample'
import { createPlayerSlice } from './playerSlice'
import { createUiSlice } from './uiSlice'
import { createCollectionSlice } from './collectionSlice'
import { createThemeSlice } from './themeSlice'
import type { AppState } from './types'

/**
 * 统一 store：由 player / ui / collection / theme 四个 slice 组装（架构 §4.2）。
 * 对外 selector 与动作签名保持不变，组件无需感知切片划分。
 * 曲目列表以 store 中的 tracks 为唯一数据源（内置示例曲 + 本地导入曲）。
 */
export const useStore = create<AppState>()((...a) => ({
  ...createPlayerSlice(...a),
  ...createUiSlice(...a),
  ...createCollectionSlice(...a),
  ...createThemeSlice(...a),
}))

export { themes, playSets }
