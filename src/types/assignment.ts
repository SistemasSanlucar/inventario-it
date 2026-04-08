export interface AssignmentProduct {
  nombre: string
  barcode?: string
  idEtiqueta?: string
  numSerie?: string
  modelo?: string
  tipo?: string
  cantidad?: number
  esEquipo?: boolean
}

export interface Assignment {
  id: string
  nombreEmpleado: string
  emailEmpleado: string
  departamento: string
  puesto: string
  fechaIncorporacion: string
  productosAsignados: AssignmentProduct[]
  cantidadProductos: number
  firmaEmpleado: string
  tecnicoResponsable: string
  fechaAsignacion: string
  estado: 'Activo' | 'Devuelto' | 'Parcial'
  observaciones: string
  esPrestamo: boolean
}
