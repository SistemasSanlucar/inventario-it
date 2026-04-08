export interface InventoryItem {
  id: string
  nombre: string
  categoria: string
  barcode: string
  stock: number
  stockMinimo: number
  ubicacion: string
  estado: 'Nuevo' | 'Usado'
  tier: 'Estándar' | 'Premium'
}
