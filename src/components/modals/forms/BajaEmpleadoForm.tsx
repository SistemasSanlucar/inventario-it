import { useState } from 'react'
import { FormField, TecnicoBanner } from '../shared/FormHelpers'
import type { AppState } from '../../../types'
import type { DataManager } from '../../../services/DataManager'

interface BajaEmpleadoFormProps {
  formData: any
  onUpdate: (field: string, value: any) => void
  state: AppState & { isAdmin: boolean }
  dataManager: DataManager
  tecnico: string
  bajaSelected: any
  setBajaSelected: React.Dispatch<React.SetStateAction<any>>
  bajaSelections: Record<string, boolean>
  setBajaSelections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
}

export default function BajaEmpleadoForm({
  formData,
  onUpdate,
  state,
  dataManager,
  tecnico,
  bajaSelected,
  setBajaSelected,
  bajaSelections,
  setBajaSelections,
}: BajaEmpleadoFormProps) {
  const [bajaQuery, setBajaQuery] = useState('')
  const [bajaResults, setBajaResults] = useState<any[]>([])

  const empleadoAsignaciones = bajaSelected
    ? (state.assignments || []).filter((a) => a.emailEmpleado.toLowerCase() === bajaSelected.emailEmpleado.toLowerCase() && a.estado === 'Activo')
    : []

  const todosItems = empleadoAsignaciones.flatMap((a) => {
    let prods: any[] = []
    try { prods = JSON.parse(a.productosAsignados as any || '[]') } catch { /* empty */ }
    return prods.map((p: any) => ({ ...p, asignacionId: a.id }))
  })

  const handleBajaSearch = (q: string) => {
    setBajaQuery(q)
    const ql = q.toLowerCase()
    if (ql.length < 2) { setBajaResults([]); return }

    const seen = new Set<string>()
    const encontrados: any[] = [];
    (state.assignments || [])
      .filter((a) => a.estado === 'Activo')
      .forEach((a) => {
        if (
          !seen.has(a.emailEmpleado) &&
          ((a.nombreEmpleado || '').toLowerCase().includes(ql) ||
            (a.emailEmpleado || '').toLowerCase().includes(ql) ||
            (a.departamento || '').toLowerCase().includes(ql))
        ) {
          seen.add(a.emailEmpleado)
          const nAsigs = (state.assignments || []).filter((x) => x.emailEmpleado === a.emailEmpleado && x.estado === 'Activo').length
          encontrados.push({ nombreEmpleado: a.nombreEmpleado, emailEmpleado: a.emailEmpleado, departamento: a.departamento, tieneMaterial: true, nAsigs })
        }
      })

    if (encontrados.length < 5 && dataManager) {
      dataManager.searchUsers(q).then((adUsers) => {
        const extras = (adUsers || [])
          .filter((u: any) => !seen.has(u.mail))
          .slice(0, 5 - encontrados.length)
          .map((u: any) => ({ nombreEmpleado: u.displayName, emailEmpleado: u.mail, departamento: u.department || '', tieneMaterial: false, nAsigs: 0 }))
        setBajaResults([...encontrados, ...extras].slice(0, 8))
      }).catch(() => setBajaResults(encontrados.slice(0, 8)))
    } else {
      setBajaResults(encontrados.slice(0, 8))
    }
  }

  const selectBaja = (u: any) => {
    setBajaSelected(u)
    setBajaQuery('')
    setBajaResults([])
    const sel: Record<string, boolean> = {}
    const asigs = (state.assignments || []).filter((a) => a.emailEmpleado.toLowerCase() === u.emailEmpleado.toLowerCase() && a.estado === 'Activo')
    asigs.forEach((a) => {
      let prods: any[] = []
      try { prods = JSON.parse(a.productosAsignados as any || '[]') } catch { /* empty */ }
      prods.forEach((p: any) => { sel[p.barcode || p.idEtiqueta] = true })
    })
    setBajaSelections(sel)
  }

  return (
    <div>
      <TecnicoBanner tecnico={tecnico} isAdmin={state.isAdmin} />
      <div style={{ marginBottom: '16px', background: 'rgba(239,68,68,.1)', border: '1px solid var(--accent-red)', borderRadius: '8px', padding: '12px 16px', color: 'var(--accent-red)', fontWeight: '600' }}>
        👋 Baja de empleado — se devolverá todo el material activo y los equipos etiquetados volverán a Almacén.
      </div>

      {!bajaSelected ? (
        <div className="form-group" style={{ position: 'relative' }}>
          <label className="form-label">Buscar empleado *</label>
          <input type="text" className="form-input" placeholder="Nombre o email..." value={bajaQuery} onChange={(e) => handleBajaSearch(e.target.value)} />
          {bajaResults.length > 0 && (
            <div className="user-search-dropdown">
              {bajaResults.map((u, i) => (
                <div key={i} className="user-search-item" onClick={() => selectBaja(u)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600' }}>{u.nombreEmpleado}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{u.emailEmpleado}{u.departamento ? ` · ${u.departamento}` : ''}</div>
                    </div>
                    {u.tieneMaterial ? (
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-orange)', background: 'rgba(249,115,22,.15)', padding: '2px 8px', borderRadius: '10px' }}>{u.nAsigs} asig.</span>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Sin material</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '700' }}>{bajaSelected.nombreEmpleado}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{bajaSelected.emailEmpleado}</div>
            </div>
            <button className="button button-secondary" onClick={() => { setBajaSelected(null); setBajaSelections({}); setBajaQuery('') }} style={{ padding: '6px 10px', fontSize: '12px' }}>Cambiar</button>
          </div>

          {todosItems.length === 0 ? (
            <div style={{ background: 'rgba(63,185,80,.1)', border: '1px solid var(--accent-green)', borderRadius: '8px', padding: '12px 16px', color: 'var(--accent-green)', fontWeight: '600' }}>
              ✓ Este empleado no tiene material activo asignado.
            </div>
          ) : (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase' }}>
                {todosItems.length} item(s) — marca los que se devuelven
              </div>
              {todosItems.map((prod: any, idx: number) => {
                const key = prod.barcode || prod.idEtiqueta
                const sel = !!bajaSelections[key]
                return (
                  <div
                    key={(key || '') + idx}
                    className={'return-row ' + (sel ? 'selected' : '')}
                    onClick={() => setBajaSelections((prev) => ({ ...prev, [key]: !prev[key] }))}
                  >
                    <input type="checkbox" checked={sel} onChange={() => {}} style={{ width: '18px', height: '18px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>
                        {prod.esEquipo ? (
                          <span style={{ background: 'rgba(88,166,255,.15)', color: 'var(--accent-blue)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', marginRight: '6px', fontWeight: '700' }}>💻</span>
                        ) : (
                          <span style={{ background: 'rgba(63,185,80,.15)', color: 'var(--accent-green)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', marginRight: '6px', fontWeight: '700' }}>📦</span>
                        )}
                        {prod.nombre}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--accent-blue)', fontFamily: 'IBM Plex Mono,monospace' }}>{prod.idEtiqueta || prod.barcode || ''}</div>
                    </div>
                    {sel && <span style={{ color: 'var(--accent-green)', fontSize: '20px' }}>✓</span>}
                  </div>
                )
              })}
            </div>
          )}

          <FormField label="Motivo de baja">
            <input type="text" className="form-input" value={formData.observaciones} placeholder="Ej: Fin de contrato, cambio de sede..." onChange={(e) => onUpdate('observaciones', e.target.value)} />
          </FormField>
        </div>
      )}
    </div>
  )
}
