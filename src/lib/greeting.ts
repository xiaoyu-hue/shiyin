/** 按小时返回问候语时段词：凌晨 / 早上 / 中午 / 下午 / 晚上 */
export function greetingWord(hour: number): string {
  if (hour >= 0 && hour < 6) return '凌晨好'
  if (hour >= 6 && hour < 12) return '早上好'
  if (hour >= 12 && hour < 14) return '中午好'
  if (hour >= 14 && hour < 19) return '下午好'
  return '晚上好'
}

/** 主页问候语整句（时段词随实时时间变化） */
export function greetingLine(date: Date): string {
  return `${greetingWord(date.getHours())}，愿你听见好心情`
}
