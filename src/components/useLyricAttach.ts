import { useRef, useState } from 'react'
import { readLyricFile } from '../lib/lyricFile'
import { attachLyricsToTrack } from '../store/bootstrap'
import { pickFiles } from '../platform/pickFiles'

/**
 * 「给某首歌导入歌词文件」的共享交互：隐藏文件框 + 打开/处理逻辑。
 * 用法：把 inputRef/onChange 绑到一个隐藏的 <input type="file"> 上，
 * 点入口时调 openPicker(曲目下标)。读不到歌词时 error 给出提示文案。
 * 原生环境下 openPicker 改走系统文件选择器（单选），后续处理与网页一致，
 * 调用方无需感知平台差异；隐藏 input 在原生下不会被触发。
 */
export function useLyricAttach(onAttached?: () => void) {
  const inputRef = useRef<HTMLInputElement>(null)
  const targetRef = useRef<number | null>(null)
  const [error, setError] = useState('')

  const attachFile = async (file: File, index: number) => {
    const lines = await readLyricFile(file)
    if (!lines.length) {
      setError('这个文件里没读到歌词，换一个试试')
      return
    }
    await attachLyricsToTrack(index, lines)
    setError('')
    onAttached?.()
  }

  const openPicker = (index: number) => {
    targetRef.current = index
    setError('')
    // 三端分流统一走 platform/pickFiles（审计 A-32）；网页端返回 null 时点开隐藏 input
    void (async () => {
      const files = await pickFiles(1)
      if (files === null) {
        inputRef.current?.click()
        return
      }
      if (files.length) await attachFile(files[0], index)
    })()
  }

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || targetRef.current === null) return
    await attachFile(file, targetRef.current)
  }

  return { inputRef, openPicker, onChange, error }
}
