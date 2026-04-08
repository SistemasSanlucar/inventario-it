import { FormField, TecnicoBanner, TipoModeloFields, BarcodeField, UbicacionSelect, EstadoSelect, TierSelect } from '../shared/FormHelpers'
import SignatureCanvas from '../../shared/SignatureCanvas'
import type { InventoryItem, Ubicacion } from '../../../types'

interface EntradaFormProps {
  selectedItem: InventoryItem | null
  formData: any
  onUpdate: (field: string, value: any) => void
  catalogo: Record<string, string[]>
  ubicaciones: Ubicacion[]
  inventory: InventoryItem[]
  isAdmin: boolean
  tecnico: string
  savingCatalog: boolean
  onSaveTipo: () => void
  onSaveModelo: () => void
  onScan: (cb: (code: string) => void) => void
  onGenBarcode: () => void
  onSignatureChange: (sig: string | null) => void
}

export default function EntradaForm({
  selectedItem,
  formData,
  onUpdate,
  catalogo,
  ubicaciones,
  inventory,
  isAdmin,
  tecnico,
  savingCatalog,
  onSaveTipo,
  onSaveModelo,
  onScan,
  onGenBarcode,
  onSignatureChange,
}: EntradaFormProps) {
  // Add stock to existing product
  if (selectedItem) {
    return (
      <div>
        <TecnicoBanner tecnico={tecnico} isAdmin={isAdmin} />
        <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
          <div style={{ fontWeight: '700', fontSize: '18px', marginBottom: '8px' }}>{selectedItem.nombre}</div>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <span>Stock actual: <strong style={{ color: 'var(--accent-green)' }}>{selectedItem.stock} uds</strong></span>
            <span>Codigo: <strong style={{ color: 'var(--accent-blue)', fontFamily: 'IBM Plex Mono,monospace' }}>{selectedItem.barcode}</strong></span>
          </div>
        </div>
        <div className="form-row">
          <FormField label="Unidades a añadir" required>
            <input type="number" min="1" className="form-input" value={formData.cantidad} onChange={(e) => onUpdate('cantidad', e.target.value)} />
          </FormField>
          <FormField label="Ticket (opcional)">
            <input type="text" className="form-input" value={formData.ticket} placeholder="Ej: INC-123456" onChange={(e) => onUpdate('ticket', e.target.value)} />
          </FormField>
        </div>
        <div className="stock-result">✓ Stock resultante: {selectedItem.stock + (parseInt(formData.cantidad) || 0)} unidades</div>
        <SignatureCanvas onSignatureChange={onSignatureChange} />
      </div>
    )
  }

  // New product
  const nombreProducto = formData.tipo && formData.modelo ? `${formData.tipo} - ${formData.modelo}` : ''
  const productoExistente = inventory.find((item) => item.nombre === nombreProducto)
  const cant = parseInt(formData.stock) || 0

  return (
    <div>
      <TecnicoBanner tecnico={tecnico} isAdmin={isAdmin} />
      <div className="info-banner blue" style={{ marginBottom: '16px' }}>
        ℹ️ Usa esta entrada para <strong>material consumible</strong>: cables, ratones, auriculares, adaptadores... Para equipos con etiqueta (portátiles, iPads, etc.) usa la pestaña <strong>💻 Equipos</strong>.
      </div>
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
      <FormField label="Cantidad recibida">
        <input type="number" min="1" className="form-input" placeholder="Nº de unidades" value={formData.stock} onChange={(e) => onUpdate('stock', e.target.value)} />
      </FormField>
      {productoExistente && cant > 0 && (
        <div className="stock-result">✓ Stock resultante: <strong>{productoExistente.stock + cant}</strong> uds ({productoExistente.stock} actuales + {cant} nuevas)</div>
      )}
      {!productoExistente && cant > 0 && (
        <div className="stock-result">✓ Se crearán <strong>{cant}</strong> unidades de este producto</div>
      )}
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
