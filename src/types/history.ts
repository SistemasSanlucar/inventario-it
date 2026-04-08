export interface HistoryEntry {
  id: string
  fecha: string
  tipo: string
  producto: string
  cantidad: number
  ticket: string
  usuario: string
  tecnico: string
  firma?: string | null
  idEtiqueta: string
  motivo: string
}
