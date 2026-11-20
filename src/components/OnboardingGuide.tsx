import { useEffect } from 'react'
import { useStore } from '../store'
import { shouldShowOnboarding } from '../lib/onboarding'
import { registerBackHandler } from '../platform/backButton'
import ImportButton from './ImportButton'
import { useSheetFocus } from './common/useSheetFocus'
import { ArrowUp, ListPlus, MousePointerClick } from 'lucide-react'

/**
 * 首启导入引导（1.2.0）：曲库为空且从未引导过时，全屏引导用户走完第一次导入。
 * 触发判断是纯函数（lib/onboarding，有单测）；导入完成或点「稍后再说」都落
 * onboarded 标记（随偏好持久化），之后不再出现。网页与 App 都适用。
 * 与电池提示卡的先后：引导是全屏层、盖住主页，关掉引导后电池卡才按原逻辑露出。
 */
export default function OnboardingGuide() {
  const restored = useStore((s) => s.restored)
  const trackCount = useStore((s) => s.tracks.length)
  const onboarded = useStore((s) => s.onboarded)
  const setOnboarded = useStore((s) => s.setOnboarded)

  const show = shouldShowOnboarding({ restored, trackCount, onboarded })
  const panelRef = useSheetFocus<HTMLDivElement>(show)

  // 安卓返回登记：引导开着时返回按「稍后再说」处理（落标记并关闭引导）
  useEffect(() => {
    if (!show) return
    return registerBackHandler(() => {
      setOnboarded(true)
      return true
    })
  }, [show, setOnboarded])

  if (!show) return null

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center px-8 text-center"
      style={{
        background: 'linear-gradient(160deg, var(--bg) 0%, var(--bg-end) 100%)',
        paddingTop: 'var(--sat)',
        paddingBottom: 'var(--sab)',
      }}
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="欢迎使用诗音"
    >
      <div
        className="cover relative mb-7 grid h-36 w-36 place-items-center overflow-hidden rounded-full shadow-2xl ring-1 ring-white/50"
        style={{ ['--cover' as string]: 'var(--accent)' }}
        aria-hidden
      >
        <div className="h-10 w-10 rounded-full bg-black/25 ring-8 ring-white/20" />
      </div>
      <p className="text-sub tracking-widest" style={{ color: 'var(--accent)' }}>
        SHIYIN · 诗音
      </p>
      <h2 className="mt-2 text-title font-bold">欢迎来到诗音</h2>
      <p className="mt-3 max-w-xs text-body leading-relaxed text-ink2">
        诗音只播放你设备里的音乐文件：不联网、不上传、没有账号。
        先选几首你喜欢的歌导进来，就能开始听了。
      </p>
      {/* 手势教学（1.4.0）：三个核心手势此前全靠用户自己发现，这里一次讲清 */}
      <div className="mt-7 flex w-full max-w-xs flex-col gap-2.5 text-left">
        {[
          { icon: MousePointerClick, text: '长按一首歌，可以多选批量操作' },
          { icon: ListPlus, text: '右滑一首歌，把它排到下一首播放' },
          { icon: ArrowUp, text: '上滑底部小条，展开全屏播放页' },
        ].map(({ icon: Icon, text }) => (
          <p key={text} className="flex items-center gap-2.5 text-sub text-ink2">
            <span className="glass grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ color: 'var(--accent)' }}>
              <Icon size={15} />
            </span>
            {text}
          </p>
        ))}
      </div>
      <ImportButton
        primary
        label="选择音乐导入"
        onDone={() => setOnboarded(true)}
        className="mt-9 w-full max-w-xs"
      />
      <button
        type="button"
        onClick={() => setOnboarded(true)}
        className="mt-3 min-h-11 rounded-full px-5 text-body text-ink2 transition-transform active:scale-[0.97]"
      >
        稍后再说
      </button>
    </div>
  )
}
