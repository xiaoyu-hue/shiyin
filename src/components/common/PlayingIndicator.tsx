interface Props {
  /** 是否正在播放：暂停时律动条定格在低位（同一语言表达两种状态） */
  playing: boolean
  className?: string
}

const BARS = [
  { delay: '0s', duration: '0.9s' },
  { delay: '0.25s', duration: '0.7s' },
  { delay: '0.1s', duration: '1.05s' },
  { delay: '0.4s', duration: '0.8s' },
]

/**
 * 统一「正在播放」视觉语言（1.4.0）：四根律动条。
 * 此前播放状态有三套表达（播放页转盘、迷你条脉冲封面、列表脉冲点）互不相认；
 * 现在列表 / 队列 / 迷你条共用这一套，播放页转盘与之呼应（同为「动/静」语义）。
 * 动画只动 transform: scaleY（合成层友好）；系统减少动态时 CSS 已全局停用。
 */
export default function PlayingIndicator({ playing, className = '' }: Props) {
  return (
    <span className={`flex h-3.5 items-end gap-[2.5px] ${className}`} aria-hidden>
      {BARS.map((b, i) => (
        <span
          key={i}
          className="eq-bar w-[3px] rounded-full"
          style={{
            height: '100%',
            background: 'var(--accent)',
            animationDelay: b.delay,
            animationDuration: b.duration,
            animationPlayState: playing ? 'running' : 'paused',
            transform: playing ? undefined : 'scaleY(0.3)',
          }}
        />
      ))}
    </span>
  )
}
