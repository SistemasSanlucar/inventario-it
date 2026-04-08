import { useState, useRef } from 'react'
import { FormField, TecnicoBanner, ADDropdown } from '../shared/FormHelpers'
import ProductsGrid from '../shared/ProductsGrid'
import SignatureCanvas from '../../shared/SignatureCanvas'
import { showToast } from '../../../hooks/useToast'
import { startBarcodeScanner } from '../../../utils/scanner'
import { PacksManager } from '../../../services/PacksManager'
import type { AppState, Activo } from '../../../types'
import type { DataManager } from '../../../services/DataManager'

interface SelectedEquipo {
  id: string | null
  idEtiqueta: string
  nombre: string
  tipo: string
  modelo: string
  esEquipo: boolean
  pendienteEscaneo?: boolean
}

interface NuevaAsignacionFormProps {
  formData: any
  onUpdate: (field: string, value: any) => void
  setFormData: React.Dispatch<React.SetStateAction<any>>
  state: AppState & { isAdmin: boolean }
  dataManager: DataManager
  selectedProducts: Array<{ nombre: string; barcode: string; id: string; categoria: string }>
  setSelectedProducts: React.Dispatch<React.SetStateAction<any[]>>
  selectedEquipos: SelectedEquipo[]
  setSelectedEquipos: React.Dispatch<React.SetStateAction<SelectedEquipo[]>>
  tecnico: string
  onSignatureChange: (sig: string | null) => void
  onQuickCreate: (nombre: string) => Promise<any>
}

