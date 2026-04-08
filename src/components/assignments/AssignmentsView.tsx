import { useState, useEffect } from 'react'
import { T } from '../../i18n'
import { useAppContext } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { exportAssignmentToPDF } from '../../utils/pdf'
import { showToast } from '../../hooks/useToast'
import { getFechaVencimientoPrestamo } from '../../utils/assignments'
import type { Assignment } from '../../types/assignment'

// ── Helpers ──
const avatarColors = ['#58a6ff', '#3fb950', '#a855f7', '#fbbf24', '#f97316', '#ef4444', '#06b6d4', '#84cc16']
function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return avatarColors[Math.abs(hash) % avatarColors.length]
}
function initials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}
function diasDesde(fecha: string) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const d = Math.round((hoy.getTime() - new Date(new Date(fecha).setHours(0, 0, 0, 0)).getTime()) / (1000 * 60 * 60 * 24))
  if (d === 0) return 'Hoy'
  if (d === 1) return 'Ayer'
  if (d < 30) return d + 'd'
  if (d < 365) return Math.round(d / 30) + 'mes'
  return Math.round(d / 365) + 'a'
}
function tipoIcon(nombre: string) {
  const n = (nombre || '').toLowerCase()
  if (n.includes('portátil') || n.includes('laptop') || n.includes('macbook')) return '💻'
  if (n.includes('ipad') || n.includes('tablet')) return '📱'
  if (n.includes('ratón') || n.includes('mouse')) return '🖱️'
  if (n.includes('teclado') || n.includes('keyboard')) return '⌨️'
  if (n.includes('monitor') || n.includes('pantalla')) return '🖥️'
  if (n.includes('auricular') || n.includes('headset')) return '🎧'
  if (n.includes('cable') || n.includes('adaptador')) return '🔌'
  if (n.includes('cargador')) return '🔋'
  if (n.includes('móvil') || n.includes('teléfono') || n.includes('phone')) return '📞'
  return '📦'
}

function parseProducts(a: Assignment) {
  let prods = a.productosAsignados || []
  if (typeof prods === 'string') {
    try { prods = JSON.parse(prods as any) } catch { /* ignore */ }
  }
  return Array.isArray(prods) ? prods : []
}

