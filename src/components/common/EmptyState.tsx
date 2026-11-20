import type { ReactNode } from 'react'

interface Props {
  icon?: ReactNode
  title: string
  description?: string
}

/** 空态：列表无数据时展示（架构任务 4.2） */
export default function EmptyState({ icon = '🔍', title, description }: Props) {
  return (
    <div className="mt-16 text-center text-body text-ink2" role="status">
      <p className="text-3xl">{icon}</p>
      <p className="mt-3">{title}</p>
      {description && <p className="mt-1 text-sub text-ink3">{description}</p>}
    </div>
  )
}
