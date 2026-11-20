import { describe, it, expect } from 'vitest'
import { MESH_SIZE, MESH_CACHE_LIMIT, meshCacheKey } from './coverMesh'

describe('coverMesh 常量与缓存键（1.4.0）', () => {
  it('位图尺寸小而弥散：边长在 96–192 之间', () => {
    expect(MESH_SIZE).toBeGreaterThanOrEqual(96)
    expect(MESH_SIZE).toBeLessThanOrEqual(192)
  })

  it('缓存上限有界（护栏：氛围位图不许无上限堆积）', () => {
    expect(MESH_CACHE_LIMIT).toBeGreaterThan(0)
    expect(MESH_CACHE_LIMIT).toBeLessThanOrEqual(16)
  })

  it('缓存键由曲目 id 与源地址组成，同曲同源命中、异源区分', () => {
    expect(meshCacheKey(7, 'blob:a')).toBe(meshCacheKey(7, 'blob:a'))
    expect(meshCacheKey(7, 'blob:a')).not.toBe(meshCacheKey(7, 'blob:b'))
    expect(meshCacheKey(7, 'blob:a')).not.toBe(meshCacheKey(8, 'blob:a'))
  })
})
