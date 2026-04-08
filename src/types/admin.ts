export interface Admin {
  id: string
  email: string
  activo: boolean
}

export interface Ubicacion {
  id: string
  nombre: string
  activo: boolean
}

export interface Sociedad {
  id: string
  nombre: string
  codigo: string
  pais: string
  activo: boolean
}

export interface Proveedor {
  id: string
  nombre: string
  contacto: string
  email: string
  telefono: string
  activo: boolean
}
