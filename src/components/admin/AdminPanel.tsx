import { useState, useEffect, useRef } from 'react'
import { T } from '../../i18n'
import { useAppContext } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { useAppData } from '../../hooks/useAppData'
import { showToast } from '../../hooks/useToast'
import { exportAuditoria } from '../../utils/export'
import { printTechnicianCard } from '../../utils/pdf'
import { PacksManager } from '../../services/PacksManager'
import { ErrorLog } from '../../services/ErrorLog'
import { PAISES_LIST } from '../../config/constants'
import { CHANGELOG, entryIcon } from '../../config/changelog'
import type { CatalogoRawItem } from '../../types/equipment'
import BulkImportSection from './BulkImportSection'

// ── ErrorLogPanel ──
function ErrorLogPanel() {
  const [entries, setEntries] = useState(ErrorLog.getAll())
  const [filter, setFilter] = useState('all')
  useEffect(() => { ErrorLog.onChange(() => setEntries(ErrorLog.getAll())) }, [])
  const levelColor: Record<string, string> = { error: '#ef4444', warn: '#f97316', info: '#58a6ff' }
  const levelBg: Record<string, string> = { error: 'rgba(239,68,68,.1)', warn: 'rgba(249,115,22,.1)', info: 'rgba(88,166,255,.1)' }
  const filtered = filter === 'all' ? entries : entries.filter((e) => e.level === filter)
  return (
    <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '16px' }}>🐛 Log de Errores</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Se limpia al recargar la página · {entries.length} entrada(s)</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="filter-select" value={filter} onChange={(ev) => setFilter(ev.target.value)}>
            <option value="all">Todos ({entries.length})</option>
            <option value="error">🔴 Errores ({ErrorLog.count('error')})</option>
            <option value="warn">🟡 Avisos ({ErrorLog.count('warn')})</option>
            <option value="info">🔵 Info ({ErrorLog.count('info')})</option>
          </select>
          <button className="button button-secondary" onClick={() => { ErrorLog.clear(); setEntries([]) }} style={{ padding: '8px 14px', fontSize: '13px' }}>🗑️ Limpiar</button>
        </div>
      </div>
      <div style={{ maxHeight: '520px', overflowY: 'auto', padding: '12px 16px' }}>
        {filtered.length === 0
          ? <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '14px' }}>✅ Sin entradas{filter !== 'all' ? ' con este filtro' : ''}</div>
          : filtered.map((entry) => {
              const d = new Date(entry.ts)
              const hora = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              const fecha = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
              return (
                <div key={entry.id} style={{ background: levelBg[entry.level] || 'var(--bg-secondary)', border: '1px solid ' + (levelColor[entry.level] || 'var(--border)') + '33', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ background: levelColor[entry.level] || '#888', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>{entry.level}</span>
                    <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>{fecha} {hora}</span>
                    <span style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>{entry.context}</span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: entry.detail ? '4px' : 0 }}>{entry.message}</div>
                  {entry.detail && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono,monospace', background: 'var(--bg-primary)', padding: '6px 10px', borderRadius: '6px', marginTop: '4px', wordBreak: 'break-all', whiteSpace: 'pre-wrap', maxHeight: '80px', overflowY: 'auto' }}>{entry.detail}</div>}
                </div>
              )
            })}
      </div>
    </div>
  )
}

