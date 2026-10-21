import { useMemo, useState } from 'react'
import { useAppContext } from '../../context/AppContext'
import { useTabNavigation } from '../../hooks/useTabNavigation'
import { runAudit, ANOMALY_LABELS, ANOMALY_ICONS, type AnomalyType, type AuditAnomaly } from '../../utils/audit'
import { getCategoryBreakdown, CATEGORY_LABELS } from '../../utils/categoryClassifier'

const SEV_COLOR: Record<string, string> = {
  critical: '#ef4444',
  warning: '#f97316',
  info: '#58a6ff',
}

export default function AuditoriaSection() {
  const { state, dispatch } = useAppContext()
  const { goToEquipo, goToTab } = useTabNavigation()

  const [filter, setFilter] = useState<AnomalyType | 'all'>('all')
  const [expandedEvidence, setExpandedEvidence] = useState<Record<number, boolean>>({})

  const report = useMemo(
    () => runAudit({ activos: state.activos || [], assignments: state.assignments || [] }),
    [state.activos, state.assignments]
  )

  const breakdown = useMemo(() => getCategoryBreakdown(Object.keys(state.catalogoTipos || {})), [state.catalogoTipos])

  const filtered = filter === 'all' ? report.anomalies : report.anomalies.filter((a) => a.type === filter)
  const needsReviewCount = report.anomalies.filter((a) => a.needsReview).length

  // ── Jump to the original record ──
  const openActivo = (anom: AuditAnomaly) => {
    const idEt = anom.activo?.idEtiqueta || anom.activos?.[0]?.idEtiqueta
    if (!idEt) return
    const activo = (state.activos || []).find((a) => a.idEtiqueta === idEt)
    if (activo) goToEquipo(activo)
  }
  const openEmployee = (anom: AuditAnomaly) => {
    const email = anom.empleado?.email
    if (!email) return
    // Reutilizamos el tabFilter de historial.usuario que ya se usaba desde Asignaciones
    goToTab('historial', { usuario: anom.empleado?.nombre || email })
  }

  // ── Helpers de UI ──
  const kpiCard = (type: AnomalyType) => {
    const count = report.counts[type]
    const active = filter === type
    return (
      <button
        key={type}
        onClick={() => setFilter(active ? 'all' : type)}
        style={{
          padding: '14px 16px',
          background: active ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
          border: '1px solid ' + (count > 0 ? SEV_COLOR[type === 'multi_equipment' ? 'warning' : 'critical'] + '44' : 'var(--border)'),
          borderRadius: '12px',
          cursor: 'pointer',
          textAlign: 'left',
          minWidth: '160px',
          color: 'var(--text-primary)',
          transition: 'all .15s',
        }}
      >
        <div style={{ fontSize: '22px', marginBottom: '4px' }}>{ANOMALY_ICONS[type]}</div>
        <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'IBM Plex Mono,monospace', color: count > 0 ? SEV_COLOR[type === 'multi_equipment' ? 'warning' : 'critical'] : 'var(--text-secondary)' }}>
          {count}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginTop: '4px', lineHeight: 1.3 }}>
          {ANOMALY_LABELS[type]}
        </div>
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ── Header ── */}
      <div>
        <h2 style={{ margin: 0, fontSize: '20px' }}>🔍 Auditoría de inventario</h2>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Solo lectura · {report.totalReviewed.activos} activos, {report.totalReviewed.assignments} asignaciones vigentes, {report.totalReviewed.employees} empleados revisados
        </div>
      </div>

      {/* ── Resumen de categorías vigiladas ── */}
      <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 18px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '10px' }}>
          Clasificación del catálogo (verificar antes de interpretar resultados)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {(['portatil', 'movil', 'monitor'] as const).map((cat) => (
            <div key={cat} style={{ background: 'var(--bg-primary)', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-blue)', marginBottom: '4px' }}>{CATEGORY_LABELS[cat]}</div>
              {breakdown[cat].length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--accent-orange)', fontStyle: 'italic' }}>
                  ⚠️ ningún tipo del catálogo clasificado como {CATEGORY_LABELS[cat].toLowerCase()}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'IBM Plex Mono,monospace' }}>
                  {breakdown[cat].join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
        {breakdown.otros.length > 0 && (
          <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <strong>No vigilados</strong> ({breakdown.otros.length}): {breakdown.otros.join(', ')}
          </div>
        )}
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '10px', lineHeight: 1.5 }}>
          Si falta algún tipo que debería considerarse portátil/móvil/monitor, edita <code style={{ background: 'var(--bg-secondary)', padding: '1px 6px', borderRadius: '4px' }}>src/utils/categoryClassifier.ts</code> añadiendo el patrón correspondiente.
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {(['multi_equipment', 'stock_but_assigned', 'assigned_without_record', 'different_employees'] as AnomalyType[]).map(kpiCard)}
        {needsReviewCount > 0 && (
          <div style={{ padding: '14px 16px', background: 'rgba(88,166,255,.08)', border: '1px solid rgba(88,166,255,.3)', borderRadius: '12px', minWidth: '160px' }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>❓</div>
            <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'IBM Plex Mono,monospace', color: 'var(--accent-blue)' }}>{needsReviewCount}</div>
            <div style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 700, textTransform: 'uppercase', marginTop: '4px' }}>Necesita revisión</div>
          </div>
        )}
      </div>

      {/* ── Filter bar ── */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Filtrar:</span>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '5px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer',
            background: filter === 'all' ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
            color: filter === 'all' ? 'white' : 'var(--text-secondary)',
            fontSize: '12px', fontWeight: 700,
          }}
        >
          Todas ({report.anomalies.length})
        </button>
        {(['multi_equipment', 'stock_but_assigned', 'assigned_without_record', 'different_employees'] as AnomalyType[]).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(filter === t ? 'all' : t)}
            style={{
              padding: '5px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer',
              background: filter === t ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
              color: filter === t ? 'white' : 'var(--text-secondary)',
              fontSize: '12px', fontWeight: 700,
            }}
          >
            {ANOMALY_ICONS[t]} {ANOMALY_LABELS[t]} ({report.counts[t]})
          </button>
        ))}
      </div>

      {/* ── Results ── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '42px', marginBottom: '10px' }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: '15px' }}>Sin anomalías {filter !== 'all' ? 'de este tipo' : ''}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            El inventario está coherente con las asignaciones vigentes.
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={th}>Tipo</th>
                  <th style={th}>Empleado</th>
                  <th style={th}>Equipo</th>
                  <th style={th}>Motivo</th>
                  <th style={{ ...th, width: '120px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, idx) => (
                  <>
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={td}>
                        <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, background: SEV_COLOR[a.severity] + '22', color: SEV_COLOR[a.severity] }}>
                          {ANOMALY_ICONS[a.type]} {ANOMALY_LABELS[a.type]}
                        </span>
                        {a.needsReview && <div style={{ fontSize: '10px', color: 'var(--accent-blue)', marginTop: '4px' }}>❓ necesita revisión</div>}
                      </td>
                      <td style={td}>
                        {a.empleado ? (
                          <>
                            <div style={{ fontWeight: 600 }}>{a.empleado.nombre}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{a.empleado.email || '(sin email)'}</div>
                          </>
                        ) : a.assignments ? (
                          <div style={{ fontSize: '12px' }}>
                            {a.assignments.map((asg, i) => (
                              <div key={i} style={{ marginBottom: '3px' }}>
                                <span style={{ fontWeight: 600 }}>{asg.empleadoNombre}</span>
                                <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>· {asg.empleadoEmail || '(sin email)'}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>—</span>
                        )}
                      </td>
                      <td style={td}>
                        {a.activo ? (
                          <>
                            <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontWeight: 600, fontSize: '12px' }}>{a.activo.idEtiqueta}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{a.activo.tipo} · {a.activo.modelo}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>estado: {a.activo.estado}</div>
                          </>
                        ) : a.activos ? (
                          <div style={{ fontSize: '11px' }}>
                            {a.activos.map((x, i) => (
                              <div key={i} style={{ marginBottom: '2px' }}>
                                <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontWeight: 600 }}>{x.idEtiqueta}</span>
                                <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>· {x.tipo} {x.modelo}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>—</span>
                        )}
                      </td>
                      <td style={{ ...td, maxWidth: '320px' }}>{a.reason}</td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {(a.activo || a.activos) && (
                            <button onClick={() => openActivo(a)} title="Abrir ficha de equipo" style={btnIcon}>💻</button>
                          )}
                          {a.empleado?.nombre && (
                            <button onClick={() => openEmployee(a)} title="Ver historial del empleado" style={btnIcon}>📜</button>
                          )}
                          <button
                            onClick={() => setExpandedEvidence((p) => ({ ...p, [idx]: !p[idx] }))}
                            title="Ver evidencia bruta"
                            style={btnIcon}
                          >
                            {expandedEvidence[idx] ? '▴' : '▾'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedEvidence[idx] && (
                      <tr key={idx + '-ev'}>
                        <td colSpan={5} style={{ padding: '10px 14px', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Evidencia</div>
                          <pre style={{ margin: 0, fontSize: '11px', fontFamily: 'IBM Plex Mono,monospace', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {JSON.stringify(a.evidence, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Footer note ── */}
      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: '8px', lineHeight: 1.6 }}>
        <strong>Nota:</strong> Esta vista es informativa. No modifica ningún dato de SharePoint. Para resolver una anomalía, abre el registro afectado desde el botón de acción y revisa manualmente.
      </div>
    </div>
  )
}

const th: React.CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  background: 'var(--bg-tertiary)',
  borderBottom: '1px solid var(--border)',
  fontWeight: 700,
  fontSize: '11px',
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
}
const td: React.CSSProperties = {
  padding: '10px 14px',
  verticalAlign: 'top',
  color: 'var(--text-primary)',
}
const btnIcon: React.CSSProperties = {
  padding: '4px 8px',
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  cursor: 'pointer',
  color: 'var(--text-primary)',
  fontSize: '13px',
}
