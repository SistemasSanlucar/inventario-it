    // PACKS — almacenados en localStorage
    // ==========================================
    export const PacksManager = {
        key: 'inv_packs_v1',
        getAll() {
            try { return JSON.parse(localStorage.getItem(this.key) || '[]'); } catch(e) { return []; }
        },
        save(packs) {
            try { localStorage.setItem(this.key, JSON.stringify(packs)); } catch(e) {}
        },
        create(pack) {
            const packs = this.getAll();
            packs.push({ id: Date.now().toString(), ...pack });
            this.save(packs);
        },
        update(id, pack) {
            const packs = this.getAll().map(p => p.id === id ? { ...p, ...pack } : p);
            this.save(packs);
        },
        delete(id) {
            this.save(this.getAll().filter(p => p.id !== id));
        }
    };

    // ==========================================