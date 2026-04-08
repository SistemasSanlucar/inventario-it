import { TipoModeloFields, BarcodeField, FormField, UbicacionSelect, EstadoSelect, TierSelect } from '../shared/FormHelpers'
import type { Ubicacion } from '../../../types'

interface EditarFormProps {
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

export default function EditarForm({
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
}: EditarFormProps) {
  return (
    <div>
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
      <BarcodeField
        value={formData.barcode}
        onChange={(v) => onUpdate('barcode', v)}
        onScan={() => onScan((code) => onUpdate('barcode', code))}
        onGenerate={onGenBarcode}
      />
      <div className="form-row">
        <FormField label="Stock Actual">
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
        <FormField label="Tier">
          <TierSelect value={formData.tier || 'Estándar'} onChange={(v) => onUpdate('tier', v)} />
        </FormField>
      </div>
    </div>
  )
}
