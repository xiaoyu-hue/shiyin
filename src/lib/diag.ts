/**
 * 数据面静默失败的统一诊断出口（审计 A-35）。
 *
 * 曲库恢复、持久化、封面补图等数据面操作失败时按产品口径静默兜底
 * （不打扰用户），但也不能无声无息：开发构建下统一经此打到控制台，
 * scope 写明环节，便于真机调试时定位。其余零散的 `.catch(() => undefined)`
 * 是平台空操作/预期内失败，不必经此。
 */
export function reportSilentError(scope: string, err: unknown): void {
  if (import.meta.env.DEV) {
    console.warn(`[shiyin] ${scope} 失败（已静默兜底）`, err)
  }
}
