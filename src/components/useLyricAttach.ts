import { useRef, useState } from 'react'
import { readLyricFile } from '../lib/lyricFile'
import { attachLyricsToTrack } from '../store/bootstrap'

/**
 * 「给某首歌导入歌词文件」的共享交互：隐藏文件框 + 打开/处理逻辑。
 * 用法：把 inputRef/onChange 绑到一个隐藏的 <input type="file"> 上，
 * 点入口时调 openPicker(曲目下标)。读不到歌词时 error 给出提示文案。
 */
export function useLyricAttach(onAttached?: () => void) {
  const inputRef = useRef<HTMLInputElement>(null)
  const targetRef = useRef<number | null>(null)
  const [error, setError] = useState('')

  const openPicker = (index: number) => {
    targetRef.current = index
    setError('')
    inputRef.current?.click()
  }

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || targetRef.current === null) return
    const lines = await readLyricFile(file)
    if (!lines.length) {
      setError('这个文件里没读到歌词，换一个试试')
      return
    }
    await attachLyricsToTrack(targetRef.current, lines)
    setError('')
    onAttached?.()
  }

  return { inputRef, openPicker, onChange, error }
}
