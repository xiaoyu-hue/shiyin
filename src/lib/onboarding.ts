/**
 * 首启导入引导的触发判断（1.2.0，纯函数）：
 * 曲目恢复已完成（避免恢复途中误判空库）、曲库确实为空、且从未引导过。
 * 导入完成或点「稍后再说」都会落 onboarded 标记，之后不再出现。
 */
export function shouldShowOnboarding(input: { restored: boolean; trackCount: number; onboarded: boolean }): boolean {
  return input.restored && input.trackCount === 0 && !input.onboarded
}
