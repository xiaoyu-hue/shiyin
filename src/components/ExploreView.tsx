import SongRow from './SongRow'
import { useStore } from '../store'

export default function ExploreView() {
  const tracks = useStore((s) => s.tracks)
  const ranked = tracks.map((_, i) => i).slice(0, 6)

  return (
    <div className="px-4 pt-6">
      <div className="mb-6">
        <p className="text-xs tracking-widest" style={{ color: 'var(--accent)' }}>DISCOVER</p>
        <h1 className="mt-1 text-2xl font-bold">发现</h1>
      </div>

      <section className="mb-7">
        <h2 className="mb-3 text-base font-semibold">今日推荐</h2>
        <div
          className="relative overflow-hidden rounded-3xl p-5 text-white shadow-lg"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--bg-end))' }}
        >
          <p className="text-xs opacity-80">为你挑选</p>
          <p className="mt-1 text-xl font-bold">慢下来，听一首</p>
          <p className="mt-2 text-xs opacity-80">导入本地音乐后可直接播放</p>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-base font-semibold">热歌榜</h2>
        {ranked.map((i, rank) => (
          <SongRow key={tracks[i].id} index={i} rank={rank + 1} />
        ))}
      </section>
    </div>
  )
}
