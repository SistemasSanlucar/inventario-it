export interface Pack {
  id: string
  [key: string]: unknown
}

const KEY = 'inv_packs_v1'

export const PacksManager = {
  getAll(): Pack[] {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]')
    } catch (_) {
      return []
    }
  },

  save(packs: Pack[]) {
    try {
      localStorage.setItem(KEY, JSON.stringify(packs))
    } catch (_) { /* ignore */ }
  },

  create(pack: Omit<Pack, 'id'>) {
    const packs = this.getAll()
    packs.push({ id: Date.now().toString(), ...pack })
    this.save(packs)
  },

  update(id: string, pack: Partial<Pack>) {
    const packs = this.getAll().map((p) => (p.id === id ? { ...p, ...pack } : p))
    this.save(packs)
  },

  delete(id: string) {
    this.save(this.getAll().filter((p) => p.id !== id))
  },
}
