import { useState, useRef } from 'react'
import { FormField, TecnicoBanner, ADDropdown } from '../shared/FormHelpers'
import SignatureCanvas from '../../shared/SignatureCanvas'
import type { InventoryItem } from '../../../types'
import type { DataManager } from '../../../services/DataManager'

interface SalidaFormProps {
  selectedItem: InventoryItem
  formData: any
  onUpdate: (field: string, value: any) => void
  setFormData: React.Dispatch<React.SetStateAction<any>>
  isAdmin: boolean
  tecnico: string
  dataManager: DataManager
  onSignatureChange: (sig: string | null) => void
}

export default function SalidaForm({
  selectedItem,
  formData,
  onUpdate,
  setFormData,
  isAdmin,
  tecnico,
  dataManager,
  onSignatureChange,
}: SalidaFormProps) {
  const [salidaUserQuery, setSalidaUserQuery] = useState('')
  const [salidaUserResults, setSalidaUserResults] = useState<any[]>([])
  const [salidaUserLoading, setSalidaUserLoading] = useState(false)
  const salidaSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSalidaSearch = (query: string) => {
    setSalidaUserQuery(query)
    if (salidaSearchRef.current) clearTimeout(salidaSearchRef.current)
    if (!query || query.length < 2) { setSalidaUserResults([]); return }
    setSalidaUserLoading(true)
    salidaSearchRef.current = setTimeout(async () => {
      try {
        const results = await dataManager.searchUsers(query)
        setSalidaUserResults(results)
      } catch { setSalidaUserResults([]) }
      finally { setSalidaUserLoading(false) }
    }, 400)
  }

  const selectSalidaUser = (user: any) => {
    setFormData((prev: any) => ({ ...prev, usuario: user.displayName || '', emailUsuario: user.mail || '' }))
    setSalidaUserQuery('')
    setSalidaUserResults([])
  }

  return (
    <div>
      <TecnicoBanner tecnico={tecnico} isAdmin={isAdmin} />
      <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ fontWeight: '700', fontSize: '18px', marginBottom: '8px' }}>{selectedItem.nombre}</div>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <span>Stock: <strong style={{ color: selectedItem.stock > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{selectedItem.stock} uds</strong></span>
          <span>Categoría: <strong>{selectedItem.categoria}</strong></span>
        </div>
      </div>
      <div className="form-row">
        <FormField label="Cantidad" required>
          <input type="number" min="1" max={String(selectedItem.stock)} className="form-input" value={formData.cantidad} onChange={(e) => onUpdate('cantidad', e.target.value)} />
        </FormField>
        <FormField label="Ticket">
          <input type="text" className="form-input" value={formData.ticket} placeholder="Ej: INC-123456" onChange={(e) => onUpdate('ticket', e.target.value)} />
        </FormField>
      </div>
      <div className="form-group" style={{ position: 'relative' }}>
        <label className="form-label">Destinatario<span className="required-asterisk"> *</span></label>
        <input
          type="text"
          className="form-input"
          value={formData.usuario || salidaUserQuery}
          placeholder="Buscar empleado en Active Directory..."
          onChange={(e) => {
            if (formData.usuario) setFormData((p: any) => ({ ...p, usuario: '', emailUsuario: '' }))
            handleSalidaSearch(e.target.value)
          }}
        />
        {formData.usuario && (
          <div style={{ marginTop: '6px', color: 'var(--accent-green)', fontSize: '13px' }}>✓ {formData.usuario}</div>
        )}
        <ADDropdown results={salidaUserResults} loading={salidaUserLoading} onSelect={selectSalidaUser} />
      </div>
      <SignatureCanvas onSignatureChange={onSignatureChange} />
    </div>
  )
}
