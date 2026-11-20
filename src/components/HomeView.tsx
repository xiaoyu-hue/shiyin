import { useEffect, useMemo, useState } from 'react'
import SongRow from './SongRow'
import ImportButton from './ImportButton'
import BatteryGuideCard from './BatteryGuideCard'
import EmptyState from './common/EmptyState'
import { SkeletonRows } from './common/Skeleton'
import { useStore } from '../store'
import { greetingLine } from '../lib/greeting'
import { groupAlbums } from '../lib/library'
import type { Song } from '../data/types'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

/**
 * 主页（1.4.0 编辑排版式重构）：大字问候做视觉主角，其下按「继续聆听 /
 * 最近添加 / 随机推荐 / 专辑」四条横轨组织内容，最后才是全部曲目列表——
 * 此前主页与音乐库歌曲页几乎同貌，两个标签内容重复（审计-原创性）。
 * 横轨数据为空时整轨不渲染，不留空架子。
 */
export default function HomeView() {
  const setPlayerOpen = useStore((s) => s.setPlayerOpen)
  const tracks = useStore((s) => s.tracks)
  const history = useStore((s) => s.history)
  const liked = useStore((s) => s.liked)
  const play = useStore((s) => s.play)
  // 恢复未完成时先上骨架屏，避免冷启动闪一帧「还没有音乐」误导用户
  const restored = useStore((s) => s.restored)
  // 问候语跟随实时时间：每分钟刷新一次，跨时段自动切换
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const indexed = useMemo(() => tracks.map((song, index) => ({ song, index })), [tracks])
  const continueRail = useMemo(
    () => history.filter((i) => tracks[i]).slice(0, 8),
    [history, tracks],
  )
  const recentRail = useMemo(
    () => [...indexed].sort((a, b) => (b.song.addedAt ?? 0) - (a.song.addedAt ?? 0)).slice(0, 8).map((x) => x.index),
    [indexed],
  )
  const randomRail = useMemo(() => {
    const all = indexed.map((x) => x.index)
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[all[i], all[j]] = [all[j], all[i]]
    }
    return all.slice(0, 6)
    // 曲目集合变化时才重洗（同一会话内反复进出主页会换一批，是有意的「刷新感」）
  }, [indexed])
  const albums = useMemo(() => groupAlbums(indexed), [indexed])

  const playFromRail = (index: number, context: number[]) => {
    play(index, context)
    setPlayerOpen(true)
  }

  const dateLine = `${now.getMonth() + 1}月${now.getDate()}日 · 星期${WEEKDAYS[now.getDay()]}`

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6">
      <header className="mb-7">
        <div className="flex items-baseline justify-between">
          <p className="text-sub font-medium tracking-widest" style={{ color: 'var(--accent)' }}>SHIYIN · 诗音</p>
          <p className="text-sub text-ink3">{dateLine}</p>
        </div>
        <h1 className="mt-2 text-hero font-bold leading-tight tracking-tight">{greetingLine(now)}</h1>
        {restored && tracks.length > 0 && (
          <p className="mt-2 text-body text-ink2">
            {tracks.length} 首歌 · {liked.size} 首收藏 · 都存在这台设备里
          </p>
        )}
      </header>

      <BatteryGuideCard />

      {!restored ? (
        <SkeletonRows count={6} />
      ) : tracks.length === 0 ? (
        <>
          <ImportButton className="mb-3 w-full" />
          <EmptyState icon="🎵" title="还没有音乐" description="导入你自己的本地音乐文件，就可以开始听了" />
        </>
      ) : (
        <>
          {continueRail.length > 0 && (
            <RailSection title="继续聆听">
              {continueRail.map((i) => (
                <CoverCard key={tracks[i].id} song={tracks[i]} sub={tracks[i].artist} onPlay={() => playFromRail(i, continueRail)} />
              ))}
            </RailSection>
          )}

          <RailSection title="最近添加">
            {recentRail.map((i) => (
              <CoverCard key={tracks[i].id} song={tracks[i]} sub={tracks[i].artist} onPlay={() => playFromRail(i, recentRail)} />
            ))}
          </RailSection>

          {tracks.length >= 3 && (
            <RailSection title="随机推荐">
              {randomRail.map((i) => (
                <CoverCard key={tracks[i].id} song={tracks[i]} sub={tracks[i].artist} onPlay={() => playFromRail(i, randomRail)} />
              ))}
            </RailSection>
          )}

          <RailSection title="专辑">
            {albums.map((a) => (
              <CoverCard
                key={a.name}
                song={a.items[0].song}
                title={a.name}
                sub={`${a.artist} · ${a.items.length} 首`}
                onPlay={() => playFromRail(a.items[0].index, a.items.map((x) => x.index))}
              />
            ))}
          </RailSection>

          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-heading font-semibold">全部曲目</h2>
              <span className="text-sub text-ink2">共 {tracks.length} 首</span>
            </div>
            <ImportButton className="mb-3 w-full" />
            <div
              onClick={() => {
                // 多选模式下点行只切换选中，不冒泡打开播放页（1.2.0）
                if (useStore.getState().selection === null) setPlayerOpen(true)
              }}
            >
              {tracks.map((s, i) => <SongRow key={s.id} index={i} context={tracks.map((_, j) => j)} />)}
            </div>
            <p className="mt-2 text-center text-caption text-ink3">点歌展开播放器 · 长按多选 · 右滑排到下一首</p>
          </section>
        </>
      )}
    </div>
  )
}

function RailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="mb-3 text-heading font-semibold">{title}</h2>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </section>
  )
}

interface CardProps {
  song: Song
  /** 卡片主标题（默认歌名；专辑轨传专辑名） */
  title?: string
  sub: string
  onPlay: () => void
}

function CoverCard({ song, title, sub, onPlay }: CardProps) {
  return (
    <button onClick={onPlay} className="w-[104px] shrink-0 text-left" aria-label={`播放 ${title ?? song.name}`}>
      <span
        className="cover relative grid h-[104px] w-[104px] place-items-center overflow-hidden rounded-[var(--r-cover)] text-white shadow-sm"
        style={{ ['--cover' as string]: song.color }}
      >
        {song.coverSrc ? (
          <img src={song.thumbSrc ?? song.coverSrc} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="text-3xl font-bold">{(title ?? song.name).charAt(0)}</span>
        )}
      </span>
      <span className="mt-2 block truncate text-sub font-medium">{title ?? song.name}</span>
      <span className="block truncate text-caption text-ink3">{sub}</span>
    </button>
  )
}
