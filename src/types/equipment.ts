export type ActivoEstado =
  | 'Almacen'
  | 'Asignado'
  | 'Pendiente'
  | 'Transito'
  | 'Reparacion'
  | 'Extraviado'
  | 'Robado'
  | 'Baja'

export interface Activo {
  id: string
  idEtiqueta: string
  tipo: string
  modelo: string
  estado: ActivoEstado
  ubicacion: string
  numSerie: string
  notas: string
  sociedad: string
  asignadoA: string
  emailAsignadoA: string
  fechaAsignacion: string | null
  transitoDestino: string
  motivoIncidencia: string
  proveedor: string
  numAlbaran: string
  fechaCompra: string | null
  fechaGarantia: string | null
  accesorios: string
  etiquetaImpresa: boolean
}

export interface CatalogoProcessed {
  [tipo: string]: string[]
}

export interface CatalogoTipos {
  [tipo: string]: { llevaEtiqueta: boolean }
}

export interface CatalogoAccesorios {
  [tipoModelo: string]: string
}

export interface CatalogoRawItem {
  id: string
  tipo: string
  modelo: string
  activo: boolean
  llevaEtiqueta: boolean
}
