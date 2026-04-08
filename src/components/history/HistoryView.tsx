import { useState, useEffect } from 'react'
import { useAppContext } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { useTabNavigation } from '../../hooks/useTabNavigation'
import { exportToCSV } from '../../utils/export'
import { showToast } from '../../hooks/useToast'
import type { HistoryEntry } from '../../types/history'

export default function HistoryView() {
  const { state, dispatch } = useAppContext()
  const { isAdmin } = useAuth()
  const { goToEquipo } = useTabNavigation()

  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [sortCol, setSortCol] = useState('fecha')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    const f = state.tabFilter
    if (!f) return
    if (f.tipo === 'hoy') {
      const hoy = new Date().toISOString().split('T')[0]
      setFilterDateFrom(hoy)
      setFilterDateTo(hoy)
    }
  }, [])

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const sortIcon = (col: string) => {
    if (sortCol !== col) return <span style={{ color: 'var(--text-secondary)', marginLeft: '4px', opacity: 0.4 }}>⇅</span>
    return <span style={{ color: 'var(--accent-blue)', marginLeft: '4px' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const filtered = (state.history || []).filter((entry) => {
    const matchesSearch = entry.producto.toLowerCase().includes(search.toLowerCase()) || entry.usuario.toLowerCase().includes(search.toLowerCase()) || (entry.ticket && entry.ticket.toLowerCase().includes(search.toLowerCase()))
    const matchesType = filterType === 'all' || entry.tipo === filterType
    let matchesDate = true
    if (filterDateFrom || filterDateTo) {
      const d = new Date(entry.fecha)
      if (filterDateFrom) matchesDate = d >= new Date(filterDateFrom)
      if (filterDateTo && matchesDate) matchesDate = d <= new Date(filterDateTo + 'T23:59:59')
    }
    return matchesSearch && matchesType && matchesDate
  }).sort((a, b) => {
    let av: any, bv: any
    if (sortCol === 'fecha') { av = new Date(a.fecha); bv = new Date(b.fecha) }
    else if (sortCol === 'tipo') { av = a.tipo; bv = b.tipo }
    else if (sortCol === 'producto') { av = a.producto; bv = b.producto }
    else if (sortCol === 'cantidad') { av = a.cantidad; bv = b.cantidad }
    else if (sortCol === 'usuario') { av = a.usuario; bv = b.usuario }
    else if (sortCol === 'tecnico') { av = a.tecnico; bv = b.tecnico }
    else { av = a.fecha; bv = b.fecha }
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const thSort = (label: string, col: string, width?: string) => (
    <th style={{ width: width || 'auto', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }} onClick={() => toggleSort(col)}>
      {label}{sortIcon(col)}
    </th>
  )

  const navigateToEquipo = (idEtiqueta: string) => {
    const activo = (state.activos || []).find((a) => a.idEtiqueta === idEtiqueta)
    if (activo) goToEquipo(activo)
  }

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-left">
          <input type="text" className="search-bar" placeholder="Buscar en historial..." value={search} onChange={(ev) => setSearch(ev.target.value)} />
          <select className="filter-select" value={filterType} onChange={(ev) => setFilterType(ev.target.value)}>
            <option value="all">Todos los tipos</option>
            <option value="Entrada">Entradas</option>
            <option value="Salida">Salidas</option>
            <option value="Devolucion">Devoluciones</option>
            <option value="Asignacion">Asignaciones</option>
            <option value="Prestamo">Prestamos</option>
          </select>
          <input type="date" className="filter-select" value={filterDateFrom} onChange={(ev) => setFilterDateFrom(ev.target.value)} />
          <input type="date" className="filter-select" value={filterDateTo} onChange={(ev) => setFilterDateTo(ev.target.value)} />
          <span className="results-count"><strong>{filtered.length}</strong> registros</span>
        </div>
        <div className="toolbar-right">
          <button className="button button-secondary" onClick={() => { setSearch(''); setFilterType('all'); setFilterDateFrom(''); setFilterDateTo('') }}>Limpiar</button>
          <button className="button button-success" onClick={() => exportToCSV(filtered as any, 'historial', showToast as any)}>Exportar</button>
        </div>
      </div>

      {filtered.length > 0 ? (
        <table className="history-table">
          <thead>
            <tr>
              {thSort('Fecha', 'fecha', '150px')}
              {thSort('Tipo', 'tipo', '110px')}
              {thSort('Producto', 'producto')}
              {thSort('Cant.', 'cantidad', '60px')}
              <th style={{ width: '120px' }}>Ticket</th>
              {thSort('Usuario', 'usuario')}
              {thSort('Técnico', 'tecnico')}
              <th style={{ width: '70px' }}>Ver</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => (
              <tr key={entry.id}>
                <td style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: '12px' }}>{new Date(entry.fecha).toLocaleString('es-ES')}</td>
                <td><span className={'movement-badge ' + entry.tipo}>{entry.tipo}</span></td>
                <td style={{ fontWeight: 500 }}>{entry.producto}</td>
                <td style={{ fontFamily: 'IBM Plex Mono,monospace' }}>{entry.cantidad}</td>
                <td style={{ color: 'var(--accent-blue)', fontSize: '12px' }}>{entry.ticket || '-'}</td>
                <td style={{ fontSize: '13px' }}>{entry.usuario}</td>
                <td style={{ color: 'var(--accent-green)', fontSize: '12px' }}>{entry.tecnico}</td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {entry.idEtiqueta && (
                      <div className="action-icon tooltip" data-tooltip="Ver equipo" onClick={() => navigateToEquipo(entry.idEtiqueta)} style={{ fontSize: '14px' }}>💻</div>
                    )}
                    {isAdmin && (
                      <div className="action-icon danger" onClick={() => dispatch({ type: 'SET_CONFIRM', payload: { type: 'eliminar-historial', item: entry } })} title="Eliminar" style={{ fontSize: '14px' }}>🗑️</div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">No se encontraron movimientos</div>
        </div>
      )}
    </div>
  )
}
