/**
 * 睡眠定时到期检查测试（审计 A-39）：checkSleepDue 的状态副作用——
 * 到期停播并清两枚定时标记、未到期不动、无定时不动。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { checkSleepDue } from './bootstrap'
import { useStore } from './index'

beforeEach(() => {
  useStore.setState({ playing: true, sleepEndsAt: null, sleepAfterTrack: false })
})

describe('checkSleepDue', () => {
  it('已到期：停播并清除定时标记', () => {
    useStore.setState({ sleepEndsAt: Date.now() - 1000, sleepAfterTrack: true })
    checkSleepDue()
    const s = useStore.getState()
    expect(s.playing).toBe(false)
    expect(s.sleepEndsAt).toBeNull()
    expect(s.sleepAfterTrack).toBe(false)
  })

  it('未到期：状态不变', () => {
    const endsAt = Date.now() + 60000
    useStore.setState({ sleepEndsAt: endsAt })
    checkSleepDue()
    const s = useStore.getState()
    expect(s.playing).toBe(true)
    expect(s.sleepEndsAt).toBe(endsAt)
  })

  it('无定时：状态不变', () => {
    checkSleepDue()
    expect(useStore.getState().playing).toBe(true)
  })
})
