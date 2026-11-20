import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from './index'

/** Toast 轻反馈状态（1.4.0）：弹出、连发递增 id、按 id 关闭不误伤新提示 */
describe('Toast 状态', () => {
  beforeEach(() => {
    useStore.setState({ toast: null, chromeCompact: false })
  })

  it('showToast 写入提示且 id 递增（同文案连发也重新计时）', () => {
    useStore.getState().showToast('已排到下一首播放')
    const first = useStore.getState().toast
    expect(first?.message).toBe('已排到下一首播放')
    useStore.getState().showToast('已排到下一首播放')
    const second = useStore.getState().toast
    expect(second?.id).toBe((first?.id ?? 0) + 1)
  })

  it('clearToast 只关对应 id，过期 id 不误关新提示', () => {
    useStore.getState().showToast('甲')
    const oldId = useStore.getState().toast?.id ?? -1
    useStore.getState().showToast('乙')
    useStore.getState().clearToast(oldId)
    expect(useStore.getState().toast?.message).toBe('乙')
    const curId = useStore.getState().toast?.id ?? -1
    useStore.getState().clearToast(curId)
    expect(useStore.getState().toast).toBeNull()
  })

  it('chromeCompact 可读写', () => {
    useStore.getState().setChromeCompact(true)
    expect(useStore.getState().chromeCompact).toBe(true)
    useStore.getState().setChromeCompact(false)
    expect(useStore.getState().chromeCompact).toBe(false)
  })
})
