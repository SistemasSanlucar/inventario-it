import { useState, useEffect, useRef } from 'react'
import { T } from '../../i18n'
import { useAppContext } from '../../context/AppContext'
import { useAppData } from '../../hooks/useAppData'
import { useAuth } from '../../context/AuthContext'
import { showToast } from '../../hooks/useToast'
import { exportEtiquetaPDF } from '../../utils/pdf'
import { exportToCSV } from '../../utils/export'
import { startBarcodeScanner, stopBarcodeScanner } from '../../utils/scanner'
import type { Activo, ActivoEstado } from '../../types/equipment'

// ── Estado color/label maps ──
const estadoColor: Record<string, string> = {
  Pendiente: 'var(--accent-orange)',
  Almacen: 'var(--accent-green)',
  Asignado: 'var(--accent-blue)',
  Baja: 'var(--accent-red)',
}
const estadoBg: Record<string, string> = {
  Pendiente: 'rgba(249,115,22,.15)',
  Almacen: 'rgba(63,185,80,.15)',
  Asignado: 'rgba(88,166,255,.15)',
  Baja: 'rgba(239,68,68,.15)',
}
const estadoLabel: Record<string, string> = {
  Pendiente: '⚠️ Pendiente N/S',
  Almacen: 'En Almacén',
  Asignado: 'Asignado',
  Baja: 'Baja',
}

// ── Transitions allowed per estado ──
const estadoTransitions: Record<string, string[]> = {
  Almacen: ['Reparacion', 'Transito', 'Baja'],
  Asignado: ['Reparacion', 'Extraviado', 'Robado'],
  Reparacion: ['Almacen'],
  Transito: ['Almacen'],
  Extraviado: ['Almacen'],
}

// ── ScannerRapido ──
interface ScanLogEntry {
  id: string
  tipo: string
  modelo: string
  estado: string
  ts: string
  ok: boolean
}

function ScannerRapido({
  activos,
  scanLog,
  setScanLog,
  scanCount,
  setScanCount,
  scanLastId,
  setScanLastId,
  scanFlash,
  setScanFlash,
}: {
  activos: Activo[]
  scanLog: ScanLogEntry[]
  setScanLog: React.Dispatch<React.SetStateAction<ScanLogEntry[]>>
  scanCount: number
  setScanCount: React.Dispatch<React.SetStateAction<number>>
  scanLastId: string
  setScanLastId: React.Dispatch<React.SetStateAction<string>>
  scanFlash: boolean
  setScanFlash: React.Dispatch<React.SetStateAction<boolean>>
}) {
  useEffect(() => {
    let active = true
    function launch() {
      if (!active) return
      startBarcodeScanner((code) => {
        if (!active) return
        let id = code.trim().toUpperCase()
        const urlMatch = id.match(/[?&]EQUIPO=([^&]+)/i)
        if (urlMatch) id = urlMatch[1]
        const activo = activos.find((a) => a.idEtiqueta === id)
        const ts = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        if (activo) {
          setScanLog((prev) => [{ id, tipo: activo.tipo, modelo: activo.modelo, estado: activo.estado, ts, ok: true }, ...prev].slice(0, 50))
          setScanCount((n) => n + 1)
          setScanLastId(id)
          setScanFlash(true)
          setTimeout(() => setScanFlash(false), 600)
        } else {
          setScanLog((prev) => [{ id, tipo: '—', modelo: 'No encontrado en inventario', estado: '', ts, ok: false }, ...prev].slice(0, 50))
        }
        setTimeout(() => { if (active) launch() }, 800)
      })
    }
    launch()
    return () => { active = false; stopBarcodeScanner() }
  }, [])

  return (
    <div>
      <div style={{ background: scanFlash ? 'rgba(63,185,80,.15)' : 'var(--bg-secondary)', border: '2px solid ' + (scanFlash ? 'var(--accent-green)' : 'var(--accent-purple)'), borderRadius: '16px', padding: '28px 32px', marginBottom: '20px', transition: 'all .3s ease', textAlign: 'center' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>⚡ Modo Escáner Rápido — Activo</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '56px', fontWeight: 800, fontFamily: 'IBM Plex Mono,monospace', color: 'var(--accent-green)', lineHeight: 1 }}>{scanCount}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginTop: '6px' }}>Escaneados</div>
          </div>
          {scanLastId && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'IBM Plex Mono,monospace', color: 'var(--accent-blue)', lineHeight: 1 }}>{scanLastId}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginTop: '6px' }}>Último escaneado</div>
            </div>
          )}
        </div>
        <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>📷 Apunta la cámara al QR o código de barras — se registra automáticamente</div>
      </div>

      {scanLog.length > 0 && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '14px' }}>📋 Registro de sesión</span>
            <button onClick={() => { setScanLog([]); setScanCount(0); setScanLastId('') }} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Limpiar</button>
          </div>
          <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
            {scanLog.map((entry, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 20px', borderBottom: '1px solid var(--border)', background: i === 0 ? (entry.ok ? 'rgba(63,185,80,.05)' : 'rgba(239,68,68,.05)') : 'transparent' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', background: entry.ok ? 'rgba(63,185,80,.15)' : 'rgba(239,68,68,.15)', flexShrink: 0 }}>{entry.ok ? '✅' : '❌'}</div>
                <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: '12px', fontWeight: 700, color: entry.ok ? 'var(--accent-green)' : 'var(--accent-red)', minWidth: '160px' }}>{entry.id}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{entry.tipo}{entry.modelo ? ' · ' + entry.modelo : ''}</div>
                  {entry.estado && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Estado: {entry.estado}</div>}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono,monospace', flexShrink: 0 }}>{entry.ts}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {scanLog.length > 0 && (
        <div style={{ marginTop: '12px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button className="button button-secondary" onClick={() => {
            exportToCSV(
              scanLog.map((en) => ({ ID: en.id, Tipo: en.tipo, Modelo: en.modelo, Estado: en.estado, Hora: en.ts, Resultado: en.ok ? 'OK' : 'No encontrado' })),
              'scan_session',
              showToast as any,
            )
          }}>⬇️ Exportar log CSV</button>
        </div>
      )}
    </div>
  )
}

