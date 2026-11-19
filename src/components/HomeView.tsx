import SongRow from './SongRow'
import ImportButton from './ImportButton'
import EmptyState from './common/EmptyState'
import { useStore } from '../store'

export default function HomeView() {
  const setPlayerOpen = useStore((s) => s.setPlayerOpen)
  const tracks = useStore((s) => s.tracks)

  return (
    <div className="px-4 pt-6">
      <div className="mb-6">
        <p className="text-xs tracking-widest" style={{ color: 'var(--accent)' }}>SHIYIN · 诗音</p>
        <h1 className="mt-1 text-2xl font-bold">下午好，愿你听见好心情</h1>
      </div>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-base font-semibold">全部曲目</h2>
          <span className="text-xs text-black/40">{tracks.length > 0 ? `共 ${tracks.length} 首` : ''}</span>
        </div>

        <ImportButton className="mb-3 w-full" />

        {tracks.length === 0 ? (
          <EmptyState icon="🎵" title="还没有音乐" description="导入你自己的本地音乐文件，就可以开始听了" />
        ) : (
          <>
            <div onClick={() => setPlayerOpen(true)}>
              {tracks.map((s, i) => <SongRow key={s.id} index={i} />)}
            </div>
            <p className="mt-2 text-center text-[11px] text-black/35">点击任意曲目展开播放器</p>
          </>
        )}
      </section>
    </div>
  )
}
