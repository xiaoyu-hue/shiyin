import { describe, expect, it } from 'vitest'
import { parseTestHook } from './tauriDesktop'

describe('parseTestHook（CI 测试钩子内容解析）', () => {
  it('合法的字符串数组原样返回', () => {
    expect(parseTestHook('["C:/a.wav", "D:/b.mp3"]')).toEqual(['C:/a.wav', 'D:/b.mp3'])
  })

  it('非数组、坏 JSON、空数组都按无钩子处理', () => {
    expect(parseTestHook('{"files": []}')).toEqual([])
    expect(parseTestHook('not json')).toEqual([])
    expect(parseTestHook('[]')).toEqual([])
  })

  it('混入的非字符串与空字符串被过滤', () => {
    expect(parseTestHook('["a.wav", 42, "", null]')).toEqual(['a.wav'])
  })
})
