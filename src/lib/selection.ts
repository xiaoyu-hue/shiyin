/**
 * 多选模式的纯逻辑（1.2.0）：选中集是「曲目下标」的集合，与队列/历史同一套坐标。
 * 状态本体放 UI 状态层（store/uiSlice），这里只做无副作用的集合运算，便于单测。
 */

/** 切换一首的选中状态（返回新数组，不改原数组） */
export function toggleInSelection(selection: number[], index: number): number[] {
  return selection.includes(index) ? selection.filter((i) => i !== index) : [...selection, index]
}

/**
 * 把选中集按所在列表的顺序（scope）排好：批量入队 / 加歌单按用户在列表里
 * 看到的顺序执行，而不是按点选的先后。不在 scope 内的选中项（理论上不应出现）保序附后。
 */
export function orderByScope(scope: number[], selection: number[]): number[] {
  const sel = new Set(selection)
  const inScope = new Set(scope)
  const ordered = scope.filter((i) => sel.has(i))
  const rest = selection.filter((i) => !inScope.has(i))
  return [...ordered, ...rest]
}
