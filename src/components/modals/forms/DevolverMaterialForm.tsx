import { useState } from 'react'
import { FormField, TecnicoBanner } from '../shared/FormHelpers'
import type { Assignment } from '../../../types'

interface DevolverMaterialFormProps {
  selectedItem: Assignment
  formData: any
  onUpdate: (field: string, value: any) => void
  isAdmin: boolean
  tecnico: string
  returnSelections: Record<string, boolean>
  setReturnSelections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
}

export default function DevolverMaterialForm({
  selectedItem,
  formData,
  onUpdate,
  isAdmin,
  tecnico,
  returnSelections,
  setReturnSelections,
}: DevolverMaterialFormProps) {
  const productos = selectedItem.productosAsignados || []
  const selectedCount = Object.values(returnSelections).filter(Boolean).length

  return (
    <div>
      <TecnicoBanner tecnico={tecnico} isAdmin={isAdmin} />
      <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>{selectedItem.nombreEmpleado}</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{selectedItem.emailEmpleado} · {selectedItem.departamento}</div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontWeight: '700', marginBottom: '12px', textTransform: 'uppercase', fontSize: '12px', color: 'var(--text-secondary)' }}>
          Selecciona los items a devolver
        </div>
        {productos.map((prod: any) => {
          const key = prod.barcode || prod.idEtiqueta
          const sel = !!returnSelections[key]
          const esEquipo = !!prod.esEquipo
          return (
            <div
              key={key}
              className={'return-row ' + (sel ? 'selected' : '')}
              onClick={() => setReturnSelections((prev) => ({ ...prev, [key]: !prev[key] }))}
            >
              <input type="checkbox" checked={sel} onChange={() => {}} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>
                  {esEquipo ? (
                    <span style={{ background: 'rgba(88,166,255,.15)', color: 'var(--accent-blue)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', marginRight: '6px', fontWeight: '700' }}>💻 EQUIPO</span>
                  ) : (
                    <span style={{ background: 'rgba(63,185,80,.15)', color: 'var(--accent-green)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', marginRight: '6px', fontWeight: '700' }}>📦 FUNGIBLE</span>
                  )}
                  {prod.nombre}
                </div>
                <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: '12px', color: 'var(--accent-blue)' }}>{prod.idEtiqueta || prod.barcode || ''}</div>
              </div>
              {sel && <span style={{ color: 'var(--accent-green)', fontSize: '20px' }}>✓</span>}
            </div>
          )
        })}
        <div style={{ marginTop: '8px', padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <strong style={{ color: selectedCount > 0 ? 'var(--accent-green)' : 'var(--text-secondary)' }}>{selectedCount}</strong> de {productos.length} items seleccionados
        </div>
      </div>

      <FormField label="Observaciones">
        <input type="text" className="form-input" value={formData.observaciones} placeholder="Estado del material..." onChange={(e) => onUpdate('observaciones', e.target.value)} />
      </FormField>
    </div>
  )
}
