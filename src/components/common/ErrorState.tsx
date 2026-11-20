import Button from '../ui/Button'

interface Props {
  title?: string
  description?: string
  onRetry?: () => void
}

/** 错误态：加载失败 / 运行时错误时展示（架构任务 4.2） */
export default function ErrorState({
  title = '出了点问题',
  description = '请稍后重试',
  onRetry,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center" role="alert">
      <p className="text-3xl">⚠️</p>
      <p className="text-body font-medium text-ink2">{title}</p>
      <p className="text-sub text-ink2">{description}</p>
      {onRetry && (
        <Button variant="primary" onClick={onRetry} className="mt-2 px-5 py-2 text-body">
          重试
        </Button>
      )}
    </div>
  )
}
