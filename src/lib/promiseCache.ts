/**
 * 有界 Promise 缓存（审计 A-38 从 coverMesh 抽出）：同键并发调用共享同一次
 * 计算；容量到顶时按插入顺序淘汰最旧键（FIFO）。只缓存 Promise 本身，
 * 失败结果也占位——调用方语义（如封面生成失败回退纯色）依赖这一点，
 * 不要在 reject 时自动删除，否则失败源会被反复重试。
 */
export class PromiseCache<V> {
  private map = new Map<string, Promise<V>>()

  constructor(private readonly limit: number) {}

  getOrCreate(key: string, create: () => Promise<V>): Promise<V> {
    const hit = this.map.get(key)
    if (hit) return hit
    const job = create()
    this.map.set(key, job)
    while (this.map.size > this.limit) {
      const oldest = this.map.keys().next().value
      if (oldest === undefined) break
      this.map.delete(oldest)
    }
    return job
  }

  get size(): number {
    return this.map.size
  }

  has(key: string): boolean {
    return this.map.has(key)
  }
}
