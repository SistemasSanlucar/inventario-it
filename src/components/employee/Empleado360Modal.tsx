import { useMemo } from 'react'
import { useAppContext } from '../../context/AppContext'
import { useTabNavigation } from '../../hooks/useTabNavigation'
import { getEmployeeView } from '../../utils/employeeView'
import { CATEGORY_LABELS } from '../../utils/categoryClassifier'

/**
 * Wrapper exterior: solo tiene 1 hook (useAppContext) y decide si montar el
 * contenido. Devuelve null ANTES de que el componente interno se monte, por
 * lo que los hooks del interno se ejecutan siempre y en el mismo orden.
 * Patrón alternativo a "early return" dentro del componente, que violaría
 * las Rules of Hooks de React.
 */
export default function Empleado360Modal() {
  const { state } = useAppContext()
  if (!state.fichaEmpleado) return null
  return <Empleado360ModalContent ficha={state.fichaEmpleado} />
}

function Empleado360ModalContent({ ficha }: { ficha: { email: string; nombre: string } }) {
  const { state, dispatch } = useAppContext()
  const { goToTab, goToEquipo } = useTabNavigation()

  const view = useMemo(
    () =>
      getEmployeeView(
        {
          activos: state.activos || [],
          assignments: state.assignments || [],
          history: state.history || [],
        },
        ficha
      ),
    // Dependencias incluyen `ficha` entero: cambiar de empleado (ej. desde
    // el buscador global sin cerrar el modal) recomputa la vista.
    [state.activos, state.assignments, state.history, ficha]
  )

  const close = () => dispatch({ type: 'SET_FICHA_EMPLEADO', payload: null })

  const openEquipo = (idEtiqueta: string) => {
    const activo = (state.activos || []).find((a) => a.idEtiqueta === idEtiqueta)
    if (activo) {
      close()
      goToEquipo(activo)
    }
  }

  const openHistorial = () => {
    close()
    goToTab('historial', { usuario: view.nombre })
  }

  const openAsignacion = (modalType: string) => {
    // Prefill: FormModal lee nombreEmpleado/emailEmpleado/departamento/puesto
    // de selectedItem cuando el modalType es nueva-asignacion / nuevo-prestamo /
    // baja-empleado. Es solo pre-rellenado del campo, la lógica de submit no cambia.
    close()
    dispatch({
      type: 'OPEN_MODAL',
      payload: {
        modalType,
        selectedItem: {
          nombreEmpleado: view.nombre,
          emailEmpleado: view.email,
          departamento: view.departamento,
          puesto: view.puesto,
        },
      },
    })
  }

  // Avatar
  const initials = view.nombre
    ? view.nombre.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const fmtDate = (iso: string | null | undefined) => {
    if (!iso) return 'no disponible'
    try {
      return new Date(iso).toLocaleDateString('es-ES')
    } catch {
      return iso
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={close}>
      <div
        className="modal"
        style={{ maxWidth: '980px', width: '95%' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'rgba(88,166,255,.15)',
              border: '1px solid rgba(88,166,255,.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 800,
              color: 'var(--accent-blue)',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="modal-title" style={{ margin: 0, fontSize: '20px' }}>
              {view.nombre || '(sin nombre)'}
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono,monospace' }}>
              {view.email || '(sin email)'}
            </div>
            {(view.departamento || view.puesto) && (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {[view.puesto, view.departamento].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
          <button className="modal-close" onClick={close}>&times;</button>
        </div>

        <div className="modal-body" style={{ padding: '20px 28px' }}>
          {/* KPIs */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
            {kpi('💻', view.equipos.length, 'Equipos actuales', 'var(--accent-blue)')}
            {kpi('⏱', view.prestamosActivos.length, 'Préstamos activos', '#fbbf24')}
            {view.historyWithheld
              ? kpi('⚠️', 0, 'Historial no atribuible', '#ef4444')
              : kpi('📜', view.historial.length, 'Movimientos en historial', 'var(--accent-purple)')}
            {view.duplicidades.length > 0 && kpi('⚠️', view.duplicidades.length, 'Duplicidades', '#ef4444')}
          </div>

          {/* Alerts */}
          {view.duplicidades.length > 0 && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '10px', marginBottom: '14px', fontSize: '13px' }}>
              <strong style={{ color: '#ef4444' }}>⚠️ Duplicidad detectada:</strong>{' '}
              {view.duplicidades
                .map((d) => `${d.count} ${CATEGORY_LABELS[d.category].toLowerCase()}(s) [${d.ids.join(', ')}]`)
                .join(' · ')}
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                La norma general es 1 portátil, 1 móvil y 1 monitor por empleado. Verifica si es una excepción justificada.
              </div>
            </div>
          )}

          {/* El aviso se muestra ahora dentro de la sección Historial */}

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
            <button className="button button-success" onClick={() => openAsignacion('nueva-asignacion')} style={btn}>
              + Asignar material
            </button>
            <button className="button button-warning" onClick={() => openAsignacion('nuevo-prestamo')} style={btn}>
              ⏱ Prestar material
            </button>
            {view.asignacionesActivas.length > 0 && (
              <button className="button button-secondary" onClick={() => openAsignacion('baja-empleado')} style={btn}>
                👋 Baja de empleado
              </button>
            )}
            <button className="button button-secondary" onClick={openHistorial} style={btn}>
              📜 Historial completo
            </button>
          </div>

          {/* Equipos actuales */}
          <section style={section}>
            <h3 style={sectionTitle}>💻 Equipos actuales ({view.equipos.length})</h3>
            {view.equipos.length === 0 ? (
              <div style={emptyBox}>Sin equipos asignados</div>
            ) : (
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>ID</th>
                    <th style={th}>Tipo</th>
                    <th style={th}>Modelo</th>
                    <th style={th}>N/S</th>
                    <th style={th}>Asignado desde</th>
                    <th style={{ ...th, width: '80px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {view.equipos.map((eq) => (
                    <tr key={eq.id} style={eq.categoria ? { background: 'rgba(88,166,255,.03)' } : {}}>
                      <td style={{ ...td, fontFamily: 'IBM Plex Mono,monospace', fontWeight: 600 }}>{eq.idEtiqueta}</td>
                      <td style={td}>
                        {eq.tipo}
                        {eq.categoria && (
                          <span style={{ fontSize: '10px', color: 'var(--accent-blue)', marginLeft: '6px', fontWeight: 700, textTransform: 'uppercase' }}>
                            {CATEGORY_LABELS[eq.categoria]}
                          </span>
                        )}
                      </td>
                      <td style={td}>{eq.modelo || 'no disponible'}</td>
                      <td style={{ ...td, fontFamily: 'IBM Plex Mono,monospace', fontSize: '12px' }}>{eq.numSerie || 'no disponible'}</td>
                      <td style={{ ...td, fontSize: '12px', color: 'var(--text-secondary)' }}>{fmtDate(eq.fechaAsignacion)}</td>
                      <td style={td}>
                        <button onClick={() => openEquipo(eq.idEtiqueta)} style={smallBtn} title="Ver ficha equipo">💻</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Préstamos pendientes */}
          <section style={section}>
            <h3 style={sectionTitle}>⏱ Préstamos pendientes ({view.prestamosActivos.length})</h3>
            {view.prestamosActivos.length === 0 ? (
              <div style={emptyBox}>Sin préstamos pendientes</div>
            ) : (
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Desde</th>
                    <th style={th}>Devolución prevista</th>
                    <th style={th}>Items</th>
                    <th style={th}>Técnico</th>
                    <th style={th}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {view.prestamosActivos.map((p) => (
                    <tr key={p.id}>
                      <td style={{ ...td, fontFamily: 'IBM Plex Mono,monospace', fontSize: '12px' }}>{fmtDate(p.fechaAsignacion)}</td>
                      <td style={{ ...td, fontFamily: 'IBM Plex Mono,monospace', fontSize: '12px', color: p.vencido ? '#ef4444' : 'var(--text-primary)', fontWeight: p.vencido ? 700 : 400 }}>
                        {p.fechaDevolucionPrevista ? fmtDate(p.fechaDevolucionPrevista) : 'no definida'}
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>{p.cantidadProductos}</td>
                      <td style={{ ...td, fontSize: '12px', color: 'var(--text-secondary)' }}>{p.tecnicoResponsable || '—'}</td>
                      <td style={td}>
                        {p.vencido ? (
                          <span style={{ padding: '2px 8px', borderRadius: '10px', background: 'rgba(239,68,68,.15)', color: '#ef4444', fontSize: '11px', fontWeight: 700 }}>⚠️ VENCIDO</span>
                        ) : (
                          <span style={{ padding: '2px 8px', borderRadius: '10px', background: 'rgba(251,191,36,.15)', color: '#fbbf24', fontSize: '11px', fontWeight: 700 }}>En curso</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Historial */}
          <section style={section}>
            <h3 style={sectionTitle}>📜 Historial reciente</h3>
            {view.historyWithheld ? (
              <div style={{ padding: '14px 16px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.35)', borderRadius: '10px', fontSize: '13px' }}>
                <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: '6px' }}>
                  ⚠️ Historial no atribuible con seguridad
                </div>
                <div style={{ color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '6px' }}>
                  {view.historyWithheldReason}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Para evitar mostrar datos ambiguos, el historial de este empleado se oculta hasta que se diferencie manualmente en el sistema.
                  Puedes consultar el historial completo filtrado por nombre desde el botón "📜 Historial completo" de arriba y revisarlo manualmente.
                </div>
              </div>
            ) : view.historial.length === 0 ? (
              <div style={emptyBox}>Sin movimientos registrados</div>
            ) : (
              <div style={{ maxHeight: '260px', overflowY: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <table style={{ ...table, borderRadius: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, position: 'sticky', top: 0, background: 'var(--bg-tertiary)' }}>Fecha</th>
                      <th style={{ ...th, position: 'sticky', top: 0, background: 'var(--bg-tertiary)' }}>Tipo</th>
                      <th style={{ ...th, position: 'sticky', top: 0, background: 'var(--bg-tertiary)' }}>Producto</th>
                      <th style={{ ...th, position: 'sticky', top: 0, background: 'var(--bg-tertiary)' }}>Cantidad</th>
                      <th style={{ ...th, position: 'sticky', top: 0, background: 'var(--bg-tertiary)' }}>Técnico</th>
                      <th style={{ ...th, position: 'sticky', top: 0, background: 'var(--bg-tertiary)' }}>ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.historial.slice(0, 30).map((h) => (
                      <tr key={h.id}>
                        <td style={{ ...td, fontSize: '12px', fontFamily: 'IBM Plex Mono,monospace', color: 'var(--text-secondary)' }}>{fmtDate(h.fecha)}</td>
                        <td style={td}>
                          <span style={{ padding: '2px 7px', borderRadius: '10px', background: tipoColor(h.tipo) + '22', color: tipoColor(h.tipo), fontSize: '11px', fontWeight: 700 }}>{h.tipo}</span>
                        </td>
                        <td style={td}>{h.producto || 'no disponible'}</td>
                        <td style={{ ...td, textAlign: 'center' }}>{h.cantidad || '—'}</td>
                        <td style={{ ...td, fontSize: '12px', color: 'var(--text-secondary)' }}>{h.tecnico || '—'}</td>
                        <td style={{ ...td, fontFamily: 'IBM Plex Mono,monospace', fontSize: '12px' }}>{h.idEtiqueta || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {view.historial.length > 30 && (
                  <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', background: 'var(--bg-tertiary)' }}>
                    Mostrando 30 de {view.historial.length}. <button onClick={openHistorial} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit' }}>Ver historial completo →</button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <div className="modal-footer">
          <button className="button button-secondary" onClick={close}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

/* ── UI helpers ── */

function kpi(icon: string, value: number, label: string, color: string) {
  return (
    <div style={{ padding: '10px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '10px', minWidth: '120px' }}>
      <div style={{ fontSize: '18px' }}>{icon}</div>
      <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'IBM Plex Mono,monospace', color }}>{value}</div>
      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}

function tipoColor(t: string): string {
  const map: Record<string, string> = {
    Asignacion: '#58a6ff',
    Prestamo: '#fbbf24',
    Devolucion: '#f97316',
    Entrada: '#3fb950',
    Salida: '#a855f7',
  }
  return map[t] || '#8b949e'
}

const section: React.CSSProperties = { marginBottom: '18px' }
const sectionTitle: React.CSSProperties = { fontSize: '14px', fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary)' }
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '13px' }
const th: React.CSSProperties = { padding: '8px 10px', textAlign: 'left', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase' }
const td: React.CSSProperties = { padding: '8px 10px', borderBottom: '1px solid var(--border)', verticalAlign: 'top' }
const emptyBox: React.CSSProperties = { padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', background: 'var(--bg-tertiary)', borderRadius: '8px', fontStyle: 'italic' }
const btn: React.CSSProperties = { padding: '10px 18px', fontSize: '13px', fontWeight: 700 }
const smallBtn: React.CSSProperties = { padding: '4px 8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '13px' }