// ── ChangelogSection ──
function ChangelogSection() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set([CHANGELOG[0]?.version]))
  const toggle = (v: string) => setExpanded((prev) => {
    const next = new Set(prev)
    next.has(v) ? next.delete(v) : next.add(v)
    return next
  })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {CHANGELOG.map((ver) => (
        <div key={ver.version} style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <button onClick={() => toggle(ver.version)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>v{ver.version} <span style={{ fontWeight: 400, fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '8px' }}>{ver.date}</span></span>
            <span style={{ color: 'var(--text-secondary)' }}>{expanded.has(ver.version) ? '▾' : '▸'}</span>
          </button>
          {expanded.has(ver.version) && (
            <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ver.entries.map((entry, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '14px', flexShrink: 0 }}>{entryIcon(entry.type)}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{entry.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Main AdminPanel ──
export default function AdminPanel() {
  const { state, dispatch, dataManagerRef } = useAppContext()
  const { isAdmin, user } = useAuth()
  const { refreshData } = useAppData()
  const t = T()

  const [activeSection, setActiveSection] = useState('ubicaciones')
  const [loading, setLoading] = useState(false)
  const [openGroups, setOpenGroups] = useState({ infraestructura: true, catalogo: false, usuarios: false, sistema: false })
  const toggleGroup = (g: string) => setOpenGroups((s) => ({ ...s, [g]: !s[g as keyof typeof s] }))

  // Ubicaciones
  const [newUbicacion, setNewUbicacion] = useState('')
  const [editingUbicId, setEditingUbicId] = useState<string | null>(null)
  const [editingUbicNombre, setEditingUbicNombre] = useState('')

  // Catálogo
  const [catalogoRaw, setCatalogoRaw] = useState<CatalogoRawItem[]>([])
  const [catalogoLoaded, setCatalogoLoaded] = useState(false)
  const [newTipo, setNewTipo] = useState('')
  const [newTipoEtiqueta, setNewTipoEtiqueta] = useState(false)
  const [newModelo, setNewModelo] = useState('')
  const [newModeloTipo, setNewModeloTipo] = useState('')

  // Settings
  const [stockMinimoInput, setStockMinimoInput] = useState(String(state.stockMinimoDefault || 2))

  // Export
  const [exportSoc, setExportSoc] = useState('')
  const [exportDesde, setExportDesde] = useState('')
  const [exportHasta, setExportHasta] = useState('')

  // Sociedades
  const [newSoc, setNewSoc] = useState({ nombre: '', codigo: '', pais: '' })
  const [editingSocId, setEditingSocId] = useState<string | null>(null)
  const [editingSocData, setEditingSocData] = useState<Record<string, string>>({})

  // Proveedores
  const [newProv, setNewProv] = useState({ nombre: '', contacto: '', email: '', telefono: '' })
  const [editingProvId, setEditingProvId] = useState<string | null>(null)
  const [editingProvData, setEditingProvData] = useState<{ nombre: string; contacto?: string; email?: string; telefono?: string }>({ nombre: '' })

  // Packs
  const [packs, setPacks] = useState(() => PacksManager.getAll() as Array<{ id: string; nombre?: string; descripcion?: string; equipos?: Array<{ tipo: string; modelo: string }> }>)
  const [newPack, setNewPack] = useState<{ nombre: string; descripcion: string; equipos: Array<{ tipo: string; modelo: string }> }>({ nombre: '', descripcion: '', equipos: [] })
  const [newPackEquipo, setNewPackEquipo] = useState({ tipo: '', modelo: '' })
  const refreshPacks = () => setPacks(PacksManager.getAll() as any)

  // AD search - técnicos
  const [tecnicoQuery, setTecnicoQuery] = useState('')
  const [tecnicoResults, setTecnicoResults] = useState<any[]>([])
  const [tecnicoSearching, setTecnicoSearching] = useState(false)
  const [selectedTecnico, setSelectedTecnico] = useState<any>(null)
  const tecnicoSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // AD search - admins
  const [adminQuery, setAdminQuery] = useState('')
  const [adminResults, setAdminResults] = useState<any[]>([])
  const [adminSearching, setAdminSearching] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null)
  const adminSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Log filters
  const [logTecnico, setLogTecnico] = useState('all')
  const [logTipo, setLogTipo] = useState('all')

  const dm = dataManagerRef.current

  const act = async (fn: () => Promise<any>, successMsg: string) => {
    setLoading(true)
    try { await fn(); showToast(successMsg, 'success'); await refreshData() }
    catch (e: any) { showToast('Error: ' + e.message, 'error') }
    finally { setLoading(false) }
  }

  const loadCatalogo = async () => {
    if (catalogoLoaded || !dm) return
    setLoading(true)
    try { const items = await dm.getCatalogoRaw(); setCatalogoRaw(items); setCatalogoLoaded(true) }
    catch { showToast('Error cargando catálogo', 'error') }
    finally { setLoading(false) }
  }

  const searchAD = (query: string, setResults: (r: any[]) => void, setSearching: (b: boolean) => void, ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
    if (ref.current) clearTimeout(ref.current)
    if (!query || query.length < 2) { setResults([]); return }
    setSearching(true)
    ref.current = setTimeout(async () => {
      try { const r = await dm!.searchUsers(query); setResults(r) }
      catch { setResults([]) }
      finally { setSearching(false) }
    }, 400)
  }

  useEffect(() => { if (activeSection === 'catalogo') loadCatalogo() }, [activeSection])

  const sectionBtn = (key: string, label: string, icon: string) => (
    <button onClick={() => setActiveSection(key)} style={{ padding: '12px 20px', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', background: activeSection === key ? 'var(--accent-purple)' : 'var(--bg-tertiary)', color: activeSection === key ? 'white' : 'var(--text-secondary)', transition: 'all .2s', minWidth: '160px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
      {icon} {label}
    </button>
  )

  const card = (title: string, content: React.ReactNode) => (
    <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '16px' }}>{title}</div>
      <div style={{ padding: '20px' }}>{content}</div>
    </div>
  )

  // ── Ubicaciones ──
  const renderUbicaciones = () => card('📍 Ubicaciones',
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input type="text" className="form-input" placeholder="Nueva ubicación (ej: Madrid - Almacen)" value={newUbicacion} onChange={(ev) => setNewUbicacion(ev.target.value)} style={{ flex: 1 }} onKeyDown={(ev) => { if (ev.key === 'Enter' && dm) act(() => dm.createUbicacion(newUbicacion.trim()), 'Ubicación añadida').then(() => setNewUbicacion('')) }} />
        <button className="button button-success" onClick={() => { if (dm) act(() => dm.createUbicacion(newUbicacion.trim()), 'Ubicación añadida').then(() => setNewUbicacion('')) }} disabled={loading || !newUbicacion.trim()} style={{ padding: '12px 20px' }}>{loading ? <span className="loading-spinner" /> : '+ Añadir'}</button>
      </div>
      {state.ubicacionesAll.length === 0
        ? <div style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', padding: '20px' }}>No hay ubicaciones todavía</div>
        : state.ubicacionesAll.map((u) => {
            const isEditing = editingUbicId === u.id
            return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: u.activo ? 'var(--bg-primary)' : 'rgba(239,68,68,.05)', borderRadius: '8px', marginBottom: '6px', opacity: u.activo ? 1 : 0.6 }}>
                {isEditing
                  ? <input type="text" className="form-input" value={editingUbicNombre} onChange={(ev) => setEditingUbicNombre(ev.target.value)} style={{ flex: 1, padding: '6px 10px', fontSize: '14px' }} onKeyDown={(ev) => { if (ev.key === 'Enter' && dm) act(() => dm.updateUbicacion(u.id, editingUbicNombre.trim()), 'Ubicación actualizada').then(() => setEditingUbicId(null)); if (ev.key === 'Escape') setEditingUbicId(null) }} />
                  : <span style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>{u.nombre}</span>}
                {isEditing
                  ? <button className="button button-success" onClick={() => { if (dm) act(() => dm.updateUbicacion(u.id, editingUbicNombre.trim()), 'Actualizada').then(() => setEditingUbicId(null)) }} disabled={loading} style={{ padding: '6px 12px', fontSize: '12px' }}>✓ Guardar</button>
                  : <button className="button button-secondary" onClick={() => { setEditingUbicId(u.id); setEditingUbicNombre(u.nombre) }} style={{ padding: '6px 10px', fontSize: '12px' }}>✏️</button>}
                {isEditing
                  ? <button className="button button-secondary" onClick={() => setEditingUbicId(null)} style={{ padding: '6px 10px', fontSize: '12px' }}>✕</button>
                  : <button className={'button ' + (u.activo ? 'button-warning' : 'button-success')} onClick={() => { if (dm) act(() => dm.toggleUbicacion(u.id, u.activo), u.activo ? 'Desactivada' : 'Activada') }} disabled={loading} style={{ padding: '6px 12px', fontSize: '12px' }}>{u.activo ? 'Desactivar' : 'Activar'}</button>}
                {!isEditing && <button className="button button-danger" onClick={() => { if (dm) act(() => dm.deleteUbicacion(u.id), 'Eliminada') }} disabled={loading} style={{ padding: '6px 10px', fontSize: '12px' }}>🗑️</button>}
              </div>
            )
          })}
    </div>
  )

  // ── Catálogo ──
  const renderCatalogo = () => card('📦 Catálogo de Material',
    <div>
      <div style={{ marginBottom: '20px' }}>
        <div className="form-label" style={{ marginBottom: '8px' }}>Nuevo Tipo</div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input type="text" className="form-input" placeholder="Nombre del tipo (ej: Docking Stations)" value={newTipo} onChange={(ev) => setNewTipo(ev.target.value)} style={{ flex: 1 }} />
          <button onClick={() => setNewTipoEtiqueta((v) => !v)} style={{ padding: '8px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, background: newTipoEtiqueta ? 'rgba(63,185,80,.15)' : 'rgba(88,166,255,.1)', color: newTipoEtiqueta ? 'var(--accent-green)' : 'var(--accent-blue)', whiteSpace: 'nowrap' }}>
            {newTipoEtiqueta ? '💻 Lleva etiqueta' : '📦 Sin etiqueta'}
          </button>
          <button className="button button-success" onClick={() => { if (dm) act(async () => { await dm.addToCatalog(newTipo.trim(), '', newTipoEtiqueta); setCatalogoLoaded(false); await refreshData(['catalogo']) }, 'Tipo añadido').then(() => { setNewTipo(''); setNewTipoEtiqueta(false) }) }} disabled={loading || !newTipo.trim()} style={{ padding: '8px 16px' }}>+ Añadir</button>
        </div>
      </div>
      <div style={{ marginBottom: '20px' }}>
        <div className="form-label" style={{ marginBottom: '8px' }}>Nuevo Modelo</div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <select className="form-select" value={newModeloTipo} onChange={(ev) => setNewModeloTipo(ev.target.value)} style={{ flex: 1 }}>
            <option value="">-- Selecciona tipo --</option>
            {Object.keys(state.catalogoTipos || {}).filter((tp) => !(state.catalogoTipos[tp] || {} as any).llevaEtiqueta).map((tp) => <option key={tp} value={tp}>{tp}</option>)}
          </select>
          <input type="text" className="form-input" placeholder="Nombre del modelo" value={newModelo} onChange={(ev) => setNewModelo(ev.target.value)} style={{ flex: 2 }} onKeyDown={(ev) => { if (ev.key === 'Enter' && newModeloTipo && newModelo.trim() && dm) act(async () => { await dm.addToCatalog(newModeloTipo, newModelo.trim(), false); setCatalogoLoaded(false) }, 'Modelo añadido').then(() => setNewModelo('')) }} />
          <button className="button button-success" onClick={() => { if (dm) act(async () => { await dm.addToCatalog(newModeloTipo, newModelo.trim(), false); setCatalogoLoaded(false) }, 'Modelo añadido').then(() => setNewModelo('')) }} disabled={loading || !newModeloTipo || !newModelo.trim()} style={{ padding: '12px 20px' }}>+ Añadir</button>
        </div>
      </div>
      {loading && !catalogoLoaded ? <div style={{ textAlign: 'center', padding: '20px' }}><span className="loading-spinner" /></div> :
       catalogoRaw.length === 0 ? <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>El catálogo está vacío</div> :
       Object.entries(
         catalogoRaw.reduce((acc, item) => { if (!acc[item.tipo]) acc[item.tipo] = []; acc[item.tipo].push(item); return acc }, {} as Record<string, CatalogoRawItem[]>)
       ).map(([tipo, modelos]) => {
         const tieneEtiqueta = modelos.some((m) => m.llevaEtiqueta)
         return (
           <div key={tipo} style={{ marginBottom: '16px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
               <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--accent-blue)', textTransform: 'uppercase', flex: 1 }}>{tipo}</div>
               <button onClick={async () => {
                 if (!dm) return
                 try {
                   for (const m of modelos) await dm.updateCatalogLlevaEtiqueta(m.id, !tieneEtiqueta)
                   setCatalogoLoaded(false)
                   await refreshData(['catalogo'])
                   showToast(!tieneEtiqueta ? '💻 Lleva etiqueta activado' : '📦 Sin etiqueta activado', 'success')
                 } catch (err: any) { showToast('Error: ' + err.message, 'error') }
               }} style={{ padding: '5px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, background: tieneEtiqueta ? 'rgba(63,185,80,.15)' : 'rgba(88,166,255,.1)', color: tieneEtiqueta ? 'var(--accent-green)' : 'var(--accent-blue)', transition: 'all .2s' }}>
                 {tieneEtiqueta ? '💻 Lleva etiqueta' : '📦 Sin etiqueta'}
               </button>
             </div>
             {modelos.filter((m) => m.modelo).map((m) => (
               <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: m.activo ? 'var(--bg-primary)' : 'rgba(239,68,68,.05)', borderRadius: '6px', marginBottom: '4px', opacity: m.activo ? 1 : 0.6 }}>
                 <span style={{ flex: 1, fontSize: '14px' }}>{m.modelo}</span>
                 <button className="button button-danger" onClick={() => { if (dm) act(() => { setCatalogoLoaded(false); return dm.deleteCatalogItem(m.id) }, 'Modelo eliminado') }} disabled={loading} style={{ padding: '4px 10px', fontSize: '12px' }}>🗑️</button>
               </div>
             ))}
           </div>
         )
       })}
    </div>
  )

  // ── Técnicos ──
  const renderTecnicos = () => card('👤 Técnicos',
    <div>
      <div style={{ marginBottom: '16px' }}>
        <div className="form-label" style={{ marginBottom: '8px' }}>Nuevo Técnico — buscar en Active Directory</div>
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          <input type="text" className="form-input" placeholder="Buscar por nombre en Active Directory..." value={selectedTecnico ? selectedTecnico.displayName : tecnicoQuery} onChange={(ev) => {
            if (selectedTecnico) setSelectedTecnico(null)
            setTecnicoQuery(ev.target.value)
            searchAD(ev.target.value, setTecnicoResults, setTecnicoSearching, tecnicoSearchRef)
          }} />
          {selectedTecnico && <div style={{ marginTop: '6px', color: 'var(--accent-green)', fontSize: '13px' }}>✓ {selectedTecnico.displayName} · {selectedTecnico.mail}</div>}
          {(tecnicoSearching || tecnicoResults.length > 0) && !selectedTecnico && (
            <div className="user-search-dropdown">
              {tecnicoSearching && <div style={{ padding: '12px', color: 'var(--text-secondary)' }}>⏳ Buscando...</div>}
              {tecnicoResults.map((u: any) => (
                <div key={u.id} className="user-search-item" onClick={() => { setSelectedTecnico(u); setTecnicoQuery(''); setTecnicoResults([]) }}>
                  <div style={{ fontWeight: 600 }}>{u.displayName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{u.mail}</div>
                  {(u.department || u.jobTitle) && <div style={{ fontSize: '12px', color: 'var(--accent-blue)' }}>{[u.department, u.jobTitle].filter(Boolean).join(' · ')}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
        <button className="button button-success" onClick={() => { if (dm) act(async () => {
          if (!selectedTecnico) throw new Error('Selecciona un usuario del AD')
          const codigo = 'TEC' + Date.now().toString().slice(-6)
          await dm.createTechnician({ nombre: selectedTecnico.displayName, codigo, email: selectedTecnico.mail })
          setSelectedTecnico(null); setTecnicoQuery('')
        }, 'Técnico creado') }} disabled={loading || !selectedTecnico} style={{ width: '100%' }}>+ Crear Técnico</button>
      </div>
      {state.technicians.length === 0
        ? <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>No hay técnicos</div>
        : state.technicians.map((tc) => (
            <div key={tc.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: tc.activo ? 'var(--bg-primary)' : 'rgba(239,68,68,.05)', borderRadius: '8px', marginBottom: '6px', opacity: tc.activo ? 1 : 0.6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{tc.nombre}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{tc.email}</div>
                <div style={{ fontSize: '11px', color: 'var(--accent-blue)', fontFamily: 'IBM Plex Mono,monospace' }}>{tc.codigo}</div>
              </div>
              <button className="button button-primary" onClick={() => printTechnicianCard(tc)} style={{ padding: '6px 12px', fontSize: '12px' }}>🖨️</button>
              <button className={'button ' + (tc.activo ? 'button-warning' : 'button-success')} onClick={() => { if (dm) act(() => dm.toggleTechnicianStatus(tc.id, tc.activo), tc.activo ? 'Técnico desactivado' : 'Técnico activado') }} disabled={loading} style={{ padding: '6px 12px', fontSize: '12px' }}>{tc.activo ? 'Desactivar' : 'Activar'}</button>
            </div>
          ))}
    </div>
  )

  // ── Admins ──
  const renderAdmins = () => card('🛡️ Administradores',
    <div>
      <div style={{ marginBottom: '16px' }}>
        <div className="form-label" style={{ marginBottom: '8px' }}>Nuevo Administrador — buscar en Active Directory</div>
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          <input type="text" className="form-input" placeholder="Buscar por nombre en Active Directory..." value={selectedAdmin ? selectedAdmin.displayName : adminQuery} onChange={(ev) => {
            if (selectedAdmin) setSelectedAdmin(null)
            setAdminQuery(ev.target.value)
            searchAD(ev.target.value, setAdminResults, setAdminSearching, adminSearchRef)
          }} />
          {selectedAdmin && <div style={{ marginTop: '6px', color: 'var(--accent-green)', fontSize: '13px' }}>✓ {selectedAdmin.displayName} · {selectedAdmin.mail}</div>}
          {(adminSearching || adminResults.length > 0) && !selectedAdmin && (
            <div className="user-search-dropdown">
              {adminSearching && <div style={{ padding: '12px', color: 'var(--text-secondary)' }}>⏳ Buscando...</div>}
              {adminResults.map((u: any) => (
                <div key={u.id} className="user-search-item" onClick={() => { setSelectedAdmin(u); setAdminQuery(''); setAdminResults([]) }}>
                  <div style={{ fontWeight: 600 }}>{u.displayName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{u.mail}</div>
                  {(u.department || u.jobTitle) && <div style={{ fontSize: '12px', color: 'var(--accent-blue)' }}>{[u.department, u.jobTitle].filter(Boolean).join(' · ')}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
        <button className="button button-success" onClick={() => { if (dm) act(async () => {
          if (!selectedAdmin) throw new Error('Selecciona un usuario del AD')
          await dm.createAdmin(selectedAdmin.mail)
          setSelectedAdmin(null); setAdminQuery('')
        }, 'Admin añadido') }} disabled={loading || !selectedAdmin} style={{ width: '100%' }}>+ Añadir Admin</button>
      </div>
      <div className="info-banner orange" style={{ marginBottom: '16px' }}>🔒 Los administradores no se pueden eliminar desde la app. Para revocar acceso, desactívalos.</div>
      {state.adminsAll.length === 0
        ? <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>No hay admins</div>
        : state.adminsAll.map((a) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: a.activo ? 'var(--bg-primary)' : 'rgba(239,68,68,.05)', borderRadius: '8px', marginBottom: '6px', opacity: a.activo ? 1 : 0.6 }}>
              <span style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>{a.email}</span>
              {user && a.email.toLowerCase() === user.email.toLowerCase() && <span style={{ fontSize: '11px', color: 'var(--accent-purple)', background: 'rgba(168,85,247,.1)', padding: '2px 8px', borderRadius: '4px' }}>Tú</span>}
              <button className={'button ' + (a.activo ? 'button-warning' : 'button-success')} onClick={() => { if (dm) act(() => dm.toggleAdmin(a.id, a.activo), a.activo ? 'Admin desactivado' : 'Admin activado') }} disabled={loading || (user != null && a.email.toLowerCase() === user.email.toLowerCase())} style={{ padding: '6px 12px', fontSize: '12px' }}>{a.activo ? 'Desactivar' : 'Activar'}</button>
            </div>
          ))}
    </div>
  )

  // ── Sociedades ──
  const renderSociedades = () => card('🏢 Sociedades',
    <div>
      <div style={{ marginBottom: '20px' }}>
        <div className="form-label" style={{ marginBottom: '8px' }}>Nueva Sociedad</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', marginBottom: '8px' }}>
          <input type="text" className="form-input" placeholder="Nombre completo" value={newSoc.nombre} onChange={(ev) => setNewSoc((s) => ({ ...s, nombre: ev.target.value }))} />
          <input type="text" className="form-input" placeholder="Cód (3)" maxLength={3} value={newSoc.codigo} onChange={(ev) => setNewSoc((s) => ({ ...s, codigo: ev.target.value.toUpperCase() }))} style={{ width: '80px', fontFamily: 'IBM Plex Mono,monospace', fontWeight: 700 }} />
          <select className="form-select" value={newSoc.pais} onChange={(ev) => setNewSoc((s) => ({ ...s, pais: ev.target.value }))} style={{ width: '150px' }}>
            <option value="">País</option>
            {PAISES_LIST.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {newSoc.codigo.length === 3 && (state.sociedades || []).some((s) => s.codigo === newSoc.codigo) && <div style={{ color: 'var(--accent-red)', fontSize: '13px', marginBottom: '8px' }}>⚠️ Código "{newSoc.codigo}" ya existe.</div>}
        <button className="button button-success" onClick={() => {
          if ((state.sociedades || []).some((s) => s.codigo === newSoc.codigo)) { showToast('Código duplicado', 'error'); return }
          if (dm) act(() => dm.createSociedad(newSoc), 'Sociedad añadida').then(() => setNewSoc({ nombre: '', codigo: '', pais: '' }))
        }} disabled={loading || !newSoc.nombre.trim() || newSoc.codigo.length !== 3 || !newSoc.pais.trim()} style={{ width: '100%' }}>+ Añadir Sociedad</button>
      </div>
      {(state.sociedades || []).length === 0
        ? <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>No hay sociedades</div>
        : (state.sociedades || []).map((s) => {
            const isEditing = editingSocId === s.id
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: s.activo ? 'var(--bg-primary)' : 'rgba(239,68,68,.05)', borderRadius: '8px', marginBottom: '6px', opacity: s.activo ? 1 : 0.6 }}>
                <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: '12px', fontWeight: 700, color: 'var(--accent-purple)', minWidth: '40px' }}>{s.codigo}</span>
                {isEditing ? (
                  <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
                    <input type="text" className="form-input" value={editingSocData.nombre || ''} onChange={(ev) => setEditingSocData((d) => ({ ...d, nombre: ev.target.value }))} style={{ flex: 1, padding: '6px 10px', fontSize: '14px' }} />
                    <input type="text" className="form-input" maxLength={3} value={editingSocData.codigo || ''} onChange={(ev) => setEditingSocData((d) => ({ ...d, codigo: ev.target.value.toUpperCase() }))} style={{ width: '70px', fontFamily: 'IBM Plex Mono,monospace', fontWeight: 700, padding: '6px 10px', fontSize: '14px' }} />
                    <select className="form-select" value={editingSocData.pais || ''} onChange={(ev) => setEditingSocData((d) => ({ ...d, pais: ev.target.value }))} style={{ width: '150px', padding: '6px 10px', fontSize: '14px' }}>
                      <option value="">País</option>
                      {PAISES_LIST.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                ) : (
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{s.nombre}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{s.pais}</div>
                  </div>
                )}
                {isEditing
                  ? <button className="button button-success" onClick={() => { const dup = editingSocData.codigo !== s.codigo && (state.sociedades || []).some((x) => x.codigo === editingSocData.codigo); if (dup) { showToast('Código duplicado', 'error'); return } if (dm) act(() => dm.updateSociedad(s.id, editingSocData), 'Actualizada').then(() => setEditingSocId(null)) }} style={{ padding: '6px 12px', fontSize: '12px' }}>✓</button>
                  : <button className="button button-secondary" onClick={() => { setEditingSocId(s.id); setEditingSocData({ nombre: s.nombre, codigo: s.codigo, pais: s.pais }) }} style={{ padding: '6px 10px', fontSize: '12px' }}>✏️</button>}
                {isEditing
                  ? <button className="button button-secondary" onClick={() => setEditingSocId(null)} style={{ padding: '6px 10px', fontSize: '12px' }}>✕</button>
                  : <button className={'button ' + (s.activo ? 'button-warning' : 'button-success')} onClick={() => { if (dm) act(() => dm.toggleSociedad(s.id, s.activo), s.activo ? 'Desactivada' : 'Activada') }} disabled={loading} style={{ padding: '6px 10px', fontSize: '12px' }}>{s.activo ? 'Desactivar' : 'Activar'}</button>}
                {!isEditing && <button className="button button-danger" onClick={() => { if (dm) act(() => dm.deleteSociedad(s.id), 'Eliminada') }} disabled={loading} style={{ padding: '6px 10px', fontSize: '12px' }}>🗑️</button>}
              </div>
            )
          })}
    </div>
  )

  // ── Proveedores ──
  const renderProveedores = () => card('🚚 Proveedores',
    <div>
      <div style={{ marginBottom: '20px' }}>
        <div className="form-label" style={{ marginBottom: '8px' }}>Nuevo Proveedor</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Nombre *</label><input type="text" className="form-input" placeholder="Ej: Telefónica" value={newProv.nombre} onChange={(ev) => setNewProv((s) => ({ ...s, nombre: ev.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Contacto</label><input type="text" className="form-input" placeholder="Persona de contacto" value={newProv.contacto} onChange={(ev) => setNewProv((s) => ({ ...s, contacto: ev.target.value }))} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" placeholder="contacto@proveedor.com" value={newProv.email} onChange={(ev) => setNewProv((s) => ({ ...s, email: ev.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Teléfono</label><input type="text" className="form-input" placeholder="+34 600 000 000" value={newProv.telefono} onChange={(ev) => setNewProv((s) => ({ ...s, telefono: ev.target.value }))} /></div>
        </div>
        <button className="button button-success" onClick={() => { if (dm) act(() => dm.createProveedor(newProv), 'Proveedor añadido').then(() => setNewProv({ nombre: '', contacto: '', email: '', telefono: '' })) }} disabled={loading || !newProv.nombre.trim()} style={{ width: '100%' }}>+ Añadir Proveedor</button>
      </div>
      {(!state.proveedores || state.proveedores.length === 0)
        ? <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>No hay proveedores</div>
        : (state.proveedores || []).map((p) => {
            const isEditing = editingProvId === p.id
            return (
              <div key={p.id} style={{ background: 'var(--bg-primary)', borderRadius: '8px', padding: '12px 14px', marginBottom: '8px' }}>
                {isEditing ? (
                  <div>
                    <div className="form-row">
                      <div className="form-group"><label className="form-label">Nombre</label><input type="text" className="form-input" value={editingProvData.nombre || ''} onChange={(ev) => setEditingProvData((d) => ({ ...d, nombre: ev.target.value }))} /></div>
                      <div className="form-group"><label className="form-label">Contacto</label><input type="text" className="form-input" value={editingProvData.contacto || ''} onChange={(ev) => setEditingProvData((d) => ({ ...d, contacto: ev.target.value }))} /></div>
                    </div>
                    <div className="form-row">
                      <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={editingProvData.email || ''} onChange={(ev) => setEditingProvData((d) => ({ ...d, email: ev.target.value }))} /></div>
                      <div className="form-group"><label className="form-label">Teléfono</label><input type="text" className="form-input" value={editingProvData.telefono || ''} onChange={(ev) => setEditingProvData((d) => ({ ...d, telefono: ev.target.value }))} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="button button-success" onClick={() => { if (dm) act(() => dm.updateProveedor(p.id, editingProvData), 'Actualizado').then(() => setEditingProvId(null)) }} style={{ padding: '8px 16px', fontSize: '13px' }}>✓ Guardar</button>
                      <button className="button button-secondary" onClick={() => setEditingProvId(null)} style={{ padding: '8px 12px', fontSize: '13px' }}>✕ Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{p.nombre}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{[p.contacto, p.email, p.telefono].filter(Boolean).join(' · ')}</div>
                    </div>
                    <button className="button button-secondary" onClick={() => { setEditingProvId(p.id); setEditingProvData({ nombre: p.nombre, contacto: p.contacto, email: p.email, telefono: p.telefono }) }} style={{ padding: '6px 10px', fontSize: '12px' }}>✏️</button>
                    <button className="button button-danger" onClick={() => { if (dm) act(() => dm.deleteProveedor(p.id), 'Eliminado') }} disabled={loading} style={{ padding: '6px 10px', fontSize: '12px' }}>🗑️</button>
                  </div>
                )}
              </div>
            )
          })}
    </div>
  )

  // ── Packs ──
  const tiposConEtiquetaEstricto = Object.keys(state.catalogoTipos || {}).filter((tp) => (state.catalogoTipos[tp] || {} as any).llevaEtiqueta)
  const renderPacks = () => card('🎒 Packs de Incorporación',
    <div>
      <div style={{ marginBottom: '24px' }}>
        <div className="form-label" style={{ marginBottom: '8px' }}>Nuevo Pack</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Nombre *</label><input type="text" className="form-input" placeholder="Ej: Usuario Estándar" value={newPack.nombre} onChange={(ev) => setNewPack((p) => ({ ...p, nombre: ev.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Descripción</label><input type="text" className="form-input" placeholder="Ej: iPhone 16e + HP ProBook G11" value={newPack.descripcion} onChange={(ev) => setNewPack((p) => ({ ...p, descripcion: ev.target.value }))} /></div>
        </div>
        <div style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '12px', marginBottom: '10px' }}>
          <div className="form-label" style={{ marginBottom: '8px' }}>Equipos del pack</div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <select className="form-select" value={newPackEquipo.tipo} onChange={(ev) => setNewPackEquipo((p) => ({ ...p, tipo: ev.target.value, modelo: '' }))} style={{ flex: 1 }}>
              <option value="">-- Tipo --</option>
              {(tiposConEtiquetaEstricto.length > 0 ? tiposConEtiquetaEstricto : Object.keys(state.catalogoTipos || {})).map((tp) => <option key={tp} value={tp}>{tp}</option>)}
            </select>
            <select className="form-select" value={newPackEquipo.modelo} onChange={(ev) => setNewPackEquipo((p) => ({ ...p, modelo: ev.target.value }))} disabled={!newPackEquipo.tipo} style={{ flex: 1 }}>
              <option value="">-- Modelo --</option>
              {(state.catalogo[newPackEquipo.tipo] || []).map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <button type="button" className="button button-success" onClick={() => {
              if (!newPackEquipo.tipo || !newPackEquipo.modelo) return
              setNewPack((p) => ({ ...p, equipos: [...p.equipos, { tipo: newPackEquipo.tipo, modelo: newPackEquipo.modelo }] }))
              setNewPackEquipo({ tipo: '', modelo: '' })
            }} disabled={!newPackEquipo.tipo || !newPackEquipo.modelo} style={{ padding: '10px 16px' }}>+ Añadir</button>
          </div>
          {newPack.equipos.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {newPack.equipos.map((eq, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg-primary)', borderRadius: '6px', fontSize: '13px' }}>
                  <span>{eq.tipo} · {eq.modelo}</span>
                  <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-red)', fontSize: '16px' }} onClick={() => setNewPack((p) => ({ ...p, equipos: p.equipos.filter((_, i) => i !== idx) }))}>×</button>
                </div>
              ))}
            </div>
          ) : <div style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '8px' }}>Añade al menos un equipo</div>}
        </div>
        <button className="button button-success" onClick={() => { PacksManager.create(newPack as any); refreshPacks(); setNewPack({ nombre: '', descripcion: '', equipos: [] }); showToast('Pack creado', 'success') }} disabled={!newPack.nombre.trim() || newPack.equipos.length === 0} style={{ width: '100%' }}>+ Crear Pack</button>
      </div>
      {packs.length === 0
        ? <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>No hay packs. Crea el primero arriba.</div>
        : packs.map((pack) => (
            <div key={pack.id} style={{ background: 'var(--bg-primary)', borderRadius: '10px', padding: '16px', marginBottom: '12px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>🎒 {pack.nombre}</div>
                  {pack.descripcion && <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{pack.descripcion}</div>}
                </div>
                <button className="button button-danger" onClick={() => { PacksManager.delete(pack.id); refreshPacks(); showToast('Pack eliminado', 'success') }} style={{ padding: '6px 10px', fontSize: '12px' }}>🗑️</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {(pack.equipos || []).map((eq, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'var(--bg-tertiary)', borderRadius: '6px', fontSize: '13px' }}>
                    <span style={{ width: '20px', height: '20px', background: 'var(--accent-blue)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'white', flexShrink: 0 }}>{idx + 1}</span>
                    <span style={{ fontWeight: 500 }}>{eq.tipo}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>·</span>
                    <span style={{ color: 'var(--accent-blue)' }}>{eq.modelo}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
    </div>
  )

  // ── Exportar ──
  const renderExportar = () => (
    <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '16px' }}>📊 Exportar para Auditoría</div>
      <div style={{ padding: '24px' }}>
        <div style={{ background: 'rgba(88,166,255,.07)', border: '1px solid rgba(88,166,255,.2)', borderRadius: '10px', padding: '14px 16px', marginBottom: '24px', fontSize: '13px', color: 'var(--accent-blue)', lineHeight: 1.6 }}>
          📁 Genera un archivo Excel con 5 pestañas: <strong>Resumen ejecutivo</strong>, <strong>Equipos</strong>, <strong>Inventario</strong>, <strong>Historial</strong> y <strong>Asignaciones activas</strong>.
        </div>
        <div className="form-row" style={{ marginBottom: '16px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Sociedad (opcional)</label>
            <select className="form-select" value={exportSoc} onChange={(ev) => setExportSoc(ev.target.value)}>
              <option value="">Todas las sociedades</option>
              {(state.sociedades || []).filter((s) => s.activo).map((s) => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Historial desde</label>
            <input type="date" className="form-input" value={exportDesde} onChange={(ev) => setExportDesde(ev.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Historial hasta</label>
            <input type="date" className="form-input" value={exportHasta} onChange={(ev) => setExportHasta(ev.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {[
            { label: 'Equipos', value: (state.activos || []).filter((a) => !exportSoc || a.sociedad === exportSoc).length, color: '#58a6ff', icon: '💻' },
            { label: 'Inventario', value: (state.inventory || []).length, color: '#3fb950', icon: '📦' },
            { label: 'Movimientos', value: (state.history || []).filter((h) => { if (exportDesde && new Date(h.fecha) < new Date(exportDesde)) return false; if (exportHasta && new Date(h.fecha) > new Date(exportHasta + 'T23:59:59')) return false; return true }).length, color: '#a855f7', icon: '📜' },
            { label: 'Asignaciones', value: (state.assignments || []).filter((a) => a.estado === 'Activo').length, color: '#fbbf24', icon: '📋' },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, minWidth: '100px', background: 'var(--bg-secondary)', border: '1px solid ' + s.color + '33', borderRadius: '10px', padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', marginBottom: '4px' }}>{s.icon}</div>
              <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'IBM Plex Mono,monospace', color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
        <button className="button button-success" style={{ width: '100%', fontSize: '16px', padding: '16px', gap: '10px' }} onClick={() => exportAuditoria(state, { sociedad: exportSoc || undefined, desde: exportDesde || undefined, hasta: exportHasta || undefined }, showToast as any)}>
          ⬇️ Descargar Excel de Auditoría
        </button>
      </div>
    </div>
  )

  // ── Ajustes ──
  const renderAjustes = () => card('⚙️ Ajustes Globales',
    <div>
      <div className="form-group">
        <label className="form-label">Stock Mínimo por Defecto</label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input type="number" min={0} className="form-input" value={stockMinimoInput} onChange={(ev) => setStockMinimoInput(ev.target.value)} style={{ maxWidth: '120px' }} />
          <button className="button button-success" onClick={() => { const val = parseInt(stockMinimoInput) || 2; localStorage.setItem('stockMinimoDefault', String(val)); dispatch({ type: 'SET_STOCK_MINIMO', payload: val }); showToast('Stock mínimo por defecto: ' + val, 'success') }} style={{ padding: '12px 20px' }}>✓ Guardar</button>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Se aplica al crear nuevos productos</span>
        </div>
      </div>
      <div className="form-group" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
        <label className="form-label">🖨️ DYMO Connect 1.6 — LabelName</label>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
          El LabelName identifica el tipo de etiqueta en DYMO Connect 1.6. Usa el botón 🔍 Detectar para obtenerlo automáticamente.{' '}
          <span style={{ fontFamily: 'IBM Plex Mono,monospace', color: 'var(--accent-blue)', fontSize: '12px' }}>{localStorage.getItem('dymo_label_name') ? '✅ Guardado: ' + localStorage.getItem('dymo_label_name') : '⚠️ No configurado — usa NameBadge11356 por defecto'}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input type="text" className="form-input" id="dymo-paper-input" placeholder="ej: 11356 Name Badge" defaultValue={localStorage.getItem('dymo_label_name') || ''} style={{ flex: 1, fontFamily: 'IBM Plex Mono,monospace' }} />
          <button className="button button-success" style={{ padding: '12px 16px' }} onClick={() => { const el = document.getElementById('dymo-paper-input') as HTMLInputElement; const val = el?.value?.trim(); if (val) { localStorage.setItem('dymo_label_name', val); showToast('LabelName guardado: ' + val, 'success') } else { localStorage.removeItem('dymo_label_name'); showToast('LabelName eliminado — se usará NameBadge11356', 'success') } }}>✓ Guardar</button>
          <button className="button button-secondary" style={{ padding: '12px 16px' }} onClick={async () => {
            showToast('Detectando PaperName...', 'success')
            try {
              const resp = await fetch('https://127.0.0.1:41951/dcd/api/get-default-label/LabelWriter')
              const data = await resp.json()
              const rv = data.responseValue || data
              const ln = rv && rv.label && rv.label.name
              const el = document.getElementById('dymo-paper-input') as HTMLInputElement
              if (ln && el) { el.value = ln; showToast('LabelName detectado: ' + ln, 'success') }
              else showToast('Respuesta: ' + JSON.stringify(rv).slice(0, 150), 'success')
            } catch (e: any) { showToast('Error: ' + e.message, 'error') }
          }}>🔍 Detectar</button>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
          {['NameBadge11356', '11356 Name Badge', 'NameBadge', 'Address30251', 'Address30252'].map((pn) => (
            <button key={pn} onClick={() => { const el = document.getElementById('dymo-paper-input') as HTMLInputElement; if (el) el.value = pn }} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'IBM Plex Mono,monospace' }}>{pn}</button>
          ))}
        </div>
      </div>
    </div>
  )

  // ── Log de Acciones ──
  const renderLog = () => (
    <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '16px' }}>📋 Log de Acciones</div>
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <select className="filter-select" style={{ flex: 1 }} value={logTecnico} onChange={(ev) => setLogTecnico(ev.target.value)}>
            <option value="all">Todos los técnicos</option>
            {state.technicians.map((tc) => <option key={tc.id} value={tc.nombre}>{tc.nombre}</option>)}
          </select>
          <select className="filter-select" value={logTipo} onChange={(ev) => setLogTipo(ev.target.value)}>
            <option value="all">Todos los tipos</option>
            {['Entrada', 'Salida', 'Asignacion', 'Prestamo', 'Devolucion', 'CambioEstado'].map((tp) => <option key={tp} value={tp}>{tp}</option>)}
          </select>
        </div>
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {state.history
            .filter((h) => (logTecnico === 'all' || h.tecnico === logTecnico) && (logTipo === 'all' || h.tipo === logTipo))
            .slice(0, 200)
            .map((h) => (
              <div key={h.id} style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', minWidth: '120px', fontFamily: 'IBM Plex Mono,monospace' }}>{new Date(h.fecha).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                <span className={'movement-badge ' + h.tipo} style={{ minWidth: '80px', textAlign: 'center' }}>{h.tipo}</span>
                <span style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>{h.producto}</span>
                {h.idEtiqueta && <span style={{ fontSize: '11px', color: 'var(--accent-blue)', fontFamily: 'IBM Plex Mono,monospace' }}>{h.idEtiqueta}</span>}
                <span style={{ fontSize: '12px', color: 'var(--accent-green)' }}>{h.tecnico || '-'}</span>
                {h.usuario && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>→ {h.usuario}</span>}
              </div>
            ))}
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700 }}>{t.adminPanel}</h2>
      </div>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '190px' }}>
          {/* Infraestructura */}
          <button onClick={() => toggleGroup('infraestructura')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', width: '100%', borderRadius: '6px' }}
            onMouseEnter={(ev) => { ev.currentTarget.style.background = 'var(--bg-primary)' }}
            onMouseLeave={(ev) => { ev.currentTarget.style.background = 'none' }}>
            <span>{t.infraGroup}</span><span>{openGroups.infraestructura ? '▾' : '▸'}</span>
          </button>
          {openGroups.infraestructura && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingLeft: '10px', marginBottom: '4px', borderLeft: '2px solid rgba(168,85,247,.3)' }}>
              {sectionBtn('ubicaciones', t.locations, '📍')}
              {sectionBtn('sociedades', t.societies, '🏢')}
            </div>
          )}

          {/* Catálogo */}
          <button onClick={() => toggleGroup('catalogo')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', width: '100%', borderRadius: '6px' }}
            onMouseEnter={(ev) => { ev.currentTarget.style.background = 'var(--bg-primary)' }}
            onMouseLeave={(ev) => { ev.currentTarget.style.background = 'none' }}>
            <span>📦 Catálogo</span><span>{openGroups.catalogo ? '▾' : '▸'}</span>
          </button>
          {openGroups.catalogo && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingLeft: '10px', marginBottom: '4px', borderLeft: '2px solid rgba(168,85,247,.3)' }}>
              {isAdmin && sectionBtn('proveedores', t.suppliers, '🚚')}
              {sectionBtn('catalogo', t.catalog, '📦')}
              {isAdmin && sectionBtn('packs', t.packs, '🎒')}
            </div>
          )}

          {/* Usuarios - admin only */}
          {isAdmin && (
            <>
              <button onClick={() => toggleGroup('usuarios')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', width: '100%', borderRadius: '6px' }}
                onMouseEnter={(ev) => { ev.currentTarget.style.background = 'var(--bg-primary)' }}
                onMouseLeave={(ev) => { ev.currentTarget.style.background = 'none' }}>
                <span>{t.usersGroup}</span><span>{openGroups.usuarios ? '▾' : '▸'}</span>
              </button>
              {openGroups.usuarios && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingLeft: '10px', marginBottom: '4px', borderLeft: '2px solid rgba(168,85,247,.3)' }}>
                  {sectionBtn('tecnicos', t.technicians, '👤')}
                  {sectionBtn('admins', t.administrators, '🛡️')}
                </div>
              )}
            </>
          )}

          {/* Sistema - admin only */}
          {isAdmin && (
            <>
              <button onClick={() => toggleGroup('sistema')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', width: '100%', borderRadius: '6px' }}
                onMouseEnter={(ev) => { ev.currentTarget.style.background = 'var(--bg-primary)' }}
                onMouseLeave={(ev) => { ev.currentTarget.style.background = 'none' }}>
                <span>{t.systemGroup}</span><span>{openGroups.sistema ? '▾' : '▸'}</span>
              </button>
              {openGroups.sistema && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingLeft: '10px', borderLeft: '2px solid rgba(168,85,247,.3)' }}>
                  {sectionBtn('ajustes', t.settings, '⚙️')}
                  {sectionBtn('exportar', t.exportAudit, '📊')}
                  {sectionBtn('log', t.actionLog, '📋')}
                  {sectionBtn('errores', '🔴 Errores', '🐛')}
                  {sectionBtn('importar', t.bulkImport, '📥')}
                  {sectionBtn('changelog', t.changelog, '📋')}
                </div>
              )}
            </>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          {activeSection === 'ubicaciones' && renderUbicaciones()}
          {activeSection === 'sociedades' && renderSociedades()}
          {activeSection === 'proveedores' && renderProveedores()}
          {activeSection === 'packs' && renderPacks()}
          {activeSection === 'catalogo' && renderCatalogo()}
          {activeSection === 'tecnicos' && renderTecnicos()}
          {activeSection === 'admins' && renderAdmins()}
          {activeSection === 'ajustes' && renderAjustes()}
          {activeSection === 'exportar' && renderExportar()}
          {activeSection === 'errores' && <ErrorLogPanel />}
          {activeSection === 'log' && renderLog()}
          {activeSection === 'importar' && <BulkImportSection />}
          {activeSection === 'changelog' && <ChangelogSection />}
        </div>
      </div>
    </div>
  )
}