export default function NuevaAsignacionForm({
  formData,
  onUpdate,
  setFormData,
  state,
  dataManager,
  selectedProducts,
  setSelectedProducts,
  selectedEquipos,
  setSelectedEquipos,
  tecnico,
  onSignatureChange,
  onQuickCreate,
}: NuevaAsignacionFormProps) {
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<any[]>([])
  const [userSearchLoading, setUserSearchLoading] = useState(false)
  const [equipoInput, setEquipoInput] = useState('')
  const [equipoError, setEquipoError] = useState('')
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleUserSearch = (query: string) => {
    setUserSearchQuery(query)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (!query || query.length < 2) { setUserSearchResults([]); return }
    setUserSearchLoading(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await dataManager.searchUsers(query)
        setUserSearchResults(results)
      } catch { setUserSearchResults([]) }
      finally { setUserSearchLoading(false) }
    }, 400)
  }

  const selectUser = (user: any) => {
    setFormData((prev: any) => ({
      ...prev,
      nombreEmpleado: user.displayName || '',
      emailEmpleado: user.mail || '',
      departamento: user.department || '',
      puesto: user.jobTitle || '',
    }))
    setUserSearchQuery('')
    setUserSearchResults([])
  }

  const addEquipoById = (id: string) => {
    const idClean = (id || '').trim().toUpperCase()
    if (!idClean) return
    const activo = (state.activos || []).find((a) => a.idEtiqueta === idClean)
    if (!activo) { setEquipoError('ID no encontrado: ' + idClean); return }
    if (activo.estado !== 'Almacen') { setEquipoError('Equipo no disponible (estado: ' + activo.estado + ')'); return }
    if (selectedEquipos.find((e) => e.idEtiqueta === idClean)) { setEquipoError('Equipo ya añadido'); return }
    setSelectedEquipos((prev) => [
      ...prev,
      { id: activo.id, idEtiqueta: activo.idEtiqueta, nombre: `${activo.tipo} - ${activo.modelo}`, tipo: activo.tipo, modelo: activo.modelo, esEquipo: true },
    ])
    setEquipoInput('')
    setEquipoError('')
  }

  const addProductByBarcode = (barcode: string) => {
    if (!barcode) return
    const item = state.inventory.find((i) => i.barcode === barcode)
    if (!item) return
    if (item.stock <= 0) { showToast('Sin stock: ' + item.nombre, 'error'); return }
    if (selectedProducts.find((p) => p.barcode === barcode)) return
    setSelectedProducts((prev) => [...prev, { nombre: item.nombre, barcode: item.barcode, id: item.id, categoria: item.categoria }])
    showToast('Añadido: ' + item.nombre, 'success')
  }

  const handlePendingScan = (idx: number, code: string) => {
    const activo = (state.activos || []).find((a: Activo) => a.idEtiqueta === code.toUpperCase())
    if (activo && activo.estado === 'Almacen') {
      setSelectedEquipos((prev) =>
        prev.map((e, i) =>
          i === idx
            ? { id: activo.id, idEtiqueta: activo.idEtiqueta, nombre: `${activo.tipo} - ${activo.modelo}`, tipo: activo.tipo, modelo: activo.modelo, esEquipo: true, pendienteEscaneo: false }
            : e
        )
      )
      showToast('✓ ' + code.toUpperCase() + ' vinculado', 'success')
    } else {
      showToast('ID no válido o no disponible', 'error')
    }
  }

  const availablePacks = PacksManager.getAll() as Array<{ id: string; nombre?: string; equipos?: Array<{ tipo: string; modelo: string }> }>

  return (
    <div>
      <TecnicoBanner tecnico={tecnico} isAdmin={state.isAdmin} />
      {formData.esPrestamo && (
        <div className="info-banner orange">⏱️ PRÉSTAMO: Este material debe ser devuelto hoy.</div>
      )}

      {/* Pack selector */}
      {!formData.esPrestamo && availablePacks.length > 0 && (
        <div style={{ background: 'rgba(88,166,255,.08)', border: '1px solid rgba(88,166,255,.3)', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
          <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--accent-blue)', marginBottom: '10px', textTransform: 'uppercase' }}>🎒 Cargar Pack de Incorporación</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {availablePacks.map((pack) => (
              <button
                key={pack.id}
                type="button"
                className="button button-secondary"
                style={{ fontSize: '13px' }}
                onClick={() => {
                  setSelectedEquipos([])
                  setEquipoError('')
                  const pendientes = (pack.equipos || []).map((eq: any) => ({
                    id: null,
                    idEtiqueta: '',
                    nombre: `${eq.tipo} - ${eq.modelo}`,
                    tipo: eq.tipo,
                    modelo: eq.modelo,
                    esEquipo: true,
                    pendienteEscaneo: true,
                  }))
                  setSelectedEquipos(pendientes)
                  showToast(`Pack cargado: ${pack.nombre} — escanea los IDs`, 'success')
                }}
              >
                🎒 {pack.nombre} ({(pack.equipos || []).length})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Employee search */}
      <div className="form-group" style={{ position: 'relative' }}>
        <label className="form-label">Empleado<span className="required-asterisk"> *</span></label>
        <input
          type="text"
          className="form-input"
          value={formData.nombreEmpleado || userSearchQuery}
          placeholder="Buscar empleado en Active Directory..."
          onChange={(e) => {
            if (formData.nombreEmpleado) setFormData((p: any) => ({ ...p, nombreEmpleado: '', emailEmpleado: '', departamento: '', puesto: '' }))
            handleUserSearch(e.target.value)
          }}
        />
        {formData.nombreEmpleado && (
          <div style={{ marginTop: '6px', color: 'var(--accent-green)', fontSize: '13px' }}>
            ✓ {formData.nombreEmpleado} · {formData.emailEmpleado}
          </div>
        )}
        <ADDropdown results={userSearchResults} loading={userSearchLoading} onSelect={selectUser} />
      </div>

      {formData.nombreEmpleado && (
        <div>
          <div className="form-row">
            <FormField label="Departamento">
              <input type="text" className="form-input" value={formData.departamento} placeholder="Dpto." onChange={(e) => onUpdate('departamento', e.target.value)} />
            </FormField>
            <FormField label="Puesto">
              <input type="text" className="form-input" value={formData.puesto} placeholder="Cargo" onChange={(e) => onUpdate('puesto', e.target.value)} />
            </FormField>
          </div>
          <FormField label="Fecha incorporacion">
            <input type="date" className="form-input" value={formData.fechaIncorporacion} onChange={(e) => onUpdate('fechaIncorporacion', e.target.value)} />
          </FormField>
        </div>
      )}

      {/* Equipment section */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ fontSize: '12px', color: 'var(--accent-blue)', whiteSpace: 'nowrap', fontWeight: '700', textTransform: 'uppercase' }}>💻 Equipos con etiqueta</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
          <input
            type="text"
            className="form-input"
            value={equipoInput}
            placeholder="ID etiqueta (SLF-26-XXXXXXXX) — escribe o escanea QR"
            style={{ flex: 1, fontFamily: 'IBM Plex Mono,monospace', textTransform: 'uppercase' }}
            onChange={(e) => { setEquipoInput(e.target.value.toUpperCase()); setEquipoError('') }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEquipoById(equipoInput) } }}
          />
          <button type="button" className="button button-primary" onClick={() => startBarcodeScanner((code) => addEquipoById(code))}>📷</button>
          <button type="button" className="button button-success" onClick={() => addEquipoById(equipoInput)}>+ Añadir</button>
        </div>
        {equipoError && <div style={{ color: 'var(--accent-red)', fontSize: '13px', marginBottom: '6px' }}>⚠️ {equipoError}</div>}
        {selectedEquipos.length > 0 && (
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '10px', marginBottom: '8px', border: '2px solid var(--accent-blue)' }}>
            {selectedEquipos.map((eq, idx) => (
              <div
                key={eq.idEtiqueta || `pending-${idx}`}
                className="product-row-assigned"
                style={eq.pendienteEscaneo ? { border: '1px dashed var(--accent-orange)', borderRadius: '6px', padding: '6px' } : {}}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '2px' }}>{eq.nombre}</div>
                  {eq.pendienteEscaneo ? (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Escanea o escribe el ID del equipo..."
                        style={{ flex: 1, padding: '4px 8px', fontSize: '13px', fontFamily: 'IBM Plex Mono,monospace', textTransform: 'uppercase' }}
                        onChange={(e) => {
                          const idClean = e.target.value.toUpperCase()
                          if (idClean.length > 8) handlePendingScan(idx, idClean)
                        }}
                      />
                      <button
                        type="button"
                        className="button button-primary"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        onClick={() => startBarcodeScanner((code) => handlePendingScan(idx, code))}
                      >
                        📷
                      </button>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--accent-blue)', fontSize: '11px', fontFamily: 'IBM Plex Mono,monospace' }}>{eq.idEtiqueta}</span>
                  )}
                </div>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '20px', padding: '0 4px' }}
                  onClick={() => setSelectedEquipos((prev) => prev.filter((_, i) => i !== idx))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Consumables section */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ fontSize: '12px', color: 'var(--accent-green)', whiteSpace: 'nowrap', fontWeight: '700', textTransform: 'uppercase' }}>📦 Material fungible (consumibles)</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>
        <ProductsGrid
          inventory={state.inventory}
          selectedProducts={selectedProducts}
          onAdd={addProductByBarcode}
          onQuickCreate={onQuickCreate}
        />
      </div>

      {/* Selected consumables list */}
      {selectedProducts.length > 0 && (
        <div style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '12px', marginBottom: '16px', border: '2px solid var(--accent-green)' }}>
          <div style={{ fontWeight: '600', fontSize: '12px', color: 'var(--accent-green)', marginBottom: '8px', textTransform: 'uppercase' }}>✓ {selectedProducts.length} consumible(s)</div>
          {selectedProducts.map((prod, idx) => (
            <div key={prod.barcode} className="product-row-assigned">
              <div>
                <span style={{ fontWeight: '600', marginRight: '8px' }}>{idx + 1}. {prod.nombre}</span>
                <span style={{ color: 'var(--accent-blue)', fontSize: '12px', fontFamily: 'IBM Plex Mono,monospace' }}>{prod.barcode}</span>
              </div>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '20px', padding: '0 4px' }}
                onClick={() => setSelectedProducts((prev) => prev.filter((p) => p.barcode !== prod.barcode))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Total summary */}
      {(selectedEquipos.length + selectedProducts.length) > 0 && (
        <div style={{ padding: '10px 14px', background: 'rgba(88,166,255,.1)', border: '1px solid var(--accent-blue)', borderRadius: '8px', marginBottom: '12px', fontSize: '13px' }}>
          <strong>{selectedEquipos.length + selectedProducts.length}</strong> item(s) total —{' '}
          <span style={{ color: 'var(--accent-blue)' }}>{selectedEquipos.length} equipo(s)</span> +{' '}
          <span style={{ color: 'var(--accent-green)' }}>{selectedProducts.length} consumible(s)</span>
        </div>
      )}

      <FormField label="Observaciones">
        <input type="text" className="form-input" value={formData.observaciones} placeholder="Opcional" onChange={(e) => onUpdate('observaciones', e.target.value)} />
      </FormField>

      {formData.esPrestamo && (
        <FormField label="Fecha de devolución prevista">
          <div>
            <input
              type="date"
              className="form-input"
              value={formData.fechaDevolucion || ''}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => onUpdate('fechaDevolucion', e.target.value)}
            />
            {formData.fechaDevolucion ? (
              <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--accent-orange)', fontWeight: '600' }}>
                ⏰ Devolución: {new Date(formData.fechaDevolucion + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            ) : (
              <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>Sin fecha límite establecida</div>
            )}
          </div>
        </FormField>
      )}

      <SignatureCanvas onSignatureChange={onSignatureChange} />
    </div>
  )
}
