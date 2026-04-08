import type { ReactNode } from 'react'
import type { Ubicacion } from '../../../types'

export function FormField({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label}
        {required && <span className="required-asterisk"> *</span>}
      </label>
      {children}
    </div>
  )
}

export function UbicacionSelect({ value, ubicaciones, onChange }: { value: string; ubicaciones: Ubicacion[]; onChange: (v: string) => void }) {
  return (
    <select className="form-select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">-- Selecciona ubicacion --</option>
      {ubicaciones.map((u) => (
        <option key={u.id} value={u.nombre}>{u.nombre}</option>
      ))}
    </select>
  )
}

export function EstadoSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className="form-select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="Nuevo">Nuevo</option>
      <option value="Usado">Usado</option>
    </select>
  )
}

export function TierSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className="form-select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="Estándar">Estándar</option>
      <option value="Premium">⭐ Premium</option>
    </select>
  )
}

export function TecnicoBanner({ tecnico, isAdmin }: { tecnico: string; isAdmin: boolean }) {
  return (
    <div className="info-banner green" style={{ marginBottom: '16px' }}>
      {isAdmin ? '🛡️ Admin: ' : '🔧 Técnico: '}<strong>{tecnico}</strong>
    </div>
  )
}

export function ADDropdown({
  results,
  loading,
  onSelect,
}: {
  results: Array<{ id: string; displayName: string; mail: string; department?: string; jobTitle?: string }>
  loading: boolean
  onSelect: (user: any) => void
}) {
  if (!loading && results.length === 0) return null
  return (
    <div className="user-search-dropdown">
      {loading && (
        <div style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>⏳ Buscando...</div>
      )}
      {results.map((user) => (
        <div key={user.id} className="user-search-item" onClick={() => onSelect(user)}>
          <div style={{ fontWeight: '600', fontSize: '14px' }}>{user.displayName}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{user.mail}</div>
          {(user.department || user.jobTitle) && (
            <div style={{ fontSize: '12px', color: 'var(--accent-blue)' }}>
              {[user.department, user.jobTitle].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function BarcodeField({
  value,
  onChange,
  onScan,
  onGenerate,
}: {
  value: string
  onChange: (v: string) => void
  onScan: () => void
  onGenerate: () => void
}) {
  return (
    <FormField label="Codigo de Barras" required>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          className="form-input"
          value={value}
          placeholder="Escanea o escribe"
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="button" className="button button-primary" onClick={onScan}>📷</button>
        <button type="button" className="button button-secondary" onClick={onGenerate}>⚡ Gen</button>
      </div>
    </FormField>
  )
}

export function TipoModeloFields({
  tipo,
  modelo,
  tipoNuevo,
  modeloNuevo,
  modeloDetalle,
  showAddTipo,
  showAddModelo,
  catalogo,
  isAdmin,
  savingCatalog,
  onUpdate,
  onSaveTipo,
  onSaveModelo,
}: {
  tipo: string
  modelo: string
  tipoNuevo: string
  modeloNuevo: string
  modeloDetalle: string
  showAddTipo: boolean
  showAddModelo: boolean
  catalogo: Record<string, string[]>
  isAdmin: boolean
  savingCatalog: boolean
  onUpdate: (field: string, value: string | boolean) => void
  onSaveTipo: () => void
  onSaveModelo: () => void
}) {
  const tiposDisponibles = Object.keys(catalogo)
  const modelosDisponibles = tipo ? (catalogo[tipo] || []) : []

  return (
    <div>
      <FormField label="Tipo de Material" required>
        <div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              className="form-select"
              value={tipo}
              style={{ flex: 1 }}
              onChange={(e) => { onUpdate('tipo', e.target.value); onUpdate('modelo', ''); onUpdate('showAddModelo', false); }}
            >
              <option value="">-- Selecciona tipo --</option>
              {tiposDisponibles.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {isAdmin && (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => onUpdate('showAddTipo', !showAddTipo)}
                style={{ padding: '10px 14px', fontSize: '18px' }}
              >
                {showAddTipo ? '✕' : '+'}
              </button>
            )}
          </div>
          {isAdmin && showAddTipo && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Nombre del nuevo tipo..."
                value={tipoNuevo}
                onChange={(e) => onUpdate('tipoNuevo', e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="button button-success"
                onClick={onSaveTipo}
                disabled={savingCatalog || !tipoNuevo.trim()}
                style={{ padding: '10px 16px' }}
              >
                {savingCatalog ? <span className="loading-spinner" /> : '✓ Guardar'}
              </button>
            </div>
          )}
        </div>
      </FormField>
      {tipo && (
        <FormField label="Modelo" required>
          <div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                className="form-select"
                value={modelo}
                style={{ flex: 1 }}
                onChange={(e) => onUpdate('modelo', e.target.value)}
              >
                <option value="">-- Selecciona modelo --</option>
                {modelosDisponibles.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              {isAdmin && (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => onUpdate('showAddModelo', !showAddModelo)}
                  style={{ padding: '10px 14px', fontSize: '18px' }}
                >
                  {showAddModelo ? '✕' : '+'}
                </button>
              )}
            </div>
            {isAdmin && showAddModelo && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nombre del nuevo modelo..."
                  value={modeloNuevo}
                  onChange={(e) => onUpdate('modeloNuevo', e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="button button-success"
                  onClick={onSaveModelo}
                  disabled={savingCatalog || !modeloNuevo.trim()}
                  style={{ padding: '10px 16px' }}
                >
                  {savingCatalog ? <span className="loading-spinner" /> : '✓ Guardar'}
                </button>
              </div>
            )}
            {modelo && /otro|vario/i.test(modelo) && (
              <div style={{ marginTop: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="✏️ Describe el modelo específico..."
                  value={modeloDetalle}
                  onChange={(e) => onUpdate('modeloDetalle', e.target.value)}
                />
              </div>
            )}
          </div>
        </FormField>
      )}
    </div>
  )
}
