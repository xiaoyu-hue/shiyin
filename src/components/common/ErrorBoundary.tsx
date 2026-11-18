import { Component, type ErrorInfo, type ReactNode } from 'react'
import ErrorState from './ErrorState'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * 错误边界：捕获子树渲染错误，展示错误态而不让整页白屏（架构任务 4.2）。
 * React 的错误边界必须用 class 组件实现（官方要求，无函数式等价物）。
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[诗音] 渲染错误：', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid h-full place-items-center px-6">
          <ErrorState
            title="页面加载失败"
            description="刷新页面后可重新尝试"
            onRetry={() => this.setState({ hasError: false })}
          />
        </div>
      )
    }
    return this.props.children
  }
}
