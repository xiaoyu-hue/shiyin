/**
 * 通用按钮（审计 A-36 定案保留）：当前由错误空状态（ErrorState）使用，
 * 作为设计系统预留件——新界面优先沿用既有按钮写法，出现第二处同类
 * 需求时统一收编到本组件，不再各写一份。
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

type Variant = 'primary' | 'ghost' | 'icon'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children?: ReactNode
}

/**
 * 基础按钮（源码自有，shadcn 风格）：样式来自主题令牌，无第三方运行时依赖。
 * primary = 强调色实心；ghost = 透明；icon = 纯图标按钮。
 */
export default function Button({ variant = 'ghost', className, children, ...rest }: Props) {
  const base = 'inline-flex items-center justify-center transition-colors disabled:opacity-40'
  const variants: Record<Variant, string> = {
    primary: 'accent-bg rounded-full text-white shadow-lg',
    ghost: 'rounded-[var(--r-cover)]',
    icon: 'rounded-full',
  }
  return (
    <button className={twMerge(clsx(base, variants[variant], className))} {...rest}>
      {children}
    </button>
  )
}
