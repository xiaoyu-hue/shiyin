/**
 * 骨架屏（1.4.0）：本地曲目恢复完成前显示与真实行同形的占位，
 * 取代冷启动时一闪而过的「还没有音乐」空态（误导用户以为歌没了）。
 * 形状与 SongRow 对齐（48px 封面 + 两行文字），恢复完成切换时不跳版。
 */
export function SkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <div className="animate-pulse" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-2.5">
          <div className="h-12 w-12 shrink-0 rounded-[var(--r-cover)] bg-ink/10" />
          <div className="min-w-0 flex-1">
            <div className="h-4 w-2/5 rounded-full bg-ink/10" />
            <div className="mt-2 h-3 w-3/5 rounded-full bg-ink/8" />
          </div>
          <div className="h-3 w-8 shrink-0 rounded-full bg-ink/8" />
        </div>
      ))}
    </div>
  )
}
