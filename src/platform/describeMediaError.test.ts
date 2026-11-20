import { describe, expect, it } from 'vitest'
import { describeMediaError } from './web'

describe('describeMediaError 媒体错误文案（审计 A-39）', () => {
  it('四个标准错误码各有大白话', () => {
    expect(describeMediaError(1)).toBe('播放被中断')
    expect(describeMediaError(2)).toBe('网络读取失败')
    expect(describeMediaError(3)).toBe('音频解码失败，文件可能已损坏')
    expect(describeMediaError(4)).toBe('浏览器不支持该音频格式')
  })

  it('未知/缺失错误码回退通用文案', () => {
    expect(describeMediaError(99)).toBe('音频播放失败')
    expect(describeMediaError(undefined)).toBe('音频播放失败')
  })
})
