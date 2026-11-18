import SongRow from './SongRow'
import ImportButton from './ImportButton'
import { useStore, playSets } from '../store'

export default function HomeView() {
  const setPlayerOpen = useStore((s) => s.setPlayerOpen)
  const cur = useStore((s) => s.cur)
  const tracks = useStore((s) => s.tracks)
  const localCount = tracks.filter((t) => t.source === 'local').length

  return (
    <div className="px-4 pt-6">
      <div className="mb-6">
        <p className="text-xs tracking-widest" style={{ color: 'var(--accent)' }}>SHIYIN · 诗音</p>
        <h1 className="mt-1 text-2xl font-bold">下午好，愿你听见好心情</h1>
      </div>

      <section className="mb-7">
        <h2 className="mb-3 text-base font-semibold">推荐歌单</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none]">
          {playSets.map((set) => (
            <div key={set.name} className="w-36 shrink-0">
              <div
                className="cover grid h-36 w-36 place-items-end rounded-2xl p-3 text-white shadow-md"
                style={{ ['--cover' as string]: set.color }}
              >
                <span className="text-sm font-semibold drop-shadow">{set.name}</span>
              </div>
              <p className="mt-2 truncate text-xs text-black/50">{set.meta}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-base font-semibold">全部曲目</h2>
          <span className="text-xs text-black/40">
            {localCount > 0 ? `本地 ${localCount} 首 · 示例 ${tracks.length - localCount} 首` : '示例数据'}
          </span>
        </div>

        <ImportButton className="mb-3 w-full" />

        <div onClick={() => setPlayerOpen(true)}>
          {tracks.map((s, i) => <SongRow key={s.id} index={i} />)}
        </div>
        <p className="mt-2 text-center text-[11px] text-black/35">
          点击任意曲目展开播放器（当前第 {cur + 1} 首）
        </p>
      </section>
    </div>
  )
}
