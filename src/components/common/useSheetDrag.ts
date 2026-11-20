import { useDragControls, type PanInfo } from 'motion/react'
import { SHEET_CLOSE_OFFSET_PX, SHEET_CLOSE_VELOCITY } from '../../lib/motion'
import type { PointerEvent as ReactPointerEvent } from 'react'

/**
 * 底部抽屉「跟手下滑关闭」（1.4.0）：从把手/头部区域按下拖动，面板跟随
 * 手指下滑，超过阈值或甩动速度够快松手即关。只从把手启动拖动
 * （dragListener=false + dragControls），面板内列表滚动不受干扰。
 * 队列/菜单/睡眠/海报四个抽屉共用同一套手感。
 */
export function useSheetDrag(onClose: () => void) {
  const controls = useDragControls()
  return {
    sheetProps: {
      drag: 'y' as const,
      dragListener: false,
      dragControls: controls,
      dragConstraints: { top: 0, bottom: 0 },
      dragElastic: { top: 0, bottom: 0.55 },
      onDragEnd: (_event: unknown, info: PanInfo) => {
        if (info.offset.y > SHEET_CLOSE_OFFSET_PX || info.velocity.y > SHEET_CLOSE_VELOCITY) onClose()
      },
    },
    handleProps: {
      onPointerDown: (e: ReactPointerEvent) => {
        controls.start(e)
      },
    },
  }
}
