// @vitest-environment happy-dom
/**
 * 组件冒烟测试（审计 A-07）：happy-dom + Testing Library 试点，
 * 只验「真实 store 状态下能渲染出关键内容且不抛错」，不验像素与布局
 * （布局隔离由构建产物 CSS 与真机/CI 截图矩阵把关）。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import MiniBar from './MiniBar'
import Tabs from './Tabs'
import SongRow from './SongRow'
import { useStore } from '../store'
import type { Song } from '../data/types'

function mkSong(id: number, name: string): Song {
  return {
    id,
    name,
    artist: '测试歌手',
    album: '测试专辑',
    dur: 200,
    color: '#123456',
    lyrics: [],
    audioSrc: 'blob:fake',
  }
}

beforeEach(() => {
  useStore.setState({
    tracks: [mkSong(1, '测试之歌'), mkSong(2, '第二首测试歌')],
    cur: 0,
    playing: false,
    tab: 'home',
    playerOpen: false,
    lyricOpen: false,
    selectionMode: false,
    selected: new Set<number>(),
  })
})

describe('组件冒烟', () => {
  it('MiniBar 渲染当前曲目名与歌手', () => {
    render(<MiniBar />)
    expect(screen.getByText('测试之歌')).toBeTruthy()
    expect(screen.getByText(/测试歌手/)).toBeTruthy()
  })

  it('Tabs 渲染四个主导航标签', () => {
    render(<Tabs />)
    for (const label of ['主页', '搜索', '音乐库', '我的']) {
      expect(screen.getByText(label)).toBeTruthy()
    }
  })

  it('SongRow 渲染指定下标曲目并带可访问角色', () => {
    render(<SongRow index={1} context={[0, 1]} />)
    expect(screen.getByText('第二首测试歌')).toBeTruthy()
  })
})
