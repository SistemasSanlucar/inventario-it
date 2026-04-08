import type { InventoryItem } from './inventory'
import type { Activo, CatalogoProcessed, CatalogoTipos, CatalogoAccesorios } from './equipment'
import type { Assignment } from './assignment'
import type { Technician } from './technician'
import type { HistoryEntry } from './history'
import type { Admin, Ubicacion, Sociedad, Proveedor } from './admin'

export interface AuthState {
  user: { name: string; email: string } | null
  isAdmin: boolean
  isTechnician: boolean
  accessDenied: boolean
  loading: boolean
}

export interface AppState {
  // Data
  inventory: InventoryItem[]
  technicians: Technician[]
  history: HistoryEntry[]
  assignments: Assignment[]
  activos: Activo[]
  catalogo: CatalogoProcessed
  catalogoTipos: CatalogoTipos
  catalogoAccesorios: CatalogoAccesorios
  ubicaciones: Ubicacion[]
  ubicacionesAll: Ubicacion[]
  adminsAll: Admin[]
  sociedades: Sociedad[]
  proveedores: Proveedor[]
  // Sync
  lastSync: Date | null
  syncing: boolean
  // UI
  activeTab: string
  modalType: string | null
  selectedItem: any | null
  showConfirm: boolean
  confirmAction: { type: string; item: any } | null
  stockMinimoDefault: number
  tabFilter: any | null
  lang: string
  globalSearch: string
  showGlobalResults: boolean
  deepLinkEquipo: Activo | null
  loading: boolean
}

export interface LoadAllDataResult {
  inventory: InventoryItem[]
  technicians: Technician[]
  history: HistoryEntry[]
  assignments: Assignment[]
  activos: Activo[]
  catalogo: CatalogoProcessed
  catalogoTipos: CatalogoTipos
  catalogoAccesorios: CatalogoAccesorios
  ubicaciones: Ubicacion[]
  ubicacionesAll: Ubicacion[]
  adminsAll: Admin[]
  sociedades: Sociedad[]
  proveedores: Proveedor[]
}
