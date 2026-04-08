import { TipoModeloFields, BarcodeField, FormField, UbicacionSelect, EstadoSelect } from '../shared/FormHelpers'
import type { InventoryItem, Ubicacion } from '../../../types'

interface DuplicarFormProps {
  selectedItem: InventoryItem
  formData: any
  onUpdate: (field: string, value: any) => void
  catalogo: Record<string, string[]>
  ubicaciones: Ubicacion[]
  isAdmin: boolean
  savingCatalog: boolean
  onSaveTipo: () => void
  onSaveModelo: () => void
  onScan: (cb: (code: string) => void) => void
  onGenBarcode: () => void
}

export default function DuplicarForm({
  selectedItem,
  formData,
  onUpdate,
  catalogo,
  ubicaciones,
  isAdmin,
  savingCatalog,
  onSaveTipo,
  onSaveModelo,
  onScan,
  onGenBarcode,
}: DuplicarFormProps) {
  return (
    <div>
      <div className="info-banner blue">ℹ️ Nuevo producto basado en "{selectedItem.nombre}". Asigna un código único.</div>
      <TipoModeloFields
        tipo={formData.tipo}
        modelo={formData.modelo}
        tipoNuevo={formData.tipoNuevo}
        modeloNuevo={formData.modeloNuevo}
        modeloDetalle={formData.modeloDetalle || ''}
        showAddTipo={formData.showAddTipo}
        showAddModelo={formData.showAddModelo}
        catalogo={catalogo}
        isAdmin={isAdmin}
        savingCatalog={savingCatalog}
        onUpdate={onUpdate}
        onSaveTipo={onSaveTipo}
        onSaveModelo={onSaveModelo}
      />
      <FormField label="Nuevo Codigo de Barras" required>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className="form-input"
            value={formData.barcode}
            placeholder="Nuevo código único"
            onChange={(e) => onUpdate('barcode', e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="button" className="button button-primary" onClick={() => onScan((code) => onUpdate('barcode', code))}>📷</button>
          <button type="button" className="button button-secondary" onClick={onGenBarcode}>⚡ Gen</button>
        </div>
      </FormField>
      <div className="form-row">
        <FormField label="Stock">
          <input type="number" min="0" className="form-input" value={formData.stock} onChange={(e) => onUpdate('stock', e.target.value)} />
        </FormField>
        <FormField label="Stock Minimo">
          <input type="number" min="0" className="form-input" value={formData.stockMinimo} onChange={(e) => onUpdate('stockMinimo', e.target.value)} />
        </FormField>
      </div>
      <div className="form-row">
        <FormField label="Ubicacion" required>
          <UbicacionSelect value={formData.ubicacion} ubicaciones={ubicaciones} onChange={(v) => onUpdate('ubicacion', v)} />
        </FormField>
        <FormField label="Estado">
          <EstadoSelect value={formData.estado} onChange={(v) => onUpdate('estado', v)} />
        </FormField>
      </div>
    </div>
  )
}
