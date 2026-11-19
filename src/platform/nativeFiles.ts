/**
 * 原生文件选择（@capawesome/capacitor-file-picker），把结果统一转成 File，
 * 让导入/挂歌词管线与网页版共用同一套处理逻辑。
 *
 * 选型说明（以插件 8.1.1 文档/类型为准）：
 * - 不传 types 过滤：安卓按扩展名猜 MIME，.lrc 等歌词文件没有标准 MIME，
 *   按类型过滤会漏掉歌词文件；改为不过滤、由导入管线按扩展名二次筛选。
 * - readData 保持 false（文档明确警告大文件读数据会崩），
 *   改走文档推荐的 fetch(webPath) 取 Blob，再包成 File。
 * - 用户取消选择时插件会 reject，这里统一按「没选任何文件」处理（返回空数组）。
 *
 * 本模块只在原生环境被调用；插件用动态 import，网页产物不包含其代码。
 */
export async function pickFilesNative(limit = 0): Promise<File[]> {
  try {
    const { FilePicker } = await import('@capawesome/capacitor-file-picker')
    const result = await FilePicker.pickFiles({ limit, readData: false })
    const files: File[] = []
    for (const picked of result.files) {
      if (!picked.webPath) continue
      const blob = await fetch(picked.webPath).then((r) => (r.ok ? r.blob() : null))
      if (!blob) continue
      files.push(
        new File([blob], picked.name, {
          type: picked.mimeType || blob.type,
          lastModified: picked.modifiedAt ?? Date.now(),
        }),
      )
    }
    return files
  } catch {
    return []
  }
}
