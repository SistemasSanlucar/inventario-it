import { useState } from 'react'
import type { InventoryItem } from '../../../types'

interface ProductsGridProps {
  inventory: InventoryItem[]
  selectedProducts: Array<{ nombre: string; barcode: string; id: string; categoria: string }>
  onAdd: (barcode: string) => void
  onQuickCreate?: (nombre: string) => Promise<any>
}

export default function ProductsGrid({ inventory, selectedProducts, onAdd, onQuickCreate }: ProductsGridProps) {
  const [prodSearch, setProdSearch] = useState('')
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [quickNombre, setQuickNombre] = useState('')
  const [quickSaving, setQuickSaving] = useState(false)

  const available = inventory.filter(
    (item) => item.stock > 0 && !selectedProducts.find((p) => p.barcode === item.barcode)
  )
  const filtered = prodSearch.trim()
    ? available.filter(
        (item) =>
          item.nombre.toLowerCase().includes(prodSearch.toLowerCase()) ||
          item.categoria.toLowerCase().includes(prodSearch.toLowerCase())
      )
    : available.slice(0, 60)
  const hiddenCount = !prodSearch.trim() && available.length > 60 ? available.length - 60 : 0

  const handleQuickCreate = async () => {
    if (!quickNombre.trim() || !onQuickCreate) return
    setQuickSaving(true)
    try {
      const newItem = await onQuickCreate(quickNombre.trim())
      if (newItem) {
        onAdd(newItem.barcode)
        setProdSearch('')
        setShowQuickCreate(false)
        setQuickNombre('')
      }
    } finally {
      setQuickSaving(false)
    }
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      <input
        type="text"
        className="form-input"
        placeholder="🔍 Buscar producto por nombre (cables, ratones, auriculares...)"
        value={prodSearch}
        onChange={(e) => { setProdSearch(e.target.value); setShowQuickCreate(false) }}
        style={{ marginBottom: '8px', fontSize: '14px' }}
      />
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>
        Stock disponible — toca para añadir
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px', maxHeight: '220px', overflowY: 'auto', padding: '4px' }}>
        {filtered.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '12px', gridColumn: '1/-1' }}>
            {prodSearch ? `No se encontró "${prodSearch}"` : 'No hay más productos con stock disponible'}
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.barcode}
              onClick={() => onAdd(item.barcode)}
              style={{
                background: 'var(--bg-primary)',
                border: '2px solid var(--border)',
                borderRadius: '8px',
                padding: '10px',
                cursor: 'pointer',
                transition: 'all .15s',
                userSelect: 'none',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-green)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = '' }}
            >
              <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '4px', lineHeight: '1.3' }}>{item.nombre}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>{item.categoria}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: '600' }}>✓ {item.stock} uds</span>
                <span style={{ fontSize: '18px', color: 'var(--accent-green)' }}>+</span>
              </div>
            </div>
          ))
        )}
      </div>
      {hiddenCount > 0 && (
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', textAlign: 'center' }}>
          Busca para ver los {hiddenCount} productos restantes
        </div>
      )}
      {onQuickCreate && (
        <div style={{ marginTop: '10px' }}>
          {!showQuickCreate ? (
            <button
              type="button"
              onClick={() => { setShowQuickCreate(true); setQuickNombre(prodSearch) }}
              style={{ background: 'none', border: '1px dashed var(--accent-blue)', borderRadius: '8px', color: 'var(--accent-blue)', padding: '8px 14px', fontSize: '13px', cursor: 'pointer', width: '100%' }}
            >
              + Añadir producto que no está en la lista...
            </button>
          ) : (
            <div style={{ background: 'rgba(88,166,255,.08)', border: '1px solid var(--accent-blue)', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--accent-blue)', marginBottom: '8px' }}>➕ Crear producto rápido</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Se creará con stock 0 y se añadirá a esta asignación. Recuerda actualizar el stock luego en Inventario.
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nombre del producto (ej: Cable USB-C 2m)"
                  value={quickNombre}
                  onChange={(e) => setQuickNombre(e.target.value)}
                  style={{ flex: 1, fontSize: '14px' }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleQuickCreate() }}
                />
                <button
                  type="button"
                  onClick={handleQuickCreate}
                  disabled={quickSaving || !quickNombre.trim()}
                  className="button button-success"
                  style={{ padding: '10px 14px' }}
                >
                  {quickSaving ? <span className="loading-spinner" /> : '✓'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowQuickCreate(false); setQuickNombre('') }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '20px', padding: '0 4px' }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
