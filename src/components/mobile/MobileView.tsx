import { useState, useRef } from 'react'
import { useAppContext } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { useAppData } from '../../hooks/useAppData'
import { showToast } from '../../hooks/useToast'
import { exportEtiquetaPDF } from '../../utils/pdf'
import { startBarcodeScanner } from '../../utils/scanner'
import { T } from '../../i18n'
import type { Activo } from '../../types/equipment'

type Screen = 'home' | 'scan' | 'equipo' | 'asignaciones' | 'inventario' | 'recepcion'

export default function MobileView() {
  const { state, dispatch } = useAppContext()
  const { user } = useAuth()
  const { refreshData } = useAppData()

  const [screen, setScreen] = useState<Screen>('home')
  const [scannedEquipo, setScannedEquipo] = useState<Activo | null>(null)
  const [mobileSearch, setMobileSearch] = useState('')
  const [scanning, setScanning] = useState(false)
  const [sigFullscreen, setSigFullscreen] = useState(false)
  const [sigData, setSigData] = useState<string | null>(null)
  const sigCanvasRef = useRef<HTMLCanvasElement>(null)
  const sigDrawing = useRef(false)
  const sigLast = useRef<{ x: number; y: number } | null>(null)

  const hoy = new Date().toLocaleDateString('es-ES')

  // ── Signature helpers ──
  const sigPos = (ev: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const t = 'touches' in ev ? (ev as React.TouchEvent).touches[0] : (ev as React.MouseEvent)
    return {
      x: (t.clientX - rect.left) * (canvas.width / rect.width),
      y: (t.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const openSignature = () => {
    setSigData(null)
    setSigFullscreen(true)
    try { (screen as any).orientation?.lock?.('landscape').catch(() => {}) } catch (_) {}
    setTimeout(() => {
      const c = sigCanvasRef.current
      if (c) { c.width = c.offsetWidth; c.height = c.offsetHeight; c.getContext('2d')!.clearRect(0, 0, c.width, c.height) }
    }, 100)
  }

  const closeSignature = (save: boolean) => {
    if (save && sigCanvasRef.current) setSigData(sigCanvasRef.current.toDataURL())
    setSigFullscreen(false)
    try { (screen as any).orientation?.unlock?.() } catch (_) {}
  }

  const drawMove = (ev: React.MouseEvent | React.TouchEvent, lineWidth: number) => {
    if (!sigDrawing.current || !sigLast.current) return
    const canvas = ev.target as HTMLCanvasElement
    const ctx = canvas.getContext('2d')!
    const p = sigPos(ev, canvas)
    ctx.beginPath()
    ctx.moveTo(sigLast.current.x, sigLast.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.strokeStyle = '#1a1f2e'
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    sigLast.current = p
  }

  // ── KPIs ──
  const movHoy = (state.history || []).filter((h) => new Date(h.fecha).toDateString() === new Date().toDateString()).length
  const misAsig = (state.assignments || []).filter((a) => a.estado === 'Activo').length
  const pendientes = (state.activos || []).filter((a) => a.estado === 'Pendiente').length
  const alertas = (state.inventory || []).filter((i) => i.stock === 0 || i.stock <= i.stockMinimo).length

  // ── Scanner ──
  const launchScanner = () => {
    setScanning(true)
    startBarcodeScanner((code: string) => {
      setScanning(false)
      let id = code.trim().toUpperCase()
      const urlMatch = id.match(/[?&]EQUIPO=([^&]+)/i)
      if (urlMatch) id = urlMatch[1]
      const activo = (state.activos || []).find((a) => a.idEtiqueta === id)
      if (activo) {
        setScannedEquipo(activo)
        setScreen('equipo')
      } else {
        setScannedEquipo(null)
        setScreen('scan')
        showToast('Equipo no encontrado: ' + id, 'warning')
      }
    })
  }

  // ── Search by ID ──
  const searchEquipo = (q: string) => {
    const ql = q.trim().toUpperCase()
    if (!ql) return
    const activo = (state.activos || []).find((a) =>
      a.idEtiqueta === ql || (a.numSerie || '').toUpperCase() === ql || (a.idEtiqueta || '').includes(ql)
    )
    if (activo) { setScannedEquipo(activo); setScreen('equipo') }
    else showToast('No encontrado: ' + q, 'warning')
  }

  const openModal = (type: string, item: any) => dispatch({ type: 'OPEN_MODAL', payload: { modalType: type, selectedItem: item } })

  // ── Touch button helper ──
  const MobileBtn = ({ label, icon, color, onClick, sub }: { label: string; icon: string; color: string; onClick: () => void; sub?: string }) => (
    <button onClick={onClick} style={{
      background: 'var(--bg-secondary)', border: `2px solid ${color}44`, borderRadius: '20px', padding: '20px 16px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer',
      transition: 'all .2s', WebkitTapHighlightColor: 'transparent', minHeight: '120px', justifyContent: 'center',
    }}
      onTouchStart={(ev) => { (ev.currentTarget as HTMLElement).style.transform = 'scale(0.96)'; (ev.currentTarget as HTMLElement).style.background = color + '18' }}
      onTouchEnd={(ev) => { (ev.currentTarget as HTMLElement).style.transform = ''; (ev.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)' }}
    >
      <div style={{ fontSize: '36px', lineHeight: 1 }}>{icon}</div>
      <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'center' }}>{label}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{sub}</div>}
    </button>
  )

  // ── Nav bar for sub-screens ──
  const NavBar = ({ title, onBack }: { title: string; onBack: () => void }) => (
    <div style={{ background: 'var(--bg-secondary)', padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 10 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '20px', cursor: 'pointer', padding: '4px' }}>←</button>
      <div style={{ fontWeight: 700, fontSize: '16px', flex: 1 }}>{title}</div>
    </div>
  )

  // ══════════════════════════════════════════════════════════════════════
  // Fullscreen Signature Overlay
  // ══════════════════════════════════════════════════════════════════════
  if (sigFullscreen) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 99999, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#1a1f2e', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>✍️ Firma del empleado</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { const c = sigCanvasRef.current; if (c) c.getContext('2d')!.clearRect(0, 0, c.width, c.height) }}
              style={{ padding: '8px 14px', background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '13px' }}>🗑️ Limpiar</button>
            <button onClick={() => closeSignature(false)}
              style={{ padding: '8px 14px', background: 'rgba(239,68,68,.3)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
            <button onClick={() => { closeSignature(true); showToast('✅ Firma guardada', 'success') }}
              style={{ padding: '8px 14px', background: '#3fb950', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>✅ Confirmar</button>
          </div>
        </div>
        <div style={{ background: '#f0f0f0', padding: '6px 16px', fontSize: '12px', color: '#666', flexShrink: 0, textAlign: 'center' }}>Firma en el espacio de abajo con el dedo</div>
        <canvas
          ref={sigCanvasRef}
          style={{ flex: 1, width: '100%', cursor: 'crosshair', touchAction: 'none', background: 'white' }}
          onMouseDown={(ev) => { sigDrawing.current = true; sigLast.current = sigPos(ev, ev.target as HTMLCanvasElement) }}
          onMouseMove={(ev) => drawMove(ev, 3)}
          onMouseUp={() => { sigDrawing.current = false; sigLast.current = null }}
          onTouchStart={(ev) => { ev.preventDefault(); sigDrawing.current = true; sigLast.current = sigPos(ev, ev.target as HTMLCanvasElement) }}
          onTouchMove={(ev) => { ev.preventDefault(); drawMove(ev, 4) }}
          onTouchEnd={(ev) => { ev.preventDefault(); sigDrawing.current = false; sigLast.current = null }}
        />
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════
  // HOME screen
  // ══════════════════════════════════════════════════════════════════════
  if (screen === 'home') {
    const movColors: Record<string, string> = { Entrada: '#3fb950', Salida: '#ef4444', Asignacion: '#58a6ff', Devolucion: '#a855f7', Prestamo: '#fbbf24' }
    const movIcons: Record<string, string> = { Entrada: '↑', Salida: '↓', Asignacion: '→', Devolucion: '←', Prestamo: '⏱' }
    const recentHistory = (state.history || []).slice().sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 5)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        {/* Header */}
        <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <img src="https://sanlucar.com/wp-content/uploads/2023/03/SanLucar_LOGO_final.svg" alt="Sanlúcar"
                style={{ height: '22px', width: 'auto', filter: 'brightness(0) invert(1)', objectFit: 'contain' }}
                onError={(ev) => { (ev.target as HTMLImageElement).style.display = 'none' }} />
              <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-secondary)' }}>IT</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{user?.name} · {hoy}</div>
          </div>
          <button onClick={() => refreshData()} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 14px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px' }}>🔄</button>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--border)' }}>
          {[
            { icon: '⚡', label: 'Hoy', value: movHoy, color: '#58a6ff' },
            { icon: '📋', label: 'Activas', value: misAsig, color: '#3fb950' },
            { icon: '🔖', label: 'Pendientes', value: pendientes, color: '#f97316' },
            { icon: '⚠️', label: 'Alertas', value: alertas, color: alertas > 0 ? '#ef4444' : '#6b7280' },
          ].map((k, i) => (
            <div key={i} style={{ background: 'var(--bg-secondary)', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '24px' }}>{k.icon}</div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'IBM Plex Mono,monospace', color: k.color, lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>{k.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div style={{ padding: '20px', flex: 1 }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Acciones rápidas</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <MobileBtn label="Escanear QR" icon="📷" color="#58a6ff" onClick={launchScanner} sub="Abrir cámara" />
            <MobileBtn label="Asignaciones" icon="📋" color="#3fb950" onClick={() => setScreen('asignaciones')} sub={misAsig + ' activas'} />
            <MobileBtn label="Inventario" icon="📦" color="#a855f7" onClick={() => setScreen('inventario')} sub={(state.inventory || []).length + ' productos'} />
            <MobileBtn label="Recepción" icon="📥" color="#fbbf24" onClick={() => setScreen('recepcion')} sub="Nuevo material" />
          </div>

          {/* Search by ID */}
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Buscar equipo por ID</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" value={mobileSearch} onChange={(ev) => setMobileSearch(ev.target.value.toUpperCase())}
                onKeyDown={(ev) => { if (ev.key === 'Enter') searchEquipo(mobileSearch) }}
                placeholder="SLF-26-XXXXXXXX"
                style={{ flex: 1, padding: '14px 16px', background: 'var(--bg-secondary)', border: '2px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'IBM Plex Mono,monospace', outline: 'none' }} />
              <button onClick={() => searchEquipo(mobileSearch)} style={{ padding: '14px 20px', background: '#58a6ff', border: 'none', borderRadius: '12px', color: 'white', fontSize: '18px', cursor: 'pointer' }}>→</button>
            </div>
          </div>

          {/* Recent movements */}
          <div style={{ marginTop: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Últimos movimientos</div>
            {recentHistory.map((h, i) => {
              const col = movColors[h.tipo] || '#6b7280'
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: col + '1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: col, fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>
                    {movIcons[h.tipo] || '•'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.producto}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{h.tecnico || '—'}</div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', flexShrink: 0 }}>{new Date(h.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════
  // EQUIPO detail (scanned/searched)
  // ══════════════════════════════════════════════════════════════════════
  if (screen === 'equipo' && scannedEquipo) {
    const a = scannedEquipo
    const estadoColors: Record<string, string> = { Almacen: '#3fb950', Asignado: '#58a6ff', Pendiente: '#f97316', Transito: '#fbbf24', Reparacion: '#a855f7', Extraviado: '#ef4444', Robado: '#dc2626', Baja: '#6b7280' }
    const estadoColor = estadoColors[a.estado] || '#6b7280'

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <NavBar title="Ficha de Equipo" onBack={() => { setScreen('home'); setScannedEquipo(null) }} />
        <div style={{ padding: '20px', flex: 1 }}>
          {/* Header */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '20px', padding: '24px', marginBottom: '16px', border: `2px solid ${estadoColor}33`, textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>💻</div>
            <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>{a.tipo}</div>
            {a.modelo && <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{a.modelo}</div>}
            <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: '14px', fontWeight: 700, color: '#58a6ff', background: 'rgba(88,166,255,.1)', padding: '8px 16px', borderRadius: '10px', display: 'inline-block', marginBottom: '12px' }}>{a.idEtiqueta}</div>
            <div><span style={{ padding: '6px 14px', borderRadius: '20px', background: estadoColor + '22', color: estadoColor, fontWeight: 700, fontSize: '13px', border: `1px solid ${estadoColor}44` }}>{a.estado}</span></div>
          </div>

          {/* Details */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
            {[
              ['N/S', a.numSerie || '—'],
              ['Ubicación', a.ubicacion || '—'],
              ['Sociedad', a.sociedad || '—'],
              ['Asignado a', a.asignadoA || '—'],
              ['Proveedor', a.proveedor || '—'],
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>{row[0]}</span>
                <span style={{ fontSize: '13px', fontWeight: 600, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>{row[1]}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={() => exportEtiquetaPDF([a], showToast as any)} style={{ padding: '16px', background: 'var(--bg-secondary)', border: '2px solid var(--border)', borderRadius: '14px', color: 'var(--text-primary)', fontSize: '15px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>{T().printLabel}</button>
            {a.estado === 'Almacen' && (
              <button onClick={() => openModal('nueva-asignacion', null)} style={{ padding: '16px', background: '#3fb950', border: 'none', borderRadius: '14px', color: 'white', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>✅ Asignar equipo</button>
            )}
            {a.estado === 'Asignado' && (
              <button onClick={() => openModal('devolver-material', null)} style={{ padding: '16px', background: '#f97316', border: 'none', borderRadius: '14px', color: 'white', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>↩️ Registrar devolución</button>
            )}
            <button onClick={openSignature} style={{
              padding: '16px', background: sigData ? 'rgba(63,185,80,.15)' : 'rgba(88,166,255,.1)',
              border: `2px solid ${sigData ? '#3fb95044' : '#58a6ff44'}`, borderRadius: '14px',
              color: sigData ? '#3fb950' : '#58a6ff', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              {sigData ? '✅ Firma capturada — repetir' : '✍️ Firmar aquí'}
            </button>
            {sigData && <img src={sigData} style={{ width: '100%', height: '80px', objectFit: 'contain', background: 'white', borderRadius: '10px', border: '1px solid var(--border)' }} alt="Firma" />}
          </div>

          <button onClick={launchScanner} style={{ marginTop: '12px', padding: '16px', background: 'rgba(88,166,255,.1)', border: '2px solid #58a6ff44', borderRadius: '14px', color: '#58a6ff', fontSize: '15px', fontWeight: 700, cursor: 'pointer', width: '100%' }}>📷 Escanear otro equipo</button>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════
  // ASIGNACIONES list
  // ══════════════════════════════════════════════════════════════════════
  if (screen === 'asignaciones') {
    const activas = (state.assignments || []).filter((a) => a.estado === 'Activo').sort((a, b) => new Date(b.fechaAsignacion).getTime() - new Date(a.fechaAsignacion).getTime())
    const avatarColors = ['#58a6ff', '#3fb950', '#a855f7', '#fbbf24', '#f97316', '#ef4444']
    const aColor = (n: string) => { let h = 0; for (let i = 0; i < n.length; i++) h = n.charCodeAt(i) + ((h << 5) - h); return avatarColors[Math.abs(h) % avatarColors.length] }
    const inits = (n: string) => n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ background: 'var(--bg-secondary)', padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => setScreen('home')} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '20px', cursor: 'pointer' }}>←</button>
          <div style={{ fontWeight: 700, fontSize: '16px', flex: 1 }}>📋 Asignaciones activas</div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#3fb950' }}>{activas.length}</span>
        </div>
        <div style={{ padding: '12px', flex: 1, overflowY: 'auto' }}>
          {activas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>Sin asignaciones activas</div>
          ) : activas.map((a, i) => {
            const col = aColor(a.nombreEmpleado)
            const hoyDate = new Date(); hoyDate.setHours(0, 0, 0, 0)
            const vencido = a.esPrestamo && new Date(a.fechaAsignacion) < hoyDate
            return (
              <div key={i} style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '16px', marginBottom: '10px', border: `2px solid ${vencido ? '#ef444444' : col + '33'}`, borderLeft: `4px solid ${vencido ? '#ef4444' : col}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: col + '22', border: `2px solid ${col}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: col, flexShrink: 0 }}>{inits(a.nombreEmpleado)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nombreEmpleado}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{a.departamento || a.emailEmpleado}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {vencido && <div style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,.15)', padding: '2px 8px', borderRadius: '10px', marginBottom: '2px' }}>⚠️ VENCIDO</div>}
                    <div style={{ fontSize: '13px', fontWeight: 800, color: col, fontFamily: 'IBM Plex Mono,monospace' }}>{a.cantidadProductos} art.</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', background: a.esPrestamo ? 'rgba(251,191,36,.15)' : 'rgba(88,166,255,.12)', color: a.esPrestamo ? '#fbbf24' : '#58a6ff', borderRadius: '10px', padding: '3px 8px', fontWeight: 700 }}>{a.esPrestamo ? '⏱ Préstamo' : '📋 Asignación'}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg-primary)', borderRadius: '10px', padding: '3px 8px' }}>{new Date(a.fechaAsignacion).toLocaleDateString('es-ES')}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════
  // INVENTARIO (critical stock)
  // ══════════════════════════════════════════════════════════════════════
  if (screen === 'inventario') {
    const stockItems = (state.inventory || []).filter((i) => i.stock === 0 || i.stock <= i.stockMinimo).sort((a, b) => a.stock - b.stock)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ background: 'var(--bg-secondary)', padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => setScreen('home')} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '20px', cursor: 'pointer' }}>←</button>
          <div style={{ fontWeight: 700, fontSize: '16px', flex: 1 }}>📦 Stock crítico</div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>{stockItems.length}</span>
        </div>
        <div style={{ padding: '12px', flex: 1 }}>
          {stockItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
              <div style={{ color: '#3fb950', fontWeight: 700, fontSize: '16px' }}>Todo el stock OK</div>
            </div>
          ) : stockItems.map((item, i) => {
            const sinStock = item.stock === 0
            const col = sinStock ? '#ef4444' : '#f97316'
            return (
              <div key={i} style={{ background: 'var(--bg-secondary)', borderRadius: '14px', padding: '16px', marginBottom: '10px', border: `2px solid ${col}33`, borderLeft: `4px solid ${col}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nombre}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.categoria} · {item.ubicacion || 'Sin ubicación'}</div>
                  </div>
                  <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontWeight: 800, fontSize: '18px', color: col, marginLeft: '12px' }}>{item.stock}</div>
                </div>
                <div style={{ height: '6px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
                  <div style={{ height: '100%', width: Math.min(100, item.stockMinimo > 0 ? (item.stock / item.stockMinimo) * 100 : 0) + '%', background: col, borderRadius: '3px' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => openModal('entrada', item)} style={{ flex: 1, padding: '10px', background: '#3fb950', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>📥 Entrada</button>
                  <button onClick={() => openModal('salida', item)} disabled={item.stock === 0} style={{ flex: 1, padding: '10px', background: item.stock === 0 ? 'var(--bg-tertiary)' : '#58a6ff', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 700, fontSize: '13px', cursor: item.stock === 0 ? 'not-allowed' : 'pointer', opacity: item.stock === 0 ? 0.5 : 1 }}>📤 Salida</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════
  // RECEPCION screen
  // ══════════════════════════════════════════════════════════════════════
  if (screen === 'recepcion') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
          <button onClick={() => setScreen('home')} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>←</button>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>📦 Recepción de lote</h2>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>Para equipos etiquetados usa el escritorio. Aquí puedes hacer entradas de inventario fungible.</p>
          <button className="button button-primary" style={{ width: '100%', padding: '16px', fontSize: '16px' }} onClick={() => { setScreen('home'); openModal('entrada', null) }}>📥 Nueva entrada de inventario</button>
        </div>
      </div>
    )
  }

  // Fallback
  return <div />
}
