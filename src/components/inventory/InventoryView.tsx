import { useState, useEffect } from 'react'
import { T } from '../../i18n'
import { useAppContext } from '../../context/AppContext'
import { useModal } from '../../hooks/useModal'
import { startBarcodeScanner } from '../../utils/scanner'
import { exportToCSV } from '../../utils/export'
import { showToast } from '../../hooks/useToast'
import type { InventoryItem } from '../../types'

export default function InventoryView() {
  const { state } = useAppContext()
  const { openModal } = useModal()
  const t = T()

  const [viewMode, setViewMode] = useState('zonas')
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterTier, setFilterTier] = useState('all')
  const [filterEstado, setFilterEstado] = useState('all')
  const [selectedZona, setSelectedZona] = useState<string | null>(null)
  const [selectedSede, setSelectedSede] = useState('all')

  useEffect(() => {
    const f = state.tabFilter
    if (!f) return
    if (f.tipo === 'stockBajo') { setFilterEstado('stockBajo'); setViewMode('lista') }
    if (f.tipo === 'sinStock') { setFilterEstado('sinStock'); setViewMode('lista') }
  }, [state.tabFilter])

  const categories = [...new Set((state.inventory || []).map((i) => i.categoria))].filter(Boolean)

  // Zones
  const zonas: Record<string, InventoryItem[]> = {}
  ;(state.inventory || []).forEach((item) => {
    const loc = item.ubicacion || 'Sin ubicacion'
    if (!zonas[loc]) zonas[loc] = []
    zonas[loc].push(item)
  })
  const sedes = [...new Set(Object.keys(zonas).map((z) => (z.includes(' - ') ? z.split(' - ')[0].trim() : 'General')))]
  const zonasFiltradas = Object.keys(zonas)
    .filter((z) => { if (selectedSede === 'all') return true; const sede = z.includes(' - ') ? z.split(' - ')[0].trim() : 'General'; return sede === selectedSede })
    .filter((z) => z !== 'Sin ubicacion')

  const zonaStats = (zona: string) => {
    const items = zonas[zona] || []
    const sinStock = items.filter((i) => i.stock === 0).length
    const stockBajo = items.filter((i) => i.stock > 0 && i.stock <= i.stockMinimo).length
    const unidades = items.reduce((s, i) => s + (i.stock || 0), 0)
    const semaforo = sinStock > 0 ? '#ef4444' : stockBajo > 0 ? '#f97316' : '#3fb950'
    return { total: items.length, sinStock, stockBajo, unidades, semaforo }
  }

  // Filtered list
  const filtered = (state.inventory || []).filter((item) => {
    const q = search.toLowerCase()
    const matchesSearch = !q || item.nombre.toLowerCase().includes(q) || (item.categoria || '').toLowerCase().includes(q) || (item.barcode || '').includes(q)
    const matchesCat = filterCategory === 'all' || item.categoria === filterCategory
    let matchesEst = true
    if (filterEstado === 'stockBajo') matchesEst = item.stock > 0 && item.stock <= item.stockMinimo
    else if (filterEstado === 'sinStock') matchesEst = item.stock === 0
    const matchesZona = !selectedZona || item.ubicacion === selectedZona
    const matchesTier = filterTier === 'all' || (item.tier || 'Estándar') === filterTier
    return matchesSearch && matchesCat && matchesEst && matchesZona && matchesTier
  }).sort((a, b) => a.nombre.localeCompare(b.nombre))

  const productCard = (item: InventoryItem) => {
    const sinStock = item.stock === 0
    const bajo = item.stock > 0 && item.stock <= item.stockMinimo
    const col = sinStock ? '#ef4444' : bajo ? '#f97316' : '#3fb950'
    const pct = Math.min(100, item.stockMinimo > 0 ? Math.round((item.stock / item.stockMinimo) * 100) : 100)
    return (
      <div key={item.id} style={{ background: 'var(--bg-secondary)', border: `1px solid ${col}33`, borderRadius: '12px', padding: '14px', transition: 'all .2s', borderLeft: `3px solid ${col}` }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,.2)' }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: '700', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>{item.nombre}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.categoria}</div>
            {item.tier && item.tier !== 'Estándar' && <span style={{ fontSize: '10px', fontWeight: '700', color: '#a855f7', background: 'rgba(168,85,247,.15)', padding: '1px 6px', borderRadius: '8px', marginTop: '2px', display: 'inline-block' }}>⭐ {item.tier}</span>}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'IBM Plex Mono,monospace', color: col, lineHeight: 1 }}>{item.stock}</div>
            <div style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>uds</div>
          </div>
        </div>
        <div style={{ height: '3px', background: 'var(--bg-primary)', borderRadius: '2px', overflow: 'hidden', marginBottom: '10px' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: '2px', transition: 'width .8s ease' }} />
        </div>
        {sinStock && <div style={{ fontSize: '10px', fontWeight: '800', color: '#ef4444', marginBottom: '8px', textAlign: 'center', background: 'rgba(239,68,68,.1)', padding: '2px', borderRadius: '4px' }}>🔴 AGOTADO</div>}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button style={{ flex: 1, padding: '6px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '6px', color: '#ef4444', cursor: sinStock ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: '700', opacity: sinStock ? 0.4 : 1 }} disabled={sinStock} onClick={() => openModal('salida', item)}>📤</button>
          <button style={{ flex: 1, padding: '6px', background: 'rgba(63,185,80,.1)', border: '1px solid rgba(63,185,80,.2)', borderRadius: '6px', color: '#3fb950', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }} onClick={() => openModal('entrada', item)}>📥</button>
          <button style={{ padding: '6px 8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px' }} onClick={() => openModal('editar', item)}>✏️</button>
          <button style={{ padding: '6px 8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px' }} onClick={() => openModal('eliminar-producto', item)}>🗑️</button>
        </div>
      </div>
    )
  }

  const zonaCard = (zona: string) => {
    const st = zonaStats(zona)
    const label = zona.includes(' - ') ? zona.split(' - ').slice(1).join(' - ') : zona
    return (
      <div key={zona} onClick={() => { setSelectedZona(zona); setViewMode('lista') }}
        style={{ background: 'var(--bg-secondary)', border: `2px solid ${st.semaforo}33`, borderRadius: '16px', padding: '20px', cursor: 'pointer', transition: 'all .2s', position: 'relative', overflow: 'hidden' }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,.25)'; e.currentTarget.style.borderColor = `${st.semaforo}88` }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = `${st.semaforo}33` }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg,${st.semaforo},${st.semaforo}44)` }} />
        <div style={{ fontSize: '36px', marginBottom: '10px' }}>🗄️</div>
        <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{zona}</div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <div style={{ flex: 1, textAlign: 'center', background: 'var(--bg-primary)', borderRadius: '8px', padding: '6px' }}>
            <div style={{ fontSize: '18px', fontWeight: '800', fontFamily: 'IBM Plex Mono,monospace', color: '#58a6ff' }}>{st.total}</div>
            <div style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Refs</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center', background: 'var(--bg-primary)', borderRadius: '8px', padding: '6px' }}>
            <div style={{ fontSize: '18px', fontWeight: '800', fontFamily: 'IBM Plex Mono,monospace', color: '#3fb950' }}>{st.unidades}</div>
            <div style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Uds</div>
          </div>
          {(st.sinStock + st.stockBajo) > 0 && (
            <div style={{ flex: 1, textAlign: 'center', background: `${st.semaforo}18`, borderRadius: '8px', padding: '6px', border: `1px solid ${st.semaforo}33` }}>
              <div style={{ fontSize: '18px', fontWeight: '800', fontFamily: 'IBM Plex Mono,monospace', color: st.semaforo }}>{st.sinStock + st.stockBajo}</div>
              <div style={{ fontSize: '9px', color: st.semaforo, textTransform: 'uppercase', fontWeight: '700' }}>Alerta</div>
            </div>
          )}
        </div>
        <div style={{ height: '4px', background: 'var(--bg-primary)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(st.total * 8, 100)}%`, background: st.semaforo, borderRadius: '2px' }} />
        </div>
        <div style={{ textAlign: 'right', fontSize: '10px', color: 'var(--text-secondary)', marginTop: '5px', fontWeight: '700' }}>→ Ver contenido</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Toolbar */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative', minWidth: '200px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', pointerEvents: 'none' }}>🔍</span>
            <input type="text" className="search-bar" placeholder="Buscar productos..." value={search}
              onChange={(e) => { setSearch(e.target.value); if (e.target.value) setViewMode('lista') }}
              style={{ paddingLeft: '38px', width: '100%' }} />
          </div>
          <button className="button button-primary" style={{ padding: '12px 16px' }} onClick={() => startBarcodeScanner((code) => { setSearch(code); setViewMode('lista') })}>📷</button>
          <button className="button button-success" onClick={() => openModal('entrada')}>+ Producto</button>
          <button className="button button-secondary" onClick={() => exportToCSV(state.inventory, 'inventario', showToast as any)}>⬇️</button>
          <div style={{ display: 'flex', gap: '3px', background: 'var(--bg-primary)', borderRadius: '8px', padding: '3px' }}>
            <button onClick={() => { setViewMode('zonas'); setSelectedZona(null); setSearch(''); setFilterEstado('all') }}
              style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700', background: viewMode === 'zonas' ? 'var(--accent-purple)' : 'transparent', color: viewMode === 'zonas' ? 'white' : 'var(--text-secondary)' }}>
              🗄️ Zonas
            </button>
            <button onClick={() => setViewMode('lista')}
              style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700', background: viewMode === 'lista' ? 'var(--accent-blue)' : 'transparent', color: viewMode === 'lista' ? 'white' : 'var(--text-secondary)' }}>
              {t.list}
            </button>
          </div>
        </div>

        {/* Sede filter for zones view */}
        {viewMode === 'zonas' && sedes.length > 1 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[['all', '🌍 Todas'] as const, ...sedes.map((s) => [s, s] as const)].map(([val, label]) => (
              <button key={val} onClick={() => setSelectedSede(val)}
                style={{ padding: '5px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', background: selectedSede === val ? 'var(--accent-purple)' : 'var(--bg-primary)', color: selectedSede === val ? 'white' : 'var(--text-secondary)' }}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Filters for list view */}
        {viewMode === 'lista' && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="filter-select" value={filterTier} onChange={(e) => setFilterTier(e.target.value)}>
              <option value="all">Estándar + Premium</option>
              <option value="Estándar">Estándar</option>
              <option value="Premium">⭐ Premium</option>
            </select>
            <select className="filter-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="all">Todas las categorías</option>
              {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select className="filter-select" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
              <option value="all">Todos los estados</option>
              <option value="stockBajo">⚠️ Stock Bajo</option>
              <option value="sinStock">🔴 Sin Stock</option>
            </select>
            {selectedZona && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(168,85,247,.1)', border: '1px solid rgba(168,85,247,.3)', borderRadius: '8px', padding: '5px 12px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-purple)' }}>🗄️ {selectedZona}</span>
                <button onClick={() => setSelectedZona(null)} style={{ background: 'none', border: 'none', color: 'var(--accent-purple)', cursor: 'pointer', fontWeight: '800', fontSize: '14px' }}>✕</button>
              </div>
            )}
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>{filtered.length} producto(s)</span>
          </div>
        )}
      </div>

      {/* Zones view */}
      {viewMode === 'zonas' && (
        zonasFiltradas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-secondary)', borderRadius: '16px' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🗄️</div>
            <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Sin ubicaciones configuradas</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Asigna ubicaciones a los productos para verlos agrupados</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
            {zonasFiltradas.map(zonaCard)}
          </div>
        )
      )}

      {/* List view */}
      {viewMode === 'lista' && (
        filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-secondary)', borderRadius: '16px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
            <div style={{ fontWeight: '700', fontSize: '16px' }}>Sin resultados</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
            {filtered.map(productCard)}
          </div>
        )
      )}
    </div>
  )
}
