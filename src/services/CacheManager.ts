export class CacheManager {
  private ttl: number
  private prefix: string

  constructor(ttlMinutes = 5) {
    this.ttl = ttlMinutes * 60 * 1000
    this.prefix = 'inv_cache_'
  }

  set(key: string, data: unknown) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify({ data, timestamp: Date.now() }))
    } catch (_) { /* ignore */ }
  }

  get(key: string): unknown | null {
    try {
      const item = localStorage.getItem(this.prefix + key)
      if (!item) return null
      const parsed = JSON.parse(item)
      if (Date.now() - parsed.timestamp > this.ttl) {
        localStorage.removeItem(this.prefix + key)
        return null
      }
      return parsed.data
    } catch (_) {
      return null
    }
  }

  clearKey(key: string) {
    try { localStorage.removeItem(this.prefix + key) } catch (_) { /* ignore */ }
  }

  clear() {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(this.prefix))
      .forEach((k) => localStorage.removeItem(k))
  }
}

export const cache = new CacheManager(5)
