import { useState, useEffect, useMemo } from 'react'
import { useAppContext } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { showToast } from '../../hooks/useToast'
import { T } from '../../i18n'
import { fetchLineas, fetchLineasVIP, fetchTarifas, updateLineaCell, EDITABLE_COLS } from '../../services/LineasService'
import type { LineaRow, TarifaInfo } from '../../types/lineas'

const PAGE_SIZE = 50

export default function LineasView() {
  const { graphClientRef } = useAppContext()
  const { isAdmin } = useAuth()
  const t = T()

  // Data
  const [lineas, setLineas] = useState<LineaRow[]>([])
  const [lineasVIP, setLineasVIP] = useState<LineaRow[]>([])
  const [tarifas, setTarifas] = useState<TarifaInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [search, setSearch] = useState('')
  const [filterTarifa, setFilterTarifa] = useState('all')
  const [filterPerfil, setFilterPerfil] = useState('all')
  const [page, setPage] = useState(0)
  const [activeTab, setActiveTab] = useState<'todas' | 'vip'>('todas')

  // Detail modal
  const [selectedLinea, setSelectedLinea] = useState<LineaRow | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, string>>({})
  const [showSensitive, setShowSensitive] = useState(false)
  const [saving, setSaving] = useState(false)

  // ── Load data ──
  useEffect(() => {
    const graph = graphClientRef.current
    if (!graph) return
    setLoading(true)
    setError('')
    Promise.all([fetchLineas(graph), fetchLineasVIP(graph), fetchTarifas(graph)])
      .then(([l, v, t]) => { setLineas(l); setLineasVIP(v); setTarifas(t) })
      .catch((err) => { setError('No se pudo acceder al fichero de líneas: ' + (err.message || err)); console.error(err) })
      .finally(() => setLoading(false))
  }, [graphClientRef])

  // ── Derived data ──
  const currentList = activeTab === 'vip' ? lineasVIP : lineas
  const perfiles = useMemo(() => [...new Set(currentList.map((l) => l.perfil).filter(Boolean))].sort(), [currentList])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return currentList.filter((l) => {
      if (q && !l.numero.toLowerCase().includes(q) && !l.usuario.toLowerCase().includes(q)) return false
      if (filterTarifa !== 'all' && l.tarifa !== filterTarifa) return false
      if (filterPerfil !== 'all' && l.perfil !== filterPerfil) return false
      return true
    })
  }, [currentList, search, filterTarifa, filterPerfil])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // KPI by tarifa
  const tarifaCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const l of lineas) { m[l.tarifa] = (m[l.tarifa] || 0) + 1 }
    return m
  }, [lineas])

  const tarifaColor: Record<string, string> = { Esencial: '#3fb950', 'Estándar': '#58a6ff', Plus: '#a855f7' }

  // ── Edit handlers ──
  const openDetail = (l: LineaRow) => {
    setSelectedLinea(l)
    setEditing(false)
    setShowSensitive(false)
    setEditForm({ usuario: l.usuario, tarifa: l.tarifa, perfil: l.perfil, observaciones: l.observaciones })
  }

  const closeDetail = () => { setSelectedLinea(null); setEditing(false); setShowSensitive(false) }

  const handleSave = async () => {
    if (!selectedLinea || !graphClientRef.current) return
    setSaving(true)
    const graph = graphClientRef.current
    try {
      const changes: [string, string][] = []
      for (const key of Object.keys(EDITABLE_COLS)) {
        if (editForm[key] !== undefined && editForm[key] !== (selectedLinea as any)[key]) {
          changes.push([key, editForm[key]])
        }
      }
      for (const [key, value] of changes) {
        await updateLineaCell(graph, selectedLinea._sheet, selectedLinea._rowIndex, EDITABLE_COLS[key], value)
      }
      // Update local state
      const update = (list: LineaRow[]) => list.map((l) => l._rowIndex === selectedLinea._rowIndex && l._sheet === selectedLinea._sheet ? { ...l, ...editForm } : l)
      if (selectedLinea._sheet === 'LINEAS') setLineas(update)
      else setLineasVIP(update)
      setSelectedLinea({ ...selectedLinea, ...editForm } as LineaRow)
      setEditing(false)
      showToast('Línea actualizada', 'success')
    } catch (err: any) {
      showToast('Error al guardar: ' + (err.message || err), 'error')
    } finally {
      setSaving(false)
    }
  }

  // Reset page when filters change
  useEffect(() => { setPage(0) }, [search, filterTarifa, filterPerfil, activeTab])

  // ── Masked value ──
  const masked = (val: string) => val ? '••••••••' : '—'

  // ── Render ──
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}><div className="loading-spinner" /></div>
  if (error) return (
    <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-secondary)', borderRadius: '16px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📵</div>
      <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px', color: '#ef4444' }}>Error al cargar líneas</div>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto' }}>{error}</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* KPI Header */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ padding: '14px 24px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'IBM Plex Mono,monospace', color: 'var(--accent-blue)' }}>{lineas.length + lineasVIP.length}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Total líneas</div>
        </div>
        {tarifas.map((tf) => {
          const count = tarifaCounts[tf.nombre] || 0
          const col = tarifaColor[tf.nombre] || '#8b949e'
          return (
            <div key={tf.nombre} style={{ padding: '14px 20px', background: col + '12', border: '1px solid ' + col + '33', borderRadius: '12px', textAlign: 'center', cursor: 'pointer' }}
              onClick={() => { setFilterTarifa(filterTarifa === tf.nombre ? 'all' : tf.nombre); setActiveTab('todas') }}>
              <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'IBM Plex Mono,monospace', color: col }}>{count}</div>
              <div style={{ fontSize: '11px', color: col, fontWeight: 700 }}>{tf.nombre} <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>({tf.datos})</span></div>
            </div>
          )
        })}
        <div style={{ padding: '14px 20px', background: 'rgba(251,191,36,.08)', border: '1px solid rgba(251,191,36,.3)', borderRadius: '12px', textAlign: 'center', cursor: 'pointer' }}
          onClick={() => setActiveTab(activeTab === 'vip' ? 'todas' : 'vip')}>
          <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'IBM Plex Mono,monospace', color: '#fbbf24' }}>{lineasVIP.length}</div>
          <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 700 }}>VIP</div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px 20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: '200px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', pointerEvents: 'none' }}>🔍</span>
          <input type="text" className="search-bar" placeholder="Buscar por número o usuario..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '38px', width: '100%' }} />
        </div>
        <select className="filter-select" value={filterTarifa} onChange={(e) => setFilterTarifa(e.target.value)}>
          <option value="all">Todas las tarifas</option>
          {tarifas.map((tf) => <option key={tf.nombre} value={tf.nombre}>{tf.nombre} ({tf.datos})</option>)}
        </select>
        <select className="filter-select" value={filterPerfil} onChange={(e) => setFilterPerfil(e.target.value)}>
          <option value="all">Todos los perfiles</option>
          {perfiles.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <div style={{ display: 'flex', gap: '3px', background: 'var(--bg-primary)', borderRadius: '8px', padding: '3px' }}>
          <button onClick={() => setActiveTab('todas')} style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700, background: activeTab === 'todas' ? 'var(--accent-blue)' : 'transparent', color: activeTab === 'todas' ? 'white' : 'var(--text-secondary)' }}>
            📱 Todas
          </button>
          <button onClick={() => setActiveTab('vip')} style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700, background: activeTab === 'vip' ? '#fbbf24' : 'transparent', color: activeTab === 'vip' ? '#000' : 'var(--text-secondary)' }}>
            ⭐ VIP
          </button>
        </div>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>{filtered.length} línea(s)</span>
      </div>

      {/* Table */}
      <div style={{ background: activeTab === 'vip' ? 'rgba(251,191,36,.04)' : 'var(--bg-secondary)', border: activeTab === 'vip' ? '1px solid rgba(251,191,36,.25)' : '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                {['Número', 'Ext.', 'Usuario', 'Tarifa', 'Perfil', 'Observaciones'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Sin resultados</td></tr>
              ) : paged.map((l, idx) => {
                const tc = tarifaColor[l.tarifa] || '#8b949e'
                return (
                  <tr key={l._rowIndex + '-' + l._sheet} onClick={() => openDetail(l)}
                    style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background .15s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'IBM Plex Mono,monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>{l.numero}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'IBM Plex Mono,monospace', color: 'var(--text-secondary)' }}>{l.extension || '—'}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{l.usuario || '—'}</td>
                    <td style={{ padding: '10px 14px' }}><span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, background: tc + '22', color: tc }}>{l.tarifa}</span></td>
                    <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>{l.perfil || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.observaciones || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px', borderTop: '1px solid var(--border)' }}>
            <button disabled={page === 0} onClick={() => setPage(page - 1)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}>← Anterior</button>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono,monospace' }}>{page + 1} / {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1 }}>Siguiente →</button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLinea && (
        <div className="modal-overlay" onMouseDown={closeDetail}>
          <div className="modal" style={{ maxWidth: '560px' }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">📱 Línea {selectedLinea.numero}</h2>
              <button className="modal-close" onClick={closeDetail}>&times;</button>
            </div>
            <div className="modal-body" style={{ padding: '24px 32px' }}>
              {/* Read-only / Edit fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {fieldRow('Número', selectedLinea.numero)}
                {fieldRow('Extensión', selectedLinea.extension)}
                {editing ? (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Usuario</label>
                    <input className="form-input" value={editForm.usuario || ''} onChange={(e) => setEditForm({ ...editForm, usuario: e.target.value })} />
                  </div>
                ) : fieldRow('Usuario', selectedLinea.usuario)}
                {editing ? (
                  <div>
                    <label style={labelStyle}>Tarifa</label>
                    <select className="form-select" value={editForm.tarifa || ''} onChange={(e) => setEditForm({ ...editForm, tarifa: e.target.value })}>
                      {tarifas.map((tf) => <option key={tf.nombre} value={tf.nombre}>{tf.nombre}</option>)}
                    </select>
                  </div>
                ) : fieldRow('Tarifa', selectedLinea.tarifa, tarifaColor[selectedLinea.tarifa])}
                {editing ? (
                  <div>
                    <label style={labelStyle}>Perfil</label>
                    <input className="form-input" value={editForm.perfil || ''} onChange={(e) => setEditForm({ ...editForm, perfil: e.target.value })} />
                  </div>
                ) : fieldRow('Perfil', selectedLinea.perfil)}
                {editing ? (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Observaciones</label>
                    <textarea className="form-textarea" rows={3} value={editForm.observaciones || ''} onChange={(e) => setEditForm({ ...editForm, observaciones: e.target.value })} style={{ width: '100%', resize: 'vertical' }} />
                  </div>
                ) : (
                  <div style={{ gridColumn: '1 / -1' }}>
                    {fieldRow('Observaciones', selectedLinea.observaciones)}
                  </div>
                )}
              </div>

              {/* Sensitive fields — admin only */}
              {isAdmin && (
                <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.15)', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#ef4444' }}>🔒 Datos sensibles</span>
                    <button onClick={() => setShowSensitive(!showSensitive)} style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.1)', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                      {showSensitive ? '🙈 Ocultar' : '👁 Mostrar'}
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {fieldRow('IMEI', showSensitive ? selectedLinea.imei : masked(selectedLinea.imei))}
                    {fieldRow('PIN', showSensitive ? selectedLinea.pin : masked(selectedLinea.pin))}
                    {fieldRow('SIM 2ª', showSensitive ? selectedLinea.sim2 : masked(selectedLinea.sim2))}
                    {fieldRow('PUK SIM 2ª', showSensitive ? selectedLinea.pukSim2 : masked(selectedLinea.pukSim2))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {isAdmin && !editing && (
                <button className="button button-primary" onClick={() => setEditing(true)}>✏️ Editar</button>
              )}
              {editing && (
                <>
                  <button className="button button-secondary" onClick={() => setEditing(false)}>Cancelar</button>
                  <button className="button button-success" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
                </>
              )}
              {!editing && <button className="button button-secondary" onClick={closeDetail}>Cerrar</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers ──

const labelStyle: React.CSSProperties = { fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }

function fieldRow(label: string, value: string | undefined, color?: string) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: 500, color: color || 'var(--text-primary)' }}>{value || '—'}</div>
    </div>
  )
}
