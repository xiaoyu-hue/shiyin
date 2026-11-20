import type { ReactNode } from 'react'
import { Heart, History, ListMusic, Music2, SearchX, type LucideIcon } from 'lucide-react'

interface Props {
  /** 历史调用点传的 emoji 标记，在此映射为 Lucide 线性图标（1.4.0 起不再渲染 emoji） */
  icon?: ReactNode
  title: string
  description?: string
}

const ICON_MAP: Record<string, LucideIcon> = {
  '🎵': Music2,
  '🎶': ListMusic,
  '💛': Heart,
  '🕘': History,
  '🔍': SearchX,
}

/**
 * 空态：列表无数据时展示（架构任务 4.2）。
 * 1.4.0 起图标走 Lucide 线性图标 + 玻璃圆徽，与全站图标语言一致；
 * 此前直接渲染 emoji，与线性图标混搭显廉价（审计-原创性）。
 */
export default function EmptyState({ icon = '🔍', title, description }: Props) {
  const Icon = (typeof icon === 'string' ? ICON_MAP[icon] : undefined) ?? SearchX
  return (
    <div className="mt-16 text-center text-body text-ink2" role="status">
      <div className="glass mx-auto grid h-16 w-16 place-items-center rounded-full" style={{ color: 'var(--accent)' }} aria-hidden>
        {typeof icon === 'string' ? <Icon size={28} strokeWidth={1.8} /> : icon}
      </div>
      <p className="mt-4 font-medium">{title}</p>
      {description && <p className="mt-1 text-sub text-ink3">{description}</p>}
    </div>
  )
}