export default function AssignmentsView() {
  const { state, dispatch } = useAppContext()
  const { isAdmin } = useAuth()
  const t = T()

  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('all')
  const [filterEstado, setFilterEstado] = useState('all')
  const [filterTipo, setFilterTipo] = useState('all')
  const [viewMode, setViewMode] = useState('cards')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const f = state.tabFilter
    if (!f) return
    if (f.tipo === 'prestamo') setFilterTipo('prestamo')
    if (f.estado === 'Activo') setFilterEstado('Activo')
    if (f.estado === 'vencido') { setFilterTipo('prestamo'); setFilterEstado('vencido') }
  }, [])

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)

  const filtered = (state.assignments || []).filter((a) => {
    const q = search.toLowerCase()
    const matchesSearch = !q || a.nombreEmpleado.toLowerCase().includes(q) || (a.emailEmpleado || '').toLowerCase().includes(q) || (a.puesto || '').toLowerCase().includes(q) || (a.departamento || '').toLowerCase().includes(q)
    const matchesDept = filterDept === 'all' || a.departamento === filterDept
    let matchesEstado = true
    if (filterEstado === 'vencido') {
      const fv = getFechaVencimientoPrestamo(a)
      matchesEstado = a.esPrestamo && a.estado === 'Activo' && fv !== null && fv < hoy
    } else {
      matchesEstado = filterEstado === 'all' || a.estado === filterEstado
    }
    const matchesTipo = filterTipo === 'all' || (filterTipo === 'prestamo' && a.esPrestamo) || (filterTipo === 'asignacion' && !a.esPrestamo)
    return matchesSearch && matchesDept && matchesEstado && matchesTipo
  }).sort((a, b) => new Date(b.fechaAsignacion).getTime() - new Date(a.fechaAsignacion).getTime())

  const departamentos = [...new Set((state.assignments || []).map((a) => a.departamento))].filter(Boolean)
  const prestamosActivos = (state.assignments || []).filter((a) => a.esPrestamo && a.estado === 'Activo')
  const vencidos = prestamosActivos.filter((a) => { const fv = getFechaVencimientoPrestamo(a); return fv !== null && fv < hoy })

  const openModal = (modalType: string, item: any) => dispatch({ type: 'OPEN_MODAL', payload: { modalType, selectedItem: item } })
  const openConfirm = (type: string, item: any) => dispatch({ type: 'SET_CONFIRM', payload: { type, item } })

  // ── Material chips ──
  const materialChips = (a: Assignment) => {
    const prods = parseProducts(a)
    if (!prods.length) return null
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '10px' }}>
        {prods.slice(0, 5).map((p, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '20px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {tipoIcon(p.nombre)} {p.nombre}
          </span>
        ))}
        {prods.length > 5 && <span style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(88,166,255,.1)', border: '1px solid #58a6ff33', borderRadius: '20px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, color: '#58a6ff' }}>+{prods.length - 5} más</span>}
      </div>
    )
  }

  // ── Card ──
  const assignCard = (a: Assignment) => {
    const vencido = a.esPrestamo && a.estado === 'Activo' && (() => { const fv = getFechaVencimientoPrestamo(a); return fv !== null && fv < hoy })()
    const isExpanded = expandedId === a.id
    const col = avatarColor(a.nombreEmpleado)
    const estColor = ({ Activo: '#3fb950', Devuelto: '#6b7280', Parcial: '#fbbf24' } as Record<string, string>)[a.estado] || '#6b7280'
    const dias = diasDesde(a.fechaAsignacion)
    const accentLeft = vencido ? '#ef4444' : a.esPrestamo ? '#fbbf24' : col

    return (
      <div key={a.id}
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', transition: 'all .2s ease', opacity: a.estado === 'Devuelto' ? 0.65 : 1, boxShadow: vencido ? '0 0 0 2px #ef444433' : 'none' }}
        onMouseEnter={(ev) => { const t = ev.currentTarget; t.style.borderColor = accentLeft + '66'; t.style.transform = 'translateY(-2px)'; t.style.boxShadow = vencido ? '0 8px 24px #ef444422' : '0 8px 24px rgba(0,0,0,.2)' }}
        onMouseLeave={(ev) => { const t = ev.currentTarget; t.style.borderColor = 'var(--border)'; t.style.transform = ''; t.style.boxShadow = vencido ? '0 0 0 2px #ef444433' : 'none' }}
      >
        <div style={{ height: '3px', background: 'linear-gradient(90deg, ' + accentLeft + ', ' + accentLeft + '44)' }} />
        <div style={{ padding: '18px 20px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '2px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'linear-gradient(135deg,' + col + '33, ' + col + '18)', border: '2px solid ' + col + '55', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: col, flexShrink: 0, fontFamily: 'IBM Plex Mono,monospace', boxShadow: '0 4px 12px ' + col + '22' }}>
              {initials(a.nombreEmpleado)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <div style={{ fontWeight: 800, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{a.nombreEmpleado}</div>
                <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: vencido ? 'rgba(239,68,68,.15)' : a.esPrestamo ? 'rgba(251,191,36,.15)' : 'rgba(88,166,255,.12)', color: vencido ? '#ef4444' : a.esPrestamo ? '#fbbf24' : '#58a6ff', border: '1px solid ' + (vencido ? '#ef444433' : a.esPrestamo ? '#fbbf2433' : '#58a6ff33') }}>
                  {vencido ? '⚠️ VENCIDO' : a.esPrestamo ? '⏱ Préstamo' : '📋 Asignación'}
                </span>
                <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: estColor + '18', color: estColor, border: '1px solid ' + estColor + '33' }}>{a.estado}</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                {a.departamento && <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>🏢 {a.departamento}</span>}
                {a.puesto && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>💼 {a.puesto}</span>}
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>✉️ {a.emailEmpleado}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              <div style={{ background: vencido ? 'rgba(239,68,68,.1)' : 'var(--bg-tertiary)', border: '1px solid ' + (vencido ? '#ef444433' : 'var(--border)'), borderRadius: '10px', padding: '6px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'IBM Plex Mono,monospace', color: vencido ? '#ef4444' : col, lineHeight: 1 }}>{dias}</div>
                <div style={{ fontSize: '9px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>ASIGNADO</div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'IBM Plex Mono,monospace', color: col }}>{a.cantidadProductos} art.</div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{new Date(a.fechaAsignacion).toLocaleDateString('es-ES')}</div>
            </div>
          </div>

          {materialChips(a)}

          {/* Expanded */}
          {isExpanded && (
            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {a.tecnicoResponsable && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <span>🔧</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.tecnicoResponsable}</span>
                </div>
              )}
              {a.observaciones && <div style={{ fontSize: '13px', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '10px 14px', borderRadius: '10px', lineHeight: 1.5, borderLeft: '3px solid ' + col }}>💬 {a.observaciones}</div>}
              {a.firmaEmpleado && (
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 700 }}>Firma</div>
                  <img src={a.firmaEmpleado} style={{ maxWidth: '160px', maxHeight: '60px', border: '1px solid var(--border)', borderRadius: '8px', background: 'white' }} alt="Firma" />
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <button className="button button-secondary" style={{ padding: '9px 14px', fontSize: '13px', flex: 1, minWidth: '80px' }} onClick={() => setExpandedId(isExpanded ? null : a.id)}>{isExpanded ? '▲ Menos' : '▼ Más'}</button>
            <button className="button button-secondary" style={{ padding: '9px 14px', fontSize: '13px' }} onClick={() => openModal('ver-asignacion', a)} title="Ver detalle">📄</button>
            <button className="button button-secondary" style={{ padding: '9px 14px', fontSize: '13px' }} onClick={() => exportAssignmentToPDF(a, showToast as any)} title="Descargar PDF">📥</button>
            {a.estado === 'Activo' && <button className="button button-warning" style={{ padding: '9px 16px', fontSize: '13px', flex: 1 }} onClick={() => openModal('devolver-material', a)}>↩️ Devolver</button>}
            {isAdmin && <button style={{ padding: '9px 14px', fontSize: '13px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', color: '#ef4444', borderRadius: '10px', cursor: 'pointer', fontWeight: 700 }} onClick={() => openConfirm('eliminar-asignacion', a)} title="Eliminar">🗑️</button>}
          </div>
        </div>
      </div>
    )
  }

  // ── Table row ──
  const assignRow = (a: Assignment) => {
    const vencido = a.esPrestamo && a.estado === 'Activo' && (() => { const fv = getFechaVencimientoPrestamo(a); return fv !== null && fv < hoy })()
    const col = avatarColor(a.nombreEmpleado)
    const estColor = ({ Activo: '#3fb950', Devuelto: '#6b7280', Parcial: '#fbbf24' } as Record<string, string>)[a.estado] || '#6b7280'
    return (
      <tr key={a.id} style={{ borderLeft: '3px solid ' + (vencido ? '#ef4444' : col), background: vencido ? 'rgba(239,68,68,.04)' : 'transparent' }}>
        <td><span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: vencido ? 'rgba(239,68,68,.15)' : a.esPrestamo ? 'rgba(251,191,36,.15)' : 'rgba(88,166,255,.15)', color: vencido ? '#ef4444' : a.esPrestamo ? '#fbbf24' : '#58a6ff' }}>{vencido ? '⚠️ VENCIDO' : a.esPrestamo ? '⏱' : '📋'}</span></td>
        <td style={{ fontSize: '12px', fontFamily: 'IBM Plex Mono,monospace', color: 'var(--text-secondary)' }}>{new Date(a.fechaAsignacion).toLocaleDateString('es-ES')}</td>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: col + '22', border: '1px solid ' + col + '44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: col, flexShrink: 0 }}>{initials(a.nombreEmpleado)}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px' }}>{a.nombreEmpleado}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{a.emailEmpleado}</div>
            </div>
          </div>
        </td>
        <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{a.departamento || '—'}</td>
        <td style={{ textAlign: 'center', fontFamily: 'IBM Plex Mono,monospace', fontWeight: 700, color: col }}>{a.cantidadProductos}</td>
        <td><span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: estColor + '22', color: estColor }}>{a.estado}</span></td>
        <td>
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
            <div className="action-icon" onClick={() => openModal('ver-asignacion', a)} title="Ver">📄</div>
            <div className="action-icon" onClick={() => exportAssignmentToPDF(a, showToast as any)} title="PDF">📥</div>
            {a.estado === 'Activo' && <div className="action-icon" onClick={() => openModal('devolver-material', a)} title="Devolver">↩️</div>}
            {isAdmin && <div className="action-icon danger" onClick={() => openConfirm('eliminar-asignacion', a)} title="Eliminar">🗑️</div>}
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Action bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '10px', alignItems: 'stretch' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', pointerEvents: 'none' }}>🔍</span>
          <input type="text" value={search} onChange={(ev) => setSearch(ev.target.value)}
            placeholder="Buscar empleado, departamento, email..."
            style={{ width: '100%', height: '100%', minHeight: '52px', padding: '0 16px 0 46px', background: 'var(--bg-secondary)', border: '2px solid var(--border)', borderRadius: '14px', color: 'var(--text-primary)', fontSize: '15px', outline: 'none', transition: 'border-color .2s', boxSizing: 'border-box' }}
            onFocus={(ev) => { ev.target.style.borderColor = 'var(--accent-blue)' }}
            onBlur={(ev) => { ev.target.style.borderColor = 'var(--border)' }}
          />
        </div>
        <button className="button button-success" style={{ padding: '0 24px', fontSize: '15px', fontWeight: 800, borderRadius: '14px', minHeight: '52px', whiteSpace: 'nowrap' }} onClick={() => openModal('nueva-asignacion', null)}>{t.assignMaterial}</button>
        <button className="button button-warning" style={{ padding: '0 20px', fontSize: '15px', fontWeight: 700, borderRadius: '14px', minHeight: '52px', whiteSpace: 'nowrap' }} onClick={() => openModal('nuevo-prestamo', null)}>⏱️ Préstamo</button>
        <button style={{ padding: '0 20px', fontSize: '15px', fontWeight: 700, borderRadius: '14px', minHeight: '52px', background: 'rgba(239,68,68,.1)', border: '2px solid rgba(239,68,68,.3)', color: '#ef4444', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => openModal('baja-empleado', null)}>{t.employeeLeave}</button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {[
          { label: 'Total', value: (state.assignments || []).length, color: '#58a6ff', icon: '📋', fn: () => { setFilterEstado('all'); setFilterTipo('all') } },
          { label: 'Asignaciones activas', value: (state.assignments || []).filter((a) => a.estado === 'Activo' && !a.esPrestamo).length, color: '#3fb950', icon: '✅', fn: () => { setFilterEstado('Activo'); setFilterTipo('asignacion') } },
          { label: 'Préstamos activos', value: prestamosActivos.length, color: '#fbbf24', icon: '⏱️', fn: () => { setFilterTipo('prestamo'); setFilterEstado('Activo') } },
          { label: 'Vencidos', value: vencidos.length, color: vencidos.length > 0 ? '#ef4444' : '#6b7280', icon: vencidos.length > 0 ? '⚠️' : '✅', fn: vencidos.length > 0 ? () => { setFilterTipo('prestamo'); setFilterEstado('vencido') } : undefined },
        ].map((s, i) => (
          <div key={i} onClick={s.fn}
            style={{ background: 'var(--bg-secondary)', border: '2px solid ' + s.color + '33', borderRadius: '14px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px', cursor: s.fn ? 'pointer' : 'default', transition: 'all .2s ease' }}
            onMouseEnter={s.fn ? (ev) => { ev.currentTarget.style.borderColor = s.color + '77'; ev.currentTarget.style.transform = 'translateY(-2px)' } : undefined}
            onMouseLeave={s.fn ? (ev) => { ev.currentTarget.style.borderColor = s.color + '33'; ev.currentTarget.style.transform = '' } : undefined}
          >
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '26px', fontWeight: 800, fontFamily: 'IBM Plex Mono,monospace', color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginTop: '3px', letterSpacing: '0.5px' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Expired alert */}
      {vencidos.length > 0 && (
        <div style={{ padding: '16px 20px', background: 'rgba(239,68,68,.08)', border: '2px solid rgba(239,68,68,.3)', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', animation: 'pulse 2s infinite' }}
          onClick={() => { setFilterTipo('prestamo'); setFilterEstado('vencido') }}>
          <div style={{ width: '40px', height: '40px', background: 'rgba(239,68,68,.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>⚠️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: '#ef4444', fontSize: '14px' }}>{vencidos.length} préstamo(s) vencido(s) — Material pendiente de devolución</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Haz clic para filtrar y gestionar</div>
          </div>
          <span style={{ color: '#ef4444', fontWeight: 800, fontSize: '18px' }}>→</span>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px' }}>
        <select className="filter-select" value={filterTipo} onChange={(ev) => setFilterTipo(ev.target.value)}>
          <option value="all">Todos los tipos</option>
          <option value="asignacion">📋 Asignaciones</option>
          <option value="prestamo">⏱ Préstamos</option>
        </select>
        <select className="filter-select" value={filterEstado} onChange={(ev) => setFilterEstado(ev.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="Activo">✅ Activo</option>
          <option value="Devuelto">✓ Devuelto</option>
          <option value="Parcial">◑ Parcial</option>
          <option value="vencido">⚠️ Vencidos</option>
        </select>
        {departamentos.length > 0 && (
          <select className="filter-select" value={filterDept} onChange={(ev) => setFilterDept(ev.target.value)}>
            <option value="all">Todos los dptos.</option>
            {departamentos.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 700, marginLeft: '4px' }}>{filtered.length} resultado(s)</span>
        {(search || filterTipo !== 'all' || filterEstado !== 'all' || filterDept !== 'all') && (
          <button onClick={() => { setSearch(''); setFilterTipo('all'); setFilterEstado('all'); setFilterDept('all') }} style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', color: '#ef4444', borderRadius: '8px', padding: '5px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>✕ Limpiar</button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px', background: 'var(--bg-primary)', borderRadius: '8px', padding: '3px' }}>
          {[['cards', '🃏'], ['table', '☰']].map(([m, icon]) => (
            <button key={m} onClick={() => setViewMode(m)} style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '14px', background: viewMode === m ? 'var(--accent-blue)' : 'transparent', color: viewMode === m ? 'white' : 'var(--text-secondary)', transition: 'all .15s' }}>{icon}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>{search ? '🔍' : '📋'}</div>
          <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{search ? 'Sin resultados' : 'No hay asignaciones'}</div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>{search ? 'Prueba con otros términos' : 'Empieza asignando material a un empleado'}</div>
          {!search && <button className="button button-success" style={{ fontSize: '15px', padding: '14px 28px' }} onClick={() => openModal('nueva-asignacion', null)}>+ Nueva Asignación</button>}
        </div>
      ) : viewMode === 'cards' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '14px' }}>
          {filtered.map(assignCard)}
        </div>
      ) : (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
          <table className="history-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ width: '90px' }}>Tipo</th>
                <th style={{ width: '100px' }}>Fecha</th>
                <th>Empleado</th>
                <th>Departamento</th>
                <th style={{ width: '60px', textAlign: 'center' }}>Items</th>
                <th style={{ width: '90px' }}>Estado</th>
                <th style={{ width: '130px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>{filtered.map(assignRow)}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}
