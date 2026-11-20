import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Download, Share2, X } from 'lucide-react'
import type { Song } from '../data/types'
import { computePosterLayout, POSTER_H, POSTER_MAX_LINES, POSTER_W, toggleLineSelection, truncateToWidth } from '../lib/poster'
import { extractCoverGlow, parseHexColor, rgbCss, softenColor } from '../lib/coverColor'
import { springDrawer, scrimTransition } from '../lib/motion'
import { useSheetDrag } from './common/useSheetDrag'
import { registerBackHandler } from '../platform/backButton'

const FONT_STACK = '-apple-system, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** 把图片按 cover 方式画进目标框（裁切填满） */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const dw = img.naturalWidth * scale
  const dh = img.naturalHeight * scale
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** 海报绘制：封面色彩场 + 封面缩略 + 歌名歌手 + 所选歌词 + 落款，全部本地完成 */
async function drawPoster(canvas: HTMLCanvasElement, song: Song, lineTexts: string[], tintCss: string): Promise<void> {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 背景：色彩渐变打底
  const grad = ctx.createLinearGradient(0, 0, 0, POSTER_H)
  grad.addColorStop(0, tintCss)
  grad.addColorStop(1, '#171310')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, POSTER_W, POSTER_H)

  const img = song.coverSrc ? await loadImage(song.coverSrc) : null
  if (img) {
    // 封面重度模糊铺满作色彩场（放大画布避免模糊边缘露底）
    ctx.save()
    try {
      ctx.filter = 'blur(48px) saturate(1.25)'
    } catch {
      /* 个别浏览器不支持画布滤镜，靠下面的压暗渐变兜底 */
    }
    drawCover(ctx, img, -90, -90, POSTER_W + 180, POSTER_H + 180)
    ctx.restore()
    // 压暗渐变保证文字可读
    const veil = ctx.createLinearGradient(0, 0, 0, POSTER_H)
    veil.addColorStop(0, 'rgba(15,12,9,0.25)')
    veil.addColorStop(0.55, 'rgba(15,12,9,0.45)')
    veil.addColorStop(1, 'rgba(15,12,9,0.78)')
    ctx.fillStyle = veil
    ctx.fillRect(0, 0, POSTER_W, POSTER_H)
  }

  // 封面缩略（圆角）居中置顶
  const thumb = 200
  const tx = (POSTER_W - thumb) / 2
  const ty = 150
  ctx.save()
  roundRectPath(ctx, tx, ty, thumb, thumb, 28)
  ctx.clip()
  if (img) {
    drawCover(ctx, img, tx, ty, thumb, thumb)
  } else {
    ctx.fillStyle = song.color
    ctx.fillRect(tx, ty, thumb, thumb)
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.font = `700 84px ${FONT_STACK}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(song.name.slice(0, 1), POSTER_W / 2, ty + thumb / 2 + 4)
    ctx.textBaseline = 'alphabetic'
  }
  ctx.restore()
  roundRectPath(ctx, tx, ty, thumb, thumb, 28)
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = 2
  ctx.stroke()

  // 歌名与歌手
  ctx.textAlign = 'center'
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `600 54px ${FONT_STACK}`
  ctx.fillText(truncateToWidth(song.name, 54), POSTER_W / 2, 452)
  ctx.fillStyle = 'rgba(255,255,255,0.78)'
  ctx.font = `400 34px ${FONT_STACK}`
  ctx.fillText(truncateToWidth(song.artist, 34), POSTER_W / 2, 512)

  // 所选歌词（版式由纯逻辑计算）
  const layout = computePosterLayout(lineTexts)
  ctx.font = `600 ${layout.fontSize}px ${FONT_STACK}`
  ctx.fillStyle = '#FFFFFF'
  ctx.shadowColor = 'rgba(0,0,0,0.35)'
  ctx.shadowBlur = 12
  ctx.shadowOffsetY = 2
  for (const line of layout.lines) ctx.fillText(line.text, POSTER_W / 2, line.y)
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  // 落款
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.fillRect(POSTER_W / 2 - 50, 1296, 100, 2)
  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.font = `500 30px ${FONT_STACK}`
  ctx.fillText('诗音 Shiyin', POSTER_W / 2, 1362)
}

interface Props {
  song: Song | null
  open: boolean
  onClose: () => void
}

/** 歌词海报：选行（最多 6 行）→ 本地 Canvas 生成 1080×1440 图片 → 保存 / 分享 */
export default function LyricPoster({ song, open, onClose }: Props) {
  const { sheetProps, handleProps } = useSheetDrag(onClose)
  const [selected, setSelected] = useState<number[]>([])
  const [phase, setPhase] = useState<'select' | 'preview'>('select')
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [hint, setHint] = useState('')
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // 每次打开回到选行阶段并清空选择
  useEffect(() => {
    if (open) {
      setSelected([])
      setPhase('select')
      setDataUrl(null)
      setHint('')
    }
  }, [open, song?.id])

  // 安卓返回登记（1.1.0）：海报开着时返回先收海报（在歌词页之上，后登记先处理）
  useEffect(() => {
    if (!open) return
    return registerBackHandler(() => {
      onClose()
      return true
    })
  }, [open, onClose])

  // 进入预览阶段后绘制海报
  useEffect(() => {
    if (phase !== 'preview' || !song || !canvasRef.current) return
    let alive = true
    const lineTexts = selected.map((i) => song.lyrics[i]?.text ?? '').filter(Boolean)
    void (async () => {
      const glow = song.coverSrc ? await extractCoverGlow(song.coverSrc) : null
      const fallback = parseHexColor(song.color)
      const tint = glow ?? (fallback ? rgbCss(softenColor(fallback, 0.3)) : '#8A6D4F')
      if (!alive || !canvasRef.current) return
      await drawPoster(canvasRef.current, song, lineTexts, tint)
      if (alive) setDataUrl(canvasRef.current.toDataURL('image/png'))
    })()
    return () => {
      alive = false
    }
  }, [phase, song, selected])

  if (!song || song.lyrics.length === 0) return null

  const saveImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${song.name}-歌词海报.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
    }, 'image/png')
  }

  const shareImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob(async (blob) => {
      if (!blob) return
      const file = new File([blob], `${song.name}-歌词海报.png`, { type: 'image/png' })
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean }
      if (nav.canShare?.({ files: [file] }) && typeof nav.share === 'function') {
        try {
          await nav.share({ files: [file] })
          return
        } catch {
          return // 用户取消分享，不再打扰
        }
      }
      saveImage()
      setHint('此浏览器不支持系统分享，已为你保存图片')
    }, 'image/png')
  }

  const rowCls = (isSel: boolean) =>
    `flex w-full items-center gap-3 rounded-[var(--r-card)] px-3 py-3 text-left text-body transition-colors ${
      isSel ? 'bg-ink/5 font-semibold' : 'active:bg-ink/5'
    }`

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="歌词海报">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={scrimTransition}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springDrawer}
            {...sheetProps}
            className="glass-strong absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] w-full max-w-[430px] flex-col rounded-t-[var(--r-sheet)] p-4"
            style={{ paddingBottom: 'calc(1.5rem + var(--sab))' }}
          >
            <div {...handleProps} className="-mt-1 mb-2 flex shrink-0 cursor-grab touch-none justify-center py-1.5">
            <div className="h-1.5 w-10 rounded-full bg-ink/15" />
          </div>
            <div className="mb-2 flex items-center px-1">
              <p className="flex-1 text-body font-semibold">
                {phase === 'select' ? `选择歌词行（已选 ${selected.length}/${POSTER_MAX_LINES}）` : '歌词海报'}
              </p>
              <button onClick={onClose} aria-label="关闭海报" className="grid h-11 w-11 place-items-center rounded-full text-ink2">
                <X size={20} />
              </button>
            </div>

            {phase === 'select' ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  {song.lyrics.map((line, i) => {
                    const isSel = selected.includes(i)
                    return (
                      <button
                        key={`${line.t}-${i}`}
                        className={rowCls(isSel)}
                        data-content
                        onClick={() => setSelected((s) => toggleLineSelection(s, i))}
                        aria-pressed={isSel}
                      >
                        <span
                          className="grid h-6 w-6 shrink-0 place-items-center rounded-full border"
                          style={
                            isSel
                              ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' }
                              : { borderColor: 'rgba(127,127,127,0.4)' }
                          }
                        >
                          {isSel && <Check size={14} />}
                        </span>
                        <span className="flex-1">{line.text}</span>
                      </button>
                    )
                  })}
                </div>
                <button
                  disabled={selected.length === 0}
                  onClick={() => setPhase('preview')}
                  className="mt-3 min-h-12 w-full shrink-0 rounded-full text-body font-semibold text-white transition-opacity disabled:opacity-40"
                  style={{ background: 'var(--accent)' }}
                >
                  生成海报
                </button>
              </>
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  {/* 隐藏画布负责绘制，预览图展示同一结果 */}
                  <canvas ref={canvasRef} width={POSTER_W} height={POSTER_H} className="hidden" aria-hidden />
                  {dataUrl ? (
                    <img src={dataUrl} alt={`${song.name} 歌词海报预览`} className="mx-auto max-h-full w-auto rounded-[var(--r-card)] shadow-lg" />
                  ) : (
                    <p className="py-16 text-center text-body text-ink2">正在生成海报…</p>
                  )}
                </div>
                {hint && <p className="mt-2 text-center text-sub text-ink2">{hint}</p>}
                <div className="mt-3 flex shrink-0 gap-2">
                  <button
                    onClick={() => setPhase('select')}
                    className="min-h-12 flex-1 rounded-full bg-ink/5 text-body font-medium"
                  >
                    重新选择
                  </button>
                  <button
                    onClick={saveImage}
                    disabled={!dataUrl}
                    className="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-full bg-ink/5 text-body font-medium disabled:opacity-40"
                  >
                    <Download size={17} /> 保存图片
                  </button>
                  <button
                    onClick={shareImage}
                    disabled={!dataUrl}
                    className="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-full text-body font-semibold text-white disabled:opacity-40"
                    style={{ background: 'var(--accent)' }}
                  >
                    <Share2 size={17} /> 分享
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
