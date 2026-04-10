import { useState, useEffect } from 'react'
import { T } from '../../i18n'
import { useAppContext } from '../../context/AppContext'
import { useTabNavigation } from '../../hooks/useTabNavigation'
import { getFechaVencimientoPrestamo } from '../../utils/assignments'
import type { ReactNode } from 'react'

function Card({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', ...style }}>{children}</div>
}

function CardTitle({ text, action }: { text: string; action?: { label: string; fn: () => void } }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{text}</div>
      {action && <button onClick={action.fn} style={{ background: 'none', border: 'none', color: '#58a6ff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>{action.label}</button>}
    </div>
  )
}

function KPI({ label, value, color, icon, onClick, sub }: { label: string; value: number; color: string; icon: string; onClick?: () => void; sub?: string }) {
  return (
    <div
      onClick={onClick}
      style={{ background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)', border: `1px solid ${color}33`, borderRadius: '16px', padding: '22px 18px', cursor: onClick ? 'pointer' : 'default', transition: 'all .2s ease', position: 'relative', overflow: 'hidden', flex: 1, minWidth: '130px' }}
      onMouseEnter={onClick ? (e) => { const el = e.currentTarget; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = `0 16px 40px ${color}22`; el.style.borderColor = `${color}88` } : undefined}
      onMouseLeave={onClick ? (e) => { const el = e.currentTarget; el.style.transform = ''; el.style.boxShadow = ''; el.style.borderColor = `${color}33` } : undefined}
    >
      <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '70px', height: '70px', borderRadius: '50%', background: `${color}18`, filter: 'blur(16px)' }} />
      <div style={{ fontSize: '26px', marginBottom: '6px' }}>{icon}</div>
      <div style={{ fontSize: '34px', fontWeight: '800', fontFamily: 'IBM Plex Mono,monospace', color, lineHeight: 1, marginBottom: '5px' }}>{value}</div>
      <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: `${color}99`, marginTop: '4px', fontWeight: '600' }}>{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const { state } = useAppContext()
  const { goToTab } = useTabNavigation()
  const t = T()
  const [counters, setCounters] = useState({ equipos: 0, asignados: 0, almacen: 0, movHoy: 0, unidades: 0 })
  const [animDone, setAnimDone] = useState(false)
  const [hoveredSeg, setHoveredSeg] = useState<number | null>(null)
  const [hoveredLine, setHoveredLine] = useState<number | null>(null)
  const [hoveredDay, setHoveredDay] = useState<{ wi: number; di: number } | null>(null)

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)

  const onNavigate = (tab: string, filter?: any) => {
    goToTab(tab, filter)
  }

  // Stats
  const equiposAll = state.activos || []
  const eq = {
    total: equiposAll.length,
    almacen: equiposAll.filter((a) => a.estado === 'Almacen').length,
    asignado: equiposAll.filter((a) => a.estado === 'Asignado').length,
    pendiente: equiposAll.filter((a) => a.estado === 'Pendiente').length,
    transito: equiposAll.filter((a) => a.estado === 'Transito').length,
    reparacion: equiposAll.filter((a) => a.estado === 'Reparacion').length,
    extraviado: equiposAll.filter((a) => a.estado === 'Extraviado').length,
    robado: equiposAll.filter((a) => a.estado === 'Robado').length,
    baja: equiposAll.filter((a) => a.estado === 'Baja').length,
  }
  const inv = {
    total: state.inventory.length,
    unidades: state.inventory.reduce((s, i) => s + (i.stock || 0), 0),
    stockBajo: state.inventory.filter((i) => i.stock > 0 && i.stock <= i.stockMinimo).length,
    sinStock: state.inventory.filter((i) => i.stock === 0).length,
  }
  const movHoy = state.history.filter((h) => new Date(h.fecha).toDateString() === new Date().toDateString()).length
  const prestamosVencidos = state.assignments.filter((a) => {
    if (!a.esPrestamo || a.estado !== 'Activo') return false
    const fv = getFechaVencimientoPrestamo(a)
    return fv !== null && fv < hoy
  })

  // Alerts
  const alertas: Array<{ tipo: string; icon: string; msg: string; nav: () => void }> = []
  if (inv.sinStock > 0) alertas.push({ tipo: 'error', icon: '📦', msg: `${inv.sinStock} producto(s) sin stock`, nav: () => onNavigate('inventario', { tipo: 'sinStock' }) })
  if (inv.stockBajo > 0) alertas.push({ tipo: 'warning', icon: '⚠️', msg: `${inv.stockBajo} producto(s) con stock bajo`, nav: () => onNavigate('inventario', { tipo: 'stockBajo' }) })
  if (eq.pendiente > 0) alertas.push({ tipo: 'warning', icon: '🔖', msg: `${eq.pendiente} equipo(s) sin número de serie`, nav: () => onNavigate('equipos', { estado: 'Pendiente' }) })
  if (prestamosVencidos.length > 0) alertas.push({ tipo: 'error', icon: '⏰', msg: `${prestamosVencidos.length} préstamo(s) vencido(s)`, nav: () => onNavigate('asignaciones', { tipo: 'prestamo', estado: 'vencido' }) })
  if (eq.extraviado > 0) alertas.push({ tipo: 'error', icon: '🔍', msg: `${eq.extraviado} equipo(s) extraviado(s)`, nav: () => onNavigate('equipos', { estado: 'Extraviado' }) })
  if (eq.transito > 0) alertas.push({ tipo: 'warning', icon: '🚚', msg: `${eq.transito} equipo(s) en tránsito`, nav: () => onNavigate('equipos', { estado: 'Transito' }) })
  const sinEtiqueta = (state.activos || []).filter((a) => a.numSerie && !a.etiquetaImpresa && a.estado !== 'Baja').length
  if (sinEtiqueta > 0) alertas.push({ tipo: 'warning', icon: '🏷️', msg: `${sinEtiqueta} ${t.unlabeledAlert}`, nav: () => onNavigate('equipos', { estado: 'sinEtiqueta' }) })

  // Health score
  let health = 100
  health -= inv.sinStock * 10
  health -= inv.stockBajo * 3
  health -= eq.extraviado * 15
  health -= eq.robado * 15
  health -= prestamosVencidos.length * 5
  health = Math.max(0, Math.min(100, health))
  const healthColor = health >= 80 ? '#3fb950' : health >= 55 ? '#fbbf24' : '#ef4444'
  const healthLabel = health >= 80 ? t.optimal : health >= 55 ? t.attention : 'Crítico'

  // Animated counters
  useEffect(() => {
    if (animDone) return
    const targets = { equipos: eq.total, asignados: eq.asignado, almacen: eq.almacen, movHoy, unidades: inv.unidades }
    const steps = 45
    const duration = 1200
    let step = 0
    const timer = setInterval(() => {
      step++
      const ease = 1 - Math.pow(1 - step / steps, 3)
      setCounters({
        equipos: Math.round(targets.equipos * ease),
        asignados: Math.round(targets.asignados * ease),
        almacen: Math.round(targets.almacen * ease),
        movHoy: Math.round(targets.movHoy * ease),
        unidades: Math.round(targets.unidades * ease),
      })
      if (step >= steps) { clearInterval(timer); setAnimDone(true) }
    }, duration / steps)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Donut chart
  const donutSegs = [
    { label: 'Almacén', value: eq.almacen, color: '#3fb950' },
    { label: 'Asignado', value: eq.asignado, color: '#58a6ff' },
    { label: 'Pendiente', value: eq.pendiente, color: '#f97316' },
    { label: 'Tránsito', value: eq.transito, color: '#fbbf24' },
    { label: 'Reparación', value: eq.reparacion, color: '#a855f7' },
    { label: 'Extraviado', value: eq.extraviado, color: '#ef4444' },
    { label: 'Robado', value: eq.robado, color: '#dc2626' },
    { label: 'Baja', value: eq.baja, color: '#6b7280' },
  ].filter((s) => s.value > 0)
  const donutTotal = donutSegs.reduce((s, seg) => s + seg.value, 0) || 1
  const DR = 60, CX = 80, CY = 80, circ = 2 * Math.PI * DR
  let donutAcc = 0
  const donutPaths = donutSegs.map((seg) => {
    const arcLen = (seg.value / donutTotal) * circ
    const dashArray = `${arcLen} ${circ - arcLen}`
    const dashOffset = circ * 0.25 - donutAcc
    donutAcc += arcLen
    return { ...seg, dashArray, dashOffset }
  })

  // 30-day line chart
  const last30: Array<{ entradas: number; salidas: number; total: number; label: string }> = []
  for (let di = 29; di >= 0; di--) {
    const d = new Date(); d.setDate(d.getDate() - di); d.setHours(0, 0, 0, 0)
    const next = new Date(d); next.setDate(next.getDate() + 1)
    const entradas = state.history.filter((h) => { const hd = new Date(h.fecha); return hd >= d && hd < next && h.tipo === 'Entrada' }).length
    const salidas = state.history.filter((h) => { const hd = new Date(h.fecha); return hd >= d && hd < next && h.tipo === 'Salida' }).length
    const total = state.history.filter((h) => { const hd = new Date(h.fecha); return hd >= d && hd < next }).length
    last30.push({ entradas, salidas, total, label: `${d.getDate()}/${d.getMonth() + 1}` })
  }
  const maxLine = Math.max(...last30.map((d) => d.total), 1)
  const lineW = 560, lineH = 90, padL = 6, padR = 6, padT = 8, padB = 4
  const lx = (i: number) => padL + (i / 29) * (lineW - padL - padR)
  const ly = (v: number) => padT + (1 - v / maxLine) * (lineH - padT - padB)
  const totalPath = last30.map((d, i) => `${i === 0 ? 'M' : 'L'}${lx(i).toFixed(1)},${ly(d.total).toFixed(1)}`).join(' ')
  const entPath = last30.map((d, i) => `${i === 0 ? 'M' : 'L'}${lx(i).toFixed(1)},${ly(d.entradas).toFixed(1)}`).join(' ')
  const salPath = last30.map((d, i) => `${i === 0 ? 'M' : 'L'}${lx(i).toFixed(1)},${ly(d.salidas).toFixed(1)}`).join(' ')
  const areaTotal = `${totalPath} L${lx(29).toFixed(1)},${lineH} L${padL},${lineH} Z`

  // Heatmap
  const heatDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
  const heatData: Array<Array<{ cnt: number; isFuture: boolean; label: string }>> = []
  for (let w = 11; w >= 0; w--) {
    const week: Array<{ cnt: number; isFuture: boolean; label: string }> = []
    for (let dw = 0; dw < 7; dw++) {
      const date = new Date()
      const dayOfWeek = date.getDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      date.setDate(date.getDate() + mondayOffset - w * 7 + dw)
      date.setHours(0, 0, 0, 0)
      const nextD = new Date(date); nextD.setDate(nextD.getDate() + 1)
      const cnt = state.history.filter((h) => { const hd = new Date(h.fecha); return hd >= date && hd < nextD }).length
      week.push({ cnt, isFuture: date > hoy, label: `${date.getDate()}/${date.getMonth() + 1}` })
    }
    heatData.push(week)
  }
  const heatMax = Math.max(...heatData.flat().map((d) => d.cnt), 1)
  const heatColorFn = (cnt: number, isFuture: boolean) => {
    if (isFuture) return 'var(--bg-primary)'
    if (cnt === 0) return '#1a2130'
    const intensity = cnt / heatMax
    if (intensity < 0.25) return '#0d4429'
    if (intensity < 0.5) return '#1a6b3c'
    if (intensity < 0.75) return '#26a047'
    return '#3fb950'
  }

  // Warranties
  const garantiasProximas = equiposAll
    .filter((a) => {
      if (!a.fechaGarantia) return false
      const diff = (new Date(a.fechaGarantia).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
      return diff >= 0 && diff <= 90
    })
    .sort((a, b) => new Date(a.fechaGarantia!).getTime() - new Date(b.fechaGarantia!).getTime())
    .slice(0, 5)

  // Top technicians
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const techAct = state.technicians
    .filter((tc) => tc.activo)
    .map((tc) => ({ nombre: tc.nombre.split(' ')[0], count: state.history.filter((h) => h.tecnico === tc.nombre && new Date(h.fecha) >= monthStart).length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  const maxTech = Math.max(...techAct.map((tc) => tc.count), 1)
  const medals = ['🥇', '🥈', '🥉']
  const barColors = ['linear-gradient(90deg,#fbbf24,#f97316)', 'linear-gradient(90deg,#9ca3af,#6b7280)', 'linear-gradient(90deg,#cd7c2f,#92400e)', 'linear-gradient(90deg,#58a6ff,#3b82f6)', 'linear-gradient(90deg,#3fb950,#16a34a)']
  const labelColors = ['#fbbf24', '#9ca3af', '#cd7c2f', '#58a6ff', '#3fb950']

  // Recent history
  const recentH = [...state.history].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 6)

  // Incidents
  const incidencias = [
    { estado: 'Reparacion', label: 'En Reparación', color: '#a855f7', icon: '🔧' },
    { estado: 'Extraviado', label: 'Extraviados', color: '#f97316', icon: '🔍' },
    { estado: 'Robado', label: 'Robados', color: '#ef4444', icon: '🚨' },
  ]
  const equiposInc = incidencias.map((inc) => ({ ...inc, items: equiposAll.filter((a) => a.estado === inc.estado) })).filter((inc) => inc.items.length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '4px', background: 'linear-gradient(135deg, var(--text-primary), var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t.missionControl}</h2>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Última sincronización: {state.lastSync ? state.lastSync.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-secondary)', border: `2px solid ${healthColor}44`, borderRadius: '16px', padding: '14px 20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '3px' }}>{t.generalStatus}</div>
            <div style={{ fontSize: '30px', fontWeight: '800', fontFamily: 'IBM Plex Mono,monospace', color: healthColor, lineHeight: 1 }}>{health}%</div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: healthColor, marginTop: '2px' }}>{healthLabel}</div>
          </div>
          <div style={{ width: '8px', height: '56px', background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${health}%`, background: healthColor, borderRadius: '4px', transition: 'height 1.2s ease' }} />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        <KPI label="Equipos" value={counters.equipos} color="#58a6ff" icon="💻" onClick={() => onNavigate('equipos')} sub={`${eq.total} etiquetados`} />
        <KPI label="Asignados" value={counters.asignados} color="#3fb950" icon="✅" onClick={() => onNavigate('equipos', { estado: 'Asignado' })} sub={`${Math.round((eq.asignado / (eq.total || 1)) * 100)}% del total`} />
        <KPI label="En Almacén" value={counters.almacen} color="#a855f7" icon="🏪" onClick={() => onNavigate('equipos', { estado: 'Almacen' })} sub="disponibles" />
        <KPI label="Unidades" value={counters.unidades} color="#fbbf24" icon="📦" onClick={() => onNavigate('inventario')} sub={`${inv.total} referencias`} />
        <KPI label="Hoy" value={counters.movHoy} color={alertas.length > 0 ? '#f97316' : '#3fb950'} icon={alertas.length > 0 ? '🚨' : '⚡'} sub={alertas.length > 0 ? `${alertas.length} alerta(s)` : 'sin alertas'} />
      </div>

      {/* Line chart + Donut */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '18px' }}>
        <Card>
          <CardTitle text="📈 Actividad — Últimos 30 días" action={{ fn: () => onNavigate('historial'), label: 'Ver historial →' }} />
          <div style={{ position: 'relative' }}>
            <svg width="100%" viewBox={`0 0 ${lineW} ${lineH}`} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
              <defs><linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#58a6ff" stopOpacity={0.3} /><stop offset="100%" stopColor="#58a6ff" stopOpacity={0.02} /></linearGradient></defs>
              <path d={areaTotal} fill="url(#gradTotal)" />
              <path d={totalPath} fill="none" stroke="#58a6ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d={entPath} fill="none" stroke="#3fb950" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3" opacity="0.8" />
              <path d={salPath} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3" opacity="0.8" />
              {last30.map((pt, i) => <circle key={i} cx={lx(i)} cy={ly(pt.total)} r={hoveredLine === i ? 4 : 0} fill="#58a6ff" style={{ transition: 'r .1s ease', cursor: 'pointer' }} onMouseEnter={() => setHoveredLine(i)} onMouseLeave={() => setHoveredLine(null)} />)}
              <line x1={lx(29)} y1={padT} x2={lx(29)} y2={lineH} stroke="#58a6ff" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
            </svg>
            {hoveredLine !== null && last30[hoveredLine] && (
              <div style={{ position: 'absolute', top: 0, left: `${Math.min(lx(hoveredLine) + 8, lineW - 130)}px`, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', pointerEvents: 'none', zIndex: 10, whiteSpace: 'nowrap' }}>
                <div style={{ fontWeight: '700', marginBottom: '4px', color: 'var(--text-secondary)' }}>{last30[hoveredLine].label}</div>
                <div style={{ color: '#58a6ff' }}>📊 Total: {last30[hoveredLine].total}</div>
                <div style={{ color: '#3fb950' }}>↑ Entradas: {last30[hoveredLine].entradas}</div>
                <div style={{ color: '#ef4444' }}>↓ Salidas: {last30[hoveredLine].salidas}</div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            {[['#58a6ff', 'Total'], ['#3fb950', 'Entradas'], ['#ef4444', 'Salidas']].map(([c, l], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '16px', height: '2px', background: c, borderRadius: '1px' }} />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>{l}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle text="💻 Equipos por Estado" />
          {eq.total > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ position: 'relative' }}>
                <svg width="160" height="160" viewBox="0 0 160 160">
                  <circle cx={CX} cy={CY} r={DR} fill="none" stroke="var(--bg-primary)" strokeWidth="16" />
                  {donutPaths.map((seg, i) => <circle key={i} cx={CX} cy={CY} r={DR} fill="none" stroke={seg.color} strokeWidth={hoveredSeg === i ? 22 : 16} strokeDasharray={seg.dashArray} strokeDashoffset={seg.dashOffset} style={{ transition: 'stroke-width .2s ease', cursor: 'pointer' }} onMouseEnter={() => setHoveredSeg(i)} onMouseLeave={() => setHoveredSeg(null)} />)}
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                  {hoveredSeg !== null && donutPaths[hoveredSeg] ? (<><div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'IBM Plex Mono,monospace', color: donutPaths[hoveredSeg].color, lineHeight: 1 }}>{donutPaths[hoveredSeg].value}</div><div style={{ fontSize: '9px', color: 'var(--text-secondary)', fontWeight: '700', marginTop: '2px' }}>{donutPaths[hoveredSeg].label.toUpperCase()}</div></>) : (<><div style={{ fontSize: '26px', fontWeight: '800', fontFamily: 'IBM Plex Mono,monospace', color: 'var(--text-primary)', lineHeight: 1 }}>{eq.total}</div><div style={{ fontSize: '9px', color: 'var(--text-secondary)', fontWeight: '700', marginTop: '2px' }}>TOTAL</div></>)}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%' }}>
                {donutPaths.map((seg, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '3px 6px', borderRadius: '6px', background: hoveredSeg === i ? `${seg.color}18` : 'transparent', transition: 'background .15s' }} onMouseEnter={() => setHoveredSeg(i)} onMouseLeave={() => setHoveredSeg(null)}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1 }}>{seg.label}</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', fontFamily: 'IBM Plex Mono,monospace', color: seg.color }}>{seg.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Sin equipos registrados</div>}
        </Card>
      </div>

      {/* Heatmap + Alerts + Warranties */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '18px' }}>
        <Card>
          <CardTitle text="🔥 Mapa de Actividad — Últimas 12 Semanas" />
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '6px', paddingLeft: '24px' }}>
              {heatDays.map((d, i) => <div key={i} style={{ width: '18px', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '700', textAlign: 'center' }}>{d}</div>)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {heatData.map((week, wi) => (
                <div key={wi} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '20px', fontSize: '9px', color: 'var(--text-secondary)', textAlign: 'right', flexShrink: 0 }}>{wi === 0 || wi % 3 === 0 ? week[0].label : ''}</div>
                  {week.map((day, di) => (
                    <div key={di} style={{ width: '18px', height: '18px', borderRadius: '3px', background: heatColorFn(day.cnt, day.isFuture), cursor: day.cnt > 0 ? 'pointer' : 'default', transition: 'transform .1s ease, box-shadow .1s ease', transform: hoveredDay?.wi === wi && hoveredDay?.di === di ? 'scale(1.3)' : 'scale(1)', boxShadow: hoveredDay?.wi === wi && hoveredDay?.di === di ? '0 0 0 2px #3fb950' : 'none', position: 'relative', zIndex: hoveredDay?.wi === wi && hoveredDay?.di === di ? 10 : 1 }}
                      onMouseEnter={() => setHoveredDay({ wi, di })} onMouseLeave={() => setHoveredDay(null)} title={`${day.cnt} movimientos el ${day.label}`} />
                  ))}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Menos</span>
              {['#1a2130', '#0d4429', '#1a6b3c', '#26a047', '#3fb950'].map((c, i) => <div key={i} style={{ width: '14px', height: '14px', borderRadius: '2px', background: c }} />)}
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Más</span>
            </div>
          </div>
        </Card>

        <Card style={{ border: `1px solid ${alertas.length > 0 ? '#ef444433' : '#3fb95033'}` }}>
          <CardTitle text="🚨 Alertas Activas" />
          {alertas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0' }}><div style={{ fontSize: '44px', marginBottom: '10px' }}>✅</div><div style={{ color: '#3fb950', fontWeight: '700', fontSize: '15px' }}>Todo en orden</div><div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>No hay alertas activas</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {alertas.map((a, i) => { const col = a.tipo === 'error' ? '#ef4444' : '#f97316'; return (
                <div key={i} onClick={a.nav} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 13px', background: `${col}0d`, border: `1px solid ${col}33`, borderRadius: '10px', cursor: 'pointer', transition: 'all .15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.borderColor = `${col}66` }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = `${col}33` }}>
                  <span style={{ fontSize: '18px' }}>{a.icon}</span><span style={{ fontSize: '13px', fontWeight: '600', color: col, flex: 1 }}>{a.msg}</span><span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '700' }}>→</span>
                </div>) })}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle text="🛡️ Garantías Próximas" action={{ fn: () => onNavigate('equipos'), label: 'Ver equipos →' }} />
          {garantiasProximas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0' }}><div style={{ fontSize: '44px', marginBottom: '10px' }}>✅</div><div style={{ color: '#3fb950', fontWeight: '700', fontSize: '14px' }}>Sin vencimientos próximos</div><div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>Próximos 90 días OK</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {garantiasProximas.map((a, i) => { const dias = Math.round((new Date(a.fechaGarantia!).getTime() - hoy.getTime()) / 86400000); const col = dias <= 15 ? '#ef4444' : dias <= 30 ? '#f97316' : '#fbbf24'; return (
                <div key={i} onClick={() => onNavigate('equipos')} style={{ padding: '10px 12px', background: `${col}0d`, border: `1px solid ${col}33`, borderRadius: '8px', cursor: 'pointer', transition: 'all .15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${col}66` }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = `${col}33` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}><span style={{ fontSize: '12px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{a.tipo}{a.modelo ? ` · ${a.modelo}` : ''}</span><span style={{ fontSize: '12px', fontWeight: '800', fontFamily: 'IBM Plex Mono,monospace', color: col, flexShrink: 0 }}>{dias === 0 ? '¡HOY!' : `${dias}d`}</span></div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono,monospace' }}>{a.idEtiqueta}</div>
                </div>) })}
            </div>
          )}
        </Card>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
        <Card>
          <CardTitle text={t.topTechnicians} />
          {techAct.length === 0 ? <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '13px' }}>{t.noActivityMonth}</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {techAct.map((tech, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--bg-primary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>{i < 3 ? medals[i] : i + 1}</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '5px' }}>{tech.nombre}</div><div style={{ height: '5px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden' }}><div style={{ height: '100%', width: `${(tech.count / maxTech) * 100}%`, background: barColors[i], borderRadius: '3px', transition: 'width 1s ease' }} /></div></div>
                  <div style={{ fontSize: '14px', fontWeight: '800', fontFamily: 'IBM Plex Mono,monospace', color: labelColors[i], minWidth: '28px', textAlign: 'right' }}>{tech.count}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}><div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{t.recentActivity}</div><button onClick={() => onNavigate('historial')} style={{ background: 'none', border: 'none', color: '#58a6ff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Ver todo →</button></div>
          {recentH.length === 0 ? <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '13px' }}>Sin movimientos</div> : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recentH.map((mov, i) => {
                const tCol = ({ Entrada: '#3fb950', Salida: '#ef4444', Asignacion: '#58a6ff', Devolucion: '#a855f7', Prestamo: '#fbbf24' } as Record<string, string>)[mov.tipo] || 'var(--text-secondary)'
                const tIcon = ({ Entrada: '↑', Salida: '↓', Asignacion: '→', Devolucion: '←', Prestamo: '⏱' } as Record<string, string>)[mov.tipo] || '•'
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: i < recentH.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '7px', background: `${tCol}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: tCol, fontWeight: '700', flexShrink: 0 }}>{tIcon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mov.producto}</div><div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '1px' }}>{mov.tecnico || '—'}</div></div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}><div style={{ fontSize: '10px', fontWeight: '700', color: tCol }}>{mov.tipo}</div><div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '1px' }}>{new Date(mov.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}</div></div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}><div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{t.criticalStockTitle}</div><button onClick={() => onNavigate('inventario', { tipo: 'stockBajo' })} style={{ background: 'none', border: 'none', color: '#58a6ff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Ver todo →</button></div>
          {inv.stockBajo === 0 && inv.sinStock === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0' }}><div style={{ fontSize: '40px', marginBottom: '8px' }}>✅</div><div style={{ color: '#3fb950', fontWeight: '700', fontSize: '14px' }}>{t.stockOptimal}</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {state.inventory.filter((item) => item.stock === 0 || item.stock <= item.stockMinimo).sort((a, b) => a.stock / (a.stockMinimo || 1) - b.stock / (b.stockMinimo || 1)).slice(0, 5).map((item, i) => {
                const sinStock = item.stock === 0; const pct = Math.min(100, Math.round((item.stock / (item.stockMinimo || 1)) * 100)); const col = sinStock ? '#ef4444' : '#f97316'
                return (
                  <div key={i} style={{ padding: '10px 12px', background: `${col}0d`, border: `1px solid ${col}33`, borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}><span style={{ fontSize: '12px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '68%' }}>{item.nombre}</span><span style={{ fontSize: '12px', fontWeight: '800', fontFamily: 'IBM Plex Mono,monospace', color: col, flexShrink: 0 }}>{sinStock ? '🔴 AGOTADO' : `${item.stock}/${item.stockMinimo}`}</span></div>
                    <div style={{ height: '4px', background: 'var(--bg-primary)', borderRadius: '2px', overflow: 'hidden' }}><div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: '2px', transition: 'width 1s ease' }} /></div>
                  </div>)
              })}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle text={t.incidents} action={{ fn: () => onNavigate('equipos'), label: t.viewAll }} />
          {equiposInc.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0' }}><div style={{ fontSize: '40px', marginBottom: '8px' }}>✅</div><div style={{ color: '#3fb950', fontWeight: '700', fontSize: '14px' }}>{t.allOk}</div><div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>Sin equipos con incidencia</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                {incidencias.map((inc) => { const cnt = equiposAll.filter((a) => a.estado === inc.estado).length; return (
                  <div key={inc.estado} style={{ flex: 1, textAlign: 'center', background: cnt > 0 ? `${inc.color}15` : 'var(--bg-tertiary)', border: `1px solid ${cnt > 0 ? `${inc.color}44` : 'var(--border)'}`, borderRadius: '8px', padding: '8px 4px' }}>
                    <div style={{ fontSize: '18px' }}>{inc.icon}</div><div style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'IBM Plex Mono,monospace', color: cnt > 0 ? inc.color : 'var(--text-secondary)', lineHeight: 1 }}>{cnt}</div><div style={{ fontSize: '9px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', marginTop: '2px' }}>{inc.label}</div>
                  </div>) })}
              </div>
              {equiposInc.flatMap((inc) => inc.items.slice(0, 3).map((a, i) => (
                <div key={`${inc.estado}${i}`} onClick={() => onNavigate('equipos', { estado: inc.estado })} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: `${inc.color}0d`, border: `1px solid ${inc.color}22`, borderRadius: '8px', cursor: 'pointer', transition: 'all .15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${inc.color}66` }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = `${inc.color}22` }}>
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>{inc.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.tipo}{a.modelo ? ` · ${a.modelo}` : ''}</div><div style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono,monospace', color: 'var(--text-secondary)' }}>{a.idEtiqueta}</div></div>
                  {a.motivoIncidencia && <div style={{ fontSize: '10px', color: inc.color, maxWidth: '80px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.motivoIncidencia}</div>}
                </div>
              )))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
