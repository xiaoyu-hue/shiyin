interface Props {
  label?: string
}

/** 加载态：异步数据加载时展示（本期示例数据用不到，为阶段二预留） */
export default function LoadingState({ label = '加载中…' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-black/40" role="status" aria-live="polite">
      <span className="h-7 w-7 animate-spin rounded-full border-2 border-black/10 border-t-[var(--accent)]" />
      <span>{label}</span>
    </div>
  )
}