// ── MapaUbicaciones ──
function MapaUbicaciones({
  activos,
  activeSede: activeSedeInit,
  setSearch,
  setView,
}: {
  activos: Activo[]
  activeSede?: string
  setSearch: (s: string) => void
  setView: (v: string) => void
}) {
  const sedes: Record<string, Record<string, Activo[]>> = {}
  activos.forEach((a) => {
    const ub = a.ubicacion || 'Sin ubicación'
    const sede = ub.includes(' - ') ? ub.split(' - ')[0] : ub
    const zona = ub.includes(' - ') ? ub.split(' - ').slice(1).join(' - ') : 'General'
    if (!sedes[sede]) sedes[sede] = {}
    if (!sedes[sede][zona]) sedes[sede][zona] = []
    sedes[sede][zona].push(a)
  })
  const sedeKeys = Object.keys(sedes).sort()
  const [activeSede, setActiveSede] = useState(activeSedeInit || sedeKeys[0] || '')
  const [mapaHover, setMapaHover] = useState<string | null>(null)

  const mapaEstadoColor: Record<string, string> = { Almacen: '#3fb950', Asignado: '#58a6ff', Pendiente: '#f97316', Transito: '#fbbf24', Reparacion: '#a855f7', Extraviado: '#ef4444', Robado: '#dc2626', Baja: '#6b7280' }
  const zonaStatus = (items: Activo[]) => {
    if (items.some((a) => a.estado === 'Extraviado' || a.estado === 'Robado')) return '#ef4444'
    if (items.some((a) => a.estado === 'Pendiente')) return '#f97316'
    if (items.some((a) => a.estado === 'Reparacion')) return '#a855f7'
    return '#3fb950'
  }

  if (sedeKeys.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🗺️</div>
        <div style={{ fontWeight: 700, fontSize: '16px' }}>Sin equipos con ubicación asignada</div>
        <div style={{ fontSize: '13px', marginTop: '8px' }}>Asigna ubicaciones a los equipos para verlos en el mapa</div>
      </div>
    )
  }

  const zonas = sedes[activeSede] || {}
  const zonaKeys = Object.keys(zonas).sort()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {sedeKeys.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {sedeKeys.map((sede) => {
            const total = Object.values(sedes[sede]).flat().length
            const isActive = activeSede === sede
            return (
              <button key={sede} onClick={() => setActiveSede(sede)} style={{ padding: '10px 18px', borderRadius: '12px', border: '2px solid ' + (isActive ? '#58a6ff' : 'var(--border)'), background: isActive ? 'rgba(88,166,255,.12)' : 'var(--bg-secondary)', color: isActive ? '#58a6ff' : 'var(--text-primary)', fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: 'all .15s' }}>
                🏢 {sede}<span style={{ marginLeft: '6px', fontSize: '11px', opacity: 0.7 }}>{total} eq.</span>
              </button>
            )
          })}
        </div>
      )}

      {zonaKeys.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No hay zonas para esta sede</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
          {zonaKeys.map((zona) => {
            const items = zonas[zona]
            const color = zonaStatus(items)
            const byEstado: Record<string, number> = {}
            items.forEach((a) => { byEstado[a.estado] = (byEstado[a.estado] || 0) + 1 })
            const isHovered = mapaHover === zona
            return (
              <div key={zona}
                onMouseEnter={() => setMapaHover(zona)}
                onMouseLeave={() => setMapaHover(null)}
                onClick={() => { setSearch(activeSede + ' - ' + zona); setView('lista') }}
                style={{ background: 'var(--bg-secondary)', border: '2px solid ' + color + (isHovered ? '99' : '33'), borderRadius: '16px', padding: '18px', cursor: 'pointer', transition: 'all .2s ease', transform: isHovered ? 'translateY(-4px)' : '', boxShadow: isHovered ? '0 12px 32px ' + color + '22' : 'none', position: 'relative', overflow: 'hidden' }}
              >
                <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '60px', height: '60px', borderRadius: '50%', background: color + '15', filter: 'blur(15px)' }} />
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗄️</div>
                <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '4px', lineHeight: 1.3 }}>{zona}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{items.length} equipo{items.length !== 1 ? 's' : ''}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                  {Object.entries(byEstado).map(([est, cnt]) => {
                    const col = mapaEstadoColor[est] || '#6b7280'
                    const pct = Math.round((cnt / items.length) * 100)
                    return (
                      <div key={est} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: col, flexShrink: 0 }} />
                        <div style={{ flex: 1, height: '4px', background: 'var(--bg-primary)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: pct + '%', background: col, borderRadius: '2px' }} />
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', minWidth: '16px', textAlign: 'right' }}>{cnt}</span>
                      </div>
                    )
                  })}
                </div>
                <div style={{ fontSize: '10px', color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
                  {color === '#3fb950' ? 'Todo OK' : color === '#f97316' ? 'Pendientes' : color === '#ef4444' ? 'Incidencia' : 'Revisar'}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
        {Object.entries(mapaEstadoColor).map(([est, col]) => {
          const cnt = activos.filter((a) => a.ubicacion && a.ubicacion.startsWith(activeSede) && a.estado === est).length
          if (cnt === 0) return null
          return (
            <div key={est} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: col }} />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{est} ({cnt})</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main EquiposView ──
export default function EquiposView() {
  const { state, dispatch, dataManagerRef } = useAppContext()
  const { refreshData } = useAppData()
  const { user } = useAuth()
  const t = T()

  const [view, setView] = useState('lista')
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState('all')
  const [filterEstado, setFilterEstado] = useState('all')
  const [filterSociedad, setFilterSociedad] = useState('all')
  const [fichaEquipo, setFichaEquipo] = useState<Activo | null>(null)

  // Batch reception
  const [sublotes, setSublotes] = useState([{ id: 1, tipo: '', modelo: '', modeloDetalle: '', ubicacion: '', cantidad: 1, sociedad: '' }])
  const [creatingProgress, setCreatingProgress] = useState<{ current: number; total: number } | null>(null)

  // Inline N/S editing
  const [inlineNS, setInlineNS] = useState<Record<string, string>>({})
  const [savingNS, setSavingNS] = useState<Record<string, boolean>>({})

  // Scanner
  const [scanLog, setScanLog] = useState<ScanLogEntry[]>([])
  const [scanCount, setScanCount] = useState(0)
  const [scanLastId, setScanLastId] = useState('')
  const [scanFlash, setScanFlash] = useState(false)

  // Cambiar estado
  const [cambioEstado, setCambioEstado] = useState<{ equipo: Activo; nuevoEstado: string } | null>(null)
  const [cambioMotivo, setCambioMotivo] = useState('')
  const [cambioDestino, setCambioDestino] = useState('')
  const [savingEstado, setSavingEstado] = useState(false)

  // Confirm delete
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const nsInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Apply initial filter from Dashboard navigation
  useEffect(() => {
    const f = state.tabFilter
    if (!f) return
    if (f.estado) setFilterEstado(f.estado)
    if (f.estado === 'Pendiente') setView('pendientes')
  }, [])

  // Deep-link to a specific equipo
  useEffect(() => {
    if (state.deepLinkEquipo) {
      setFichaEquipo(state.deepLinkEquipo)
      dispatch({ type: 'SET_DEEP_LINK', payload: null })
    }
  }, [state.deepLinkEquipo])

  const activos = state.activos || []
  const pendientes = activos.filter((a) => a.estado === 'Pendiente')
  const tiposConEtiqueta = Object.keys(state.catalogoTipos || {})
  const tiposUnicos = [...new Set(activos.map((a) => a.tipo))].filter(Boolean)

  const filtered = activos.filter((a) => {
    const matchSearch = !search ||
      a.idEtiqueta.toLowerCase().includes(search.toLowerCase()) ||
      a.modelo.toLowerCase().includes(search.toLowerCase()) ||
      a.tipo.toLowerCase().includes(search.toLowerCase()) ||
      (a.numSerie || '').toLowerCase().includes(search.toLowerCase())
    const matchTipo = filterTipo === 'all' || a.tipo === filterTipo
    const matchEstado = filterEstado === 'all' || (filterEstado === 'sinEtiqueta' ? (a.numSerie && !a.etiquetaImpresa && a.estado !== 'Baja') : a.estado === filterEstado)
    const matchSoc = filterSociedad === 'all' || a.sociedad === filterSociedad
    return matchSearch && matchTipo && matchEstado && matchSoc
  })

  // ── Sublote helpers ──
  const addSublote = () => setSublotes((prev) => [...prev, { id: Date.now(), tipo: '', modelo: '', modeloDetalle: '', ubicacion: '', cantidad: 1, sociedad: '' }])
  const removeSublote = (id: number) => setSublotes((prev) => prev.filter((s) => s.id !== id))
  const updateSublote = (id: number, field: string, value: string | number) => {
    setSublotes((prev) => prev.map((s) => {
      if (s.id !== id) return s
      const updated = { ...s, [field]: value }
      if (field === 'tipo') updated.modelo = ''
      return updated
    }))
  }
  const totalUnidades = sublotes.reduce((sum, s) => sum + (Number(s.cantidad) || 0), 0)
  const sublotesValidos = sublotes.length > 0 && sublotes.every((s) => s.tipo && s.modelo && s.ubicacion && s.sociedad && Number(s.cantidad) >= 1)

  // ── Cambiar estado ──
  const handleCambiarEstado = async () => {
    const dm = dataManagerRef.current
    if (!cambioEstado || !dm) return
    const { equipo, nuevoEstado } = cambioEstado
    const motivosRequeridos = ['Baja', 'Extraviado', 'Robado', 'Reparacion', 'Transito']
    if (motivosRequeridos.includes(nuevoEstado) && !cambioMotivo.trim()) { showToast('El motivo es obligatorio para este estado', 'error'); return }
    if (nuevoEstado === 'Transito' && !cambioDestino.trim()) { showToast('El destino es obligatorio para Tránsito', 'error'); return }
    setSavingEstado(true)
    try {
      const extra: Record<string, string> = { motivoIncidencia: cambioMotivo }
      if (nuevoEstado === 'Transito') { extra.transitoDestino = cambioDestino; extra.fechaTransito = new Date().toISOString() }
      await dm.cambiarEstadoActivo(equipo.id, nuevoEstado as ActivoEstado, extra)
      await dm.addToHistory({ tipo: 'CambioEstado', producto: equipo.tipo + ' - ' + equipo.modelo, cantidad: 1, usuario: '', tecnico: user?.name || '', idEtiqueta: equipo.idEtiqueta, motivo: nuevoEstado + (cambioMotivo ? ': ' + cambioMotivo : '') })
      showToast('Estado actualizado: ' + nuevoEstado, 'success')
      setCambioEstado(null); setCambioMotivo(''); setCambioDestino('')
      await refreshData(['activos'])
    } catch (err: any) { showToast('Error: ' + err.message, 'error') }
    finally { setSavingEstado(false) }
  }

  // ── Crear lote ──
  const handleCrearLote = async () => {
    const dm = dataManagerRef.current
    if (!sublotesValidos || !dm) { showToast('Completa todos los campos de cada sublote', 'error'); return }
    const total = totalUnidades
    let current = 0
    setCreatingProgress({ current: 0, total })
    try {
      for (const sublote of sublotes) {
        const cant = Number(sublote.cantidad) || 1
        for (let i = 0; i < cant; i++) {
          const idEtiqueta = await dm.getNextEtiquetaId(sublote.sociedad)
          const modeloFinal = (sublote.modeloDetalle && sublote.modeloDetalle.trim() && /otro|vario/i.test(sublote.modelo))
            ? sublote.modelo + ' (' + sublote.modeloDetalle.trim() + ')'
            : sublote.modelo
          await dm.createActivo({ idEtiqueta, tipo: sublote.tipo, modelo: modeloFinal, ubicacion: sublote.ubicacion, numSerie: '', notas: '', estado: 'Pendiente', sociedad: sublote.sociedad })
          current++
          setCreatingProgress({ current, total })
        }
      }
      showToast(total + ' equipo(s) registrados. Ahora añade los N/S para completarlos.', 'success')
      setSublotes([{ id: Date.now(), tipo: '', modelo: '', modeloDetalle: '', ubicacion: '', cantidad: 1, sociedad: '' }])
      setView('pendientes')
      await refreshData(['activos'])
    } catch (err: any) { showToast('Error: ' + err.message, 'error') }
    finally { setCreatingProgress(null) }
  }

  // ── Guardar N/S inline ──
  const saveNS = async (activo: Activo) => {
    const dm = dataManagerRef.current
    if (!dm) return
    const ns = (inlineNS[activo.id] ?? '').trim().toUpperCase()
    if (!ns || ns.length < 4) { showToast('El N/S debe tener al menos 4 caracteres', 'error'); return }
    if (ns.length > 40) { showToast('El N/S no puede superar 40 caracteres', 'error'); return }
    setSavingNS((prev) => ({ ...prev, [activo.id]: true }))
    try {
      await dm.updateActivoNS(activo.id, ns)
      setInlineNS((prev) => { const n = { ...prev }; delete n[activo.id]; return n })
      await refreshData(['activos'])
      showToast('✓ N/S guardado · Equipo listo para etiquetar', 'success')
    } catch { showToast('Error guardando N/S', 'error') }
    finally { setSavingNS((prev) => { const n = { ...prev }; delete n[activo.id]; return n }) }
  }

  // ── Render: Recepción en lote ──
  const renderRecepcion = () => (
    <div style={{ background: 'var(--bg-tertiary)', padding: '24px', borderRadius: '12px', border: '2px solid var(--accent-blue)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '20px', marginBottom: '4px' }}>📦 Recepción de lote</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Registra uno o varios modelos de equipo. Los N/S se añaden en el siguiente paso.</div>
        </div>
        <button className="button button-secondary" onClick={() => setView('lista')}>✕ Cancelar</button>
      </div>

      {sublotes.map((sublote, idx) => {
        const modelosDisponibles = sublote.tipo ? (state.catalogo[sublote.tipo] || []) : []
        return (
          <div key={sublote.id} style={{ background: 'var(--bg-primary)', borderRadius: '10px', padding: '16px', marginBottom: '12px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--accent-blue)' }}>Sublote {idx + 1}</span>
              {sublotes.length > 1 && <button onClick={() => removeSublote(sublote.id)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '22px', padding: '0 4px', lineHeight: 1 }}>×</button>}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Sociedad *</label>
                <select className="form-select" value={sublote.sociedad} onChange={(ev) => updateSublote(sublote.id, 'sociedad', ev.target.value)}>
                  <option value="">-- Sociedad --</option>
                  {(state.sociedades || []).filter((s) => s.activo).map((s) => <option key={s.id} value={s.codigo}>{s.codigo} · {s.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tipo *</label>
                <select className="form-select" value={sublote.tipo} onChange={(ev) => updateSublote(sublote.id, 'tipo', ev.target.value)}>
                  <option value="">-- Tipo --</option>
                  {tiposConEtiqueta.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Modelo *</label>
                <select className="form-select" value={sublote.modelo} onChange={(ev) => { updateSublote(sublote.id, 'modelo', ev.target.value); updateSublote(sublote.id, 'modeloDetalle', '') }} disabled={!sublote.tipo}>
                  <option value="">-- Modelo --</option>
                  {modelosDisponibles.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                {sublote.modelo && /otro|vario/i.test(sublote.modelo) && (
                  <input type="text" className="form-input" style={{ marginTop: '6px' }} placeholder="✏️ Describe el modelo específico..." value={sublote.modeloDetalle || ''} onChange={(ev) => updateSublote(sublote.id, 'modeloDetalle', ev.target.value)} />
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Ubicación inicial *</label>
                <select className="form-select" value={sublote.ubicacion} onChange={(ev) => updateSublote(sublote.id, 'ubicacion', ev.target.value)}>
                  <option value="">-- Ubicación --</option>
                  {(state.ubicaciones || []).map((u) => <option key={u.id} value={u.nombre}>{u.nombre}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ maxWidth: '130px' }}>
                <label className="form-label">Cantidad *</label>
                <input type="number" min={1} max={200} className="form-input" value={sublote.cantidad} onChange={(ev) => updateSublote(sublote.id, 'cantidad', ev.target.value)} />
              </div>
            </div>
          </div>
        )
      })}

      <button className="button button-secondary" onClick={addSublote} style={{ marginBottom: '20px' }}>+ Añadir otro modelo</button>

      {creatingProgress && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
            <span>Creando equipos en SharePoint...</span>
            <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontWeight: 700, color: 'var(--accent-blue)' }}>{creatingProgress.current} / {creatingProgress.total}</span>
          </div>
          <div style={{ background: 'var(--bg-primary)', borderRadius: '8px', height: '10px', overflow: 'hidden' }}>
            <div style={{ background: 'var(--accent-blue)', height: '100%', width: Math.round((creatingProgress.current / creatingProgress.total) * 100) + '%', transition: 'width .3s ease', borderRadius: '8px' }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginTop: '8px' }}>
        {totalUnidades > 0 && (
          <div style={{ padding: '10px 16px', background: 'rgba(88,166,255,.1)', border: '1px solid var(--accent-blue)', borderRadius: '8px', fontSize: '14px' }}>
            Se crearán <strong style={{ color: 'var(--accent-blue)' }}>{totalUnidades}</strong> equipo(s) en estado <strong>⚠️ Pendiente N/S</strong>
          </div>
        )}
        <button className="button button-primary" onClick={handleCrearLote} disabled={!sublotesValidos || !!creatingProgress} style={{ marginLeft: 'auto', minWidth: '180px' }}>
          {creatingProgress && <span className="loading-spinner" />}
          {' '}{creatingProgress ? 'Creando...' : '✓ Crear ' + (totalUnidades > 0 ? totalUnidades + ' equipos' : '')}
        </button>
      </div>
    </div>
  )

  // ── Render: Pendientes (inline N/S) ──
  const renderPendientes = () => {
    if (pendientes.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <div className="empty-state-title">Sin equipos pendientes</div>
          <div className="empty-state-text">Todos los equipos tienen N/S asignado</div>
        </div>
      )
    }
    return (
      <div>
        <div className="info-banner orange" style={{ marginBottom: '16px' }}>
          ⚠️ <strong>{pendientes.length} equipo(s)</strong> pendientes de N/S.{' '}
          <strong>Modo rápido:</strong> pulsa Enter tras cada N/S para avanzar al siguiente automáticamente. También puedes pegar varios N/S a la vez con el botón de abajo.
        </div>
        <div style={{ marginBottom: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="button button-secondary" style={{ fontSize: '13px' }} onClick={() => {
            const texto = window.prompt('Pega los N/S separados por salto de línea o punto y coma (se asignarán en orden a los ' + pendientes.length + ' equipos pendientes):')
            if (!texto) return
            const lista = texto.split(/[\n;,]+/).map((s) => s.trim().toUpperCase()).filter((s) => s.length >= 4)
            if (lista.length === 0) { showToast('No se encontraron N/S válidos', 'error'); return }
            const nuevos = { ...inlineNS }
            for (let i = 0; i < Math.min(lista.length, pendientes.length); i++) {
              nuevos[pendientes[i].id] = lista[i]
            }
            setInlineNS(nuevos)
            showToast('✓ ' + Math.min(lista.length, pendientes.length) + ' N/S cargados. Revisa y guarda con Enter o ✓', 'success')
          }}>📋 Pegar lista de N/S</button>
          <button className="button button-success" style={{ fontSize: '13px' }} onClick={async () => {
            const conNS = pendientes.filter((a) => inlineNS[a.id] && inlineNS[a.id].trim().length >= 4)
            if (conNS.length === 0) { showToast('Introduce al menos un N/S primero', 'warning'); return }
            for (const a of conNS) await saveNS(a)
          }}>✓ Guardar todos los N/S introducidos</button>
        </div>
        <table className="history-table">
          <thead>
            <tr>
              <th style={{ width: '180px' }}>ID Interno</th>
              <th>Tipo</th>
              <th>Modelo</th>
              <th>Ubicación</th>
              <th>Número de Serie del fabricante *</th>
              <th style={{ width: '110px' }}></th>
            </tr>
          </thead>
          <tbody>
            {pendientes.map((activo) => {
              const nsVal = inlineNS[activo.id] ?? ''
              const isSaving = !!savingNS[activo.id]
              return (
                <tr key={activo.id}>
                  <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: '11px', fontWeight: 700, color: 'var(--accent-orange)' }}>{activo.idEtiqueta}</span></td>
                  <td style={{ fontWeight: 500 }}>{activo.tipo}</td>
                  <td>{activo.modelo}</td>
                  <td style={{ fontSize: '13px' }}>{activo.ubicacion || '-'}</td>
                  <td>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Escribe o escanea con cámara..."
                      value={nsVal}
                      autoComplete="off"
                      style={{ padding: '8px 12px', fontSize: '14px', fontFamily: 'IBM Plex Mono,monospace' }}
                      ref={(el) => { if (el) nsInputRefs.current[activo.id] = el }}
                      onChange={(ev) => setInlineNS((prev) => ({ ...prev, [activo.id]: ev.target.value }))}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter') {
                          ev.preventDefault()
                          saveNS(activo).then(() => {
                            const idx = pendientes.findIndex((p) => p.id === activo.id)
                            const next = pendientes[idx + 1]
                            if (next && nsInputRefs.current[next.id]) {
                              setTimeout(() => nsInputRefs.current[next.id]?.focus(), 150)
                            }
                          })
                        }
                      }}
                    />
                  </td>
                  <td>
                    <button className="button button-success" onClick={() => saveNS(activo)} disabled={isSaving || !nsVal.trim()} style={{ padding: '8px 14px', fontSize: '13px', width: '100%' }}>
                      {isSaving ? <span className="loading-spinner" /> : '✓ Guardar'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  // ── Render: Equipment table ──
  const renderLista = () => {
    if (filtered.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-state-icon">💻</div>
          <div className="empty-state-title">{search || filterTipo !== 'all' || filterEstado !== 'all' ? 'Sin resultados' : 'No hay equipos registrados'}</div>
          <div className="empty-state-text">{search || filterTipo !== 'all' || filterEstado !== 'all' ? 'Prueba otros filtros' : 'Usa "Recepción de lote" para registrar equipos con etiqueta'}</div>
        </div>
      )
    }
    return (
      <table className="history-table">
        <thead>
          <tr>
            <th style={{ width: '165px' }}>ID Interno</th>
            <th>Tipo</th>
            <th>Modelo</th>
            <th style={{ width: '70px' }}>Soc.</th>
            <th>N/S Fabricante</th>
            <th style={{ width: '130px' }}>Estado</th>
            <th>Ubicación</th>
            <th style={{ width: '90px' }}>🏷️ Etiqueta</th>
            <th style={{ width: '140px' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((activo) => {
            const tieneNS = !!activo.numSerie
            const isPendiente = activo.estado === 'Pendiente'
            const esTerminal = activo.estado === 'Robado' || activo.estado === 'Baja'
            return (
              <tr key={activo.id} style={isPendiente ? { background: 'rgba(249,115,22,.04)' } : {}}>
                <td>
                  <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: '11px', fontWeight: 700, color: isPendiente ? 'var(--accent-orange)' : 'var(--accent-blue)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setFichaEquipo(activo)} title="Ver ficha completa">
                    {activo.idEtiqueta}
                  </span>
                </td>
                <td style={{ fontWeight: 500 }}>{activo.tipo}</td>
                <td>{activo.modelo}</td>
                <td>{activo.sociedad ? <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: '11px', color: 'var(--accent-purple)', fontWeight: 700 }}>{activo.sociedad}</span> : '-'}</td>
                <td>{tieneNS ? <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>{activo.numSerie}</span> : <span style={{ color: 'var(--accent-orange)', fontSize: '12px', fontWeight: 600 }}>⚠️ Sin N/S</span>}</td>
                <td style={{ width: '90px', textAlign: 'center' }}>
                  {tieneNS
                    ? (activo.etiquetaImpresa
                        ? <span style={{ color: '#3fb950', fontSize: '13px', fontWeight: 700 }}>✓ Impresa</span>
                        : <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 700 }}>🔴 Sin impr.</span>)
                    : <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>—</span>}
                </td>
                <td>
                  <span style={{ background: estadoBg[activo.estado] || 'var(--bg-tertiary)', color: estadoColor[activo.estado] || 'var(--text-primary)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                    {estadoLabel[activo.estado] || activo.estado}
                  </span>
                </td>
                <td style={{ fontSize: '13px' }}>{activo.ubicacion || '-'}</td>
                <td>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="action-icon tooltip" data-tooltip="Ver ficha" onClick={() => setFichaEquipo(activo)}>📄</div>
                    <div className="action-icon tooltip" data-tooltip={tieneNS ? 'Imprimir QR' : 'Requiere N/S'} onClick={tieneNS ? () => exportEtiquetaPDF([activo], showToast as any) : undefined} style={tieneNS ? {} : { opacity: 0.3, cursor: 'not-allowed' }}>🖨️</div>
                    {!esTerminal && !isPendiente && (
                      <div className="action-icon tooltip" data-tooltip="Cambiar estado" onClick={() => { setCambioEstado({ equipo: activo, nuevoEstado: '' }); setCambioMotivo(''); setCambioDestino('') }}>🔄</div>
                    )}
                    {isPendiente && (
                      <div className="action-icon tooltip" data-tooltip="Añadir N/S" onClick={() => setView('pendientes')} style={{ color: 'var(--accent-orange)' }}>✏️</div>
                    )}
                    {confirmDeleteId === activo.id ? (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="button button-danger" onClick={async () => {
                          const dm = dataManagerRef.current
                          if (dm) {
                            await dm.deleteActivo(activo.id)
                            setConfirmDeleteId(null)
                            await refreshData(['activos'])
                            showToast('Equipo eliminado', 'success')
                          }
                        }} style={{ padding: '6px 10px', fontSize: '12px' }}>✓</button>
                        <button className="button button-secondary" onClick={() => setConfirmDeleteId(null)} style={{ padding: '6px 10px', fontSize: '12px' }}>✕</button>
                      </div>
                    ) : (
                      <div className="action-icon danger tooltip" data-tooltip="Eliminar" onClick={() => setConfirmDeleteId(activo.id)}>🗑️</div>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }

  // ── Ficha de equipo modal ──
  const renderFichaModal = () => {
    if (!fichaEquipo) return null
    const hEq = (state.history || [])
      .filter((h) => h.idEtiqueta === fichaEquipo.idEtiqueta)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

    const tipoConfig: Record<string, { icon: string; color: string; label: string }> = {
      CambioEstado: { icon: '🔄', color: '#a855f7', label: 'Cambio de estado' },
      Asignacion: { icon: '→', color: '#58a6ff', label: 'Asignado' },
      Devolucion: { icon: '←', color: '#3fb950', label: 'Devuelto' },
      Entrada: { icon: '↑', color: '#3fb950', label: 'Entrada' },
      Salida: { icon: '↓', color: '#ef4444', label: 'Salida' },
      Prestamo: { icon: '⏱', color: '#fbbf24', label: 'Préstamo' },
    }

    const infoFields = [
      { label: 'N/S Fabricante', value: fichaEquipo.numSerie || '⚠️ Sin N/S' },
      { label: 'Sociedad', value: fichaEquipo.sociedad || '-' },
      { label: 'Ubicación', value: fichaEquipo.ubicacion || '-' },
      fichaEquipo.asignadoA ? { label: 'Asignado a', value: fichaEquipo.asignadoA } : null,
      fichaEquipo.transitoDestino ? { label: 'Destino tránsito', value: fichaEquipo.transitoDestino } : null,
      fichaEquipo.proveedor ? { label: 'Proveedor', value: fichaEquipo.proveedor } : null,
      fichaEquipo.numAlbaran ? { label: 'Nº Albarán', value: fichaEquipo.numAlbaran } : null,
      fichaEquipo.fechaCompra ? { label: 'Fecha Compra', value: new Date(fichaEquipo.fechaCompra).toLocaleDateString('es-ES') } : null,
      fichaEquipo.fechaGarantia ? { label: 'Garantía hasta', value: new Date(fichaEquipo.fechaGarantia).toLocaleDateString('es-ES'), warn: new Date(fichaEquipo.fechaGarantia) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } : null,
    ].filter(Boolean) as Array<{ label: string; value: string; warn?: boolean }>

    return (
      <div className="modal-overlay" onClick={(ev) => { if (ev.target === ev.currentTarget) setFichaEquipo(null) }}>
        <div className="modal" style={{ maxWidth: '750px' }} onClick={(ev) => ev.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">{t.equipmentFile}</h2>
            <button className="modal-close" onClick={() => setFichaEquipo(null)}>×</button>
          </div>
          <div className="modal-body">
            {/* Header info */}
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>{fichaEquipo.tipo} · {fichaEquipo.modelo}</div>
                  <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: '14px', color: 'var(--accent-blue)', fontWeight: 700 }}>{fichaEquipo.idEtiqueta}</div>
                </div>
                <span style={{ background: estadoBg[fichaEquipo.estado] || 'var(--bg-primary)', color: estadoColor[fichaEquipo.estado] || 'var(--text-primary)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}>
                  {estadoLabel[fichaEquipo.estado] || fichaEquipo.estado}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                {infoFields.map((info, idx) => (
                  <div key={idx}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>{info.label}</div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: info.warn ? 'var(--accent-orange)' : 'inherit' }}>{info.warn ? '⚠️ ' + info.value : info.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Accesorios */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '.5px' }}>{t.accessories}</div>
              <textarea
                className="form-textarea"
                placeholder={'Ej: Cargador USB-C 65W\nFunda protectora\nCable HDMI'}
                value={fichaEquipo.accesorios || ''}
                onChange={(ev) => setFichaEquipo((p) => p ? { ...p, accesorios: ev.target.value } : p)}
                style={{ minHeight: '80px', fontSize: '14px' }}
              />
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Un accesorio por línea. Se guarda al cerrar con "Guardar cambios".</div>
            </div>

            {/* Timeline */}
            <div style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '16px', letterSpacing: '.5px' }}>{t.timeline}</div>
            {hEq.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '10px', textAlign: 'center' }}>📭 Sin movimientos registrados aún</div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '19px', top: '24px', bottom: '24px', width: '2px', background: 'var(--border)', zIndex: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {hEq.map((h, i) => {
                    const cfg = tipoConfig[h.tipo] || { icon: '•', color: '#6b7280', label: h.tipo }
                    const fecha = new Date(h.fecha)
                    const esHoy = fecha.toDateString() === new Date().toDateString()
                    return (
                      <div key={h.id || i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', paddingBottom: '16px', position: 'relative', zIndex: 1 }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-secondary)', border: '2px solid ' + cfg.color + '66', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{cfg.icon}</div>
                        <div style={{ flex: 1, background: 'var(--bg-tertiary)', borderRadius: '10px', padding: '10px 14px', border: '1px solid ' + cfg.color + '33' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                            <span style={{ fontSize: '11px', color: esHoy ? cfg.color : 'var(--text-secondary)', fontFamily: 'IBM Plex Mono,monospace', fontWeight: esHoy ? 700 : 400 }}>
                              {esHoy ? 'Hoy ' : ''}{fecha.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {(h.motivo || h.usuario) && <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '3px' }}>{h.motivo || h.usuario}</div>}
                          {h.tecnico && <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>🔧 {h.tecnico}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            {fichaEquipo.numSerie && <button className="button button-success" onClick={() => exportEtiquetaPDF([fichaEquipo], showToast as any)}>{t.printLabel}</button>}
            {!['Robado', 'Baja', 'Pendiente'].includes(fichaEquipo.estado) && (
              <button className="button button-secondary" onClick={() => { setCambioEstado({ equipo: fichaEquipo, nuevoEstado: '' }); setCambioMotivo(''); setCambioDestino(''); setFichaEquipo(null) }}>{t.changeStatus}</button>
            )}
            <button className="button button-primary" onClick={async () => {
              const original = activos.find((a) => a.id === fichaEquipo.id)
              if (original && original.accesorios !== fichaEquipo.accesorios) {
                const dm = dataManagerRef.current
                if (dm) {
                  try { await dm.updateActivoAccesorios(fichaEquipo.id, fichaEquipo.accesorios || ''); await refreshData(['activos']); showToast('Accesorios guardados', 'success') } catch { showToast('Error guardando accesorios', 'error') }
                }
              }
              setFichaEquipo(null)
            }}>{t.saveChanges}</button>
            <button className="button button-secondary" onClick={() => setFichaEquipo(null)}>Cerrar</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Cambiar estado modal ──
  const renderCambioEstadoModal = () => {
    if (!cambioEstado) return null
    const transitions = estadoTransitions[cambioEstado.equipo.estado] || []
    return (
      <div className="modal-overlay" onClick={(ev) => { if (ev.target === ev.currentTarget) setCambioEstado(null) }}>
        <div className="modal" style={{ maxWidth: '480px' }} onClick={(ev) => ev.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">🔄 Cambiar Estado</h2>
            <button className="modal-close" onClick={() => setCambioEstado(null)}>×</button>
          </div>
          <div className="modal-body">
            <div style={{ background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ fontWeight: 700 }}>{cambioEstado.equipo.tipo} · {cambioEstado.equipo.modelo}</div>
              <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: '12px', color: 'var(--accent-blue)' }}>{cambioEstado.equipo.idEtiqueta}</div>
              <div style={{ marginTop: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Estado actual: <strong style={{ color: estadoColor[cambioEstado.equipo.estado] }}>{estadoLabel[cambioEstado.equipo.estado] || cambioEstado.equipo.estado}</strong>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Nuevo estado *</label>
              <select className="form-select" value={cambioEstado.nuevoEstado} onChange={(ev) => { setCambioEstado((p) => p ? { ...p, nuevoEstado: ev.target.value } : p); setCambioMotivo(''); setCambioDestino('') }}>
                <option value="">-- Selecciona --</option>
                {transitions.map((est) => <option key={est} value={est}>{estadoLabel[est] || est}</option>)}
              </select>
            </div>
            {cambioEstado.nuevoEstado === 'Transito' && (
              <div className="form-group">
                <label className="form-label">Destino *</label>
                <input type="text" className="form-input" placeholder="Ej: SLN · Países Bajos  o  SAT HP Madrid" value={cambioDestino} onChange={(ev) => setCambioDestino(ev.target.value)} />
              </div>
            )}
            {['Baja', 'Extraviado', 'Robado', 'Reparacion'].includes(cambioEstado.nuevoEstado) && (
              <div className="form-group">
                <label className="form-label">{cambioEstado.nuevoEstado === 'Reparacion' ? 'Descripción del problema *' : 'Motivo *'}</label>
                <input type="text" className="form-input" placeholder={
                  cambioEstado.nuevoEstado === 'Reparacion' ? 'Ej: Pantalla parpadeante, enviado a SAT HP' :
                  cambioEstado.nuevoEstado === 'Robado' ? 'Ej: Robo en oficina, denuncia nº...' :
                  cambioEstado.nuevoEstado === 'Extraviado' ? 'Ej: No aparece tras traslado' :
                  'Ej: Pantalla rota irreparable'
                } value={cambioMotivo} onChange={(ev) => setCambioMotivo(ev.target.value)} />
              </div>
            )}
            {cambioEstado.nuevoEstado === 'Almacen' && (
              <div className="info-banner green">✓ El equipo volverá a estar disponible en el almacén.</div>
            )}
          </div>
          <div className="modal-footer">
            <button className="button button-secondary" onClick={() => setCambioEstado(null)}>Cancelar</button>
            <button className="button button-primary" onClick={handleCambiarEstado} disabled={savingEstado || !cambioEstado.nuevoEstado}>
              {savingEstado && <span className="loading-spinner" />}
              {' '}{savingEstado ? 'Guardando...' : 'Confirmar cambio'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Sin etiqueta count ──
  const sinEtiqueta = activos.filter((a) => a.numSerie && !a.etiquetaImpresa && a.estado !== 'Baja').length

  return (
    <div>
      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          {view === 'lista' && <input type="text" className="search-bar" placeholder="Buscar por ID, tipo, modelo, N/S..." value={search} onChange={(ev) => setSearch(ev.target.value)} />}
          {view === 'lista' && (
            <select className="filter-select" value={filterSociedad} onChange={(ev) => setFilterSociedad(ev.target.value)}>
              <option value="all">Todas las sociedades</option>
              {(state.sociedades || []).filter((s) => s.activo).map((s) => <option key={s.id} value={s.codigo}>{s.codigo} · {s.nombre}</option>)}
            </select>
          )}
          {view === 'lista' && (
            <select className="filter-select" value={filterTipo} onChange={(ev) => setFilterTipo(ev.target.value)}>
              <option value="all">Todos los tipos</option>
              {tiposUnicos.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
            </select>
          )}
          {view === 'lista' && (
            <select className="filter-select" value={filterEstado} onChange={(ev) => setFilterEstado(ev.target.value)}>
              <option value="all">Todos los estados</option>
              <option value="Pendiente">⚠️ Pendiente N/S</option>
              <option value="Almacen">En Almacén</option>
              <option value="Asignado">Asignado</option>
              <option value="Baja">Baja</option>
            </select>
          )}
          {view === 'lista' && <span className="results-count"><strong>{filtered.length}</strong> equipos</span>}
        </div>
        <div className="toolbar-right">
          {pendientes.length > 0 && view === 'lista' && (
            <button className="button button-warning" onClick={() => setView('pendientes')}>⚠️ Pendientes N/S ({pendientes.length})</button>
          )}
          {sinEtiqueta > 0 && view === 'lista' && (
            <button className="button button-danger" style={{ fontSize: '12px' }} onClick={() => setFilterEstado('sinEtiqueta')}>🔴 Sin etiqueta ({sinEtiqueta})</button>
          )}
          {view === 'pendientes' && <button className="button button-secondary" onClick={() => setView('lista')}>{t.backToList}</button>}
          {view === 'recepcion' && <button className="button button-secondary" onClick={() => setView('lista')}>{t.backToList}</button>}
          {view === 'scanner' && <button className="button button-secondary" onClick={() => { stopBarcodeScanner(); setView('lista') }}>{t.exitScanner}</button>}
          {view === 'mapa' && <button className="button button-secondary" onClick={() => setView('lista')}>{t.backToList}</button>}
          {view === 'lista' && <button className="button button-secondary" style={{ background: 'rgba(88,166,255,.1)', border: '1px solid #58a6ff44', color: '#58a6ff' }} onClick={() => setView('mapa')}>{t.mapView}</button>}
          {view === 'lista' && <button className="button button-purple" onClick={() => { setScanLog([]); setScanCount(0); setScanLastId(''); setView('scanner') }}>{t.scannerMode}</button>}
          {view === 'lista' && <button className="button button-primary" onClick={() => setView('recepcion')}>{t.receiveBatch}</button>}
        </div>
      </div>

      {/* Content */}
      {view === 'recepcion' ? renderRecepcion() :
       view === 'pendientes' ? renderPendientes() :
       view === 'scanner' ? <ScannerRapido activos={activos} scanLog={scanLog} setScanLog={setScanLog} scanCount={scanCount} setScanCount={setScanCount} scanLastId={scanLastId} setScanLastId={setScanLastId} scanFlash={scanFlash} setScanFlash={setScanFlash} /> :
       view === 'mapa' ? <MapaUbicaciones activos={activos} setSearch={setSearch} setView={setView} /> :
       renderLista()}

      {/* Ficha modal */}
      {renderFichaModal()}

      {/* Cambio estado modal */}
      {renderCambioEstadoModal()}
    </div>
  )
}
