export class CacheManager {
        constructor(ttlMinutes = 5) { this.ttl = ttlMinutes * 60 * 1000; this.prefix = 'inv_cache_'; }
        set(key, data) { try { localStorage.setItem(this.prefix + key, JSON.stringify({ data, timestamp: Date.now() })); } catch(e) {} }
        get(key) { try { const item = localStorage.getItem(this.prefix + key); if (!item) return null; const parsed = JSON.parse(item); if (Date.now() - parsed.timestamp > this.ttl) { localStorage.removeItem(this.prefix + key); return null; } return parsed.data; } catch(e) { return null; } }
        clearKey(key) { try { localStorage.removeItem(this.prefix + key); } catch(e) {} }
        clear() { Object.keys(localStorage).filter(k => k.startsWith(this.prefix)).forEach(k => localStorage.removeItem(k)); }
    }
    export const cache = new CacheManager(5);