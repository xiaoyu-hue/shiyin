/**
 * 返回分发栈（纯逻辑，1.1.0 安卓层级返回用）。
 *
 * 安卓系统返回（手势/按键）到达时，先问这里登记着的弹层处理器：
 * 后登记的先被问（最上层弹层最先响应），谁返回 true 表示「已处理」，
 * 分发即停止；全部返回 false（或没有登记）时返回 false，
 * 由调用方继续走视图层级链（收起播放页 → 回二级页 → … → 最小化 App）。
 *
 * 本模块不依赖任何平台 API，网页端登记也无副作用（无人调用 dispatch）。
 */

/** 返回处理器：返回 true 表示已消费这次返回 */
export type BackHandler = () => boolean

export interface BackDispatcher {
  /** 登记一个处理器，返回注销函数（组件卸载/弹层关闭时调用） */
  register: (handler: BackHandler) => () => void
  /** 按后进先出顺序分发一次返回；有人处理返回 true，否则 false */
  dispatch: () => boolean
  /** 当前登记数（测试与调试用） */
  size: () => number
}

export function createBackDispatcher(): BackDispatcher {
  const stack: BackHandler[] = []
  return {
    register(handler) {
      stack.push(handler)
      let active = true
      return () => {
        if (!active) return
        active = false
        const at = stack.indexOf(handler)
        if (at >= 0) stack.splice(at, 1)
      }
    },
    dispatch() {
      // 复制一份再遍历：处理器在处理过程中可能注销自己或登记新层
      for (const handler of [...stack].reverse()) {
        if (handler()) return true
      }
      return false
    },
    size() {
      return stack.length
    },
  }
}
