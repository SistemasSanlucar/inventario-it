import { GraphAPIClient } from './GraphAPIClient'
import { CONFIG } from '../config'
import { ErrorLog } from './ErrorLog'
import type {
  InventoryItem, Activo, Assignment, Technician, HistoryEntry,
  Ubicacion, Sociedad, Proveedor, Admin,
  CatalogoProcessed, CatalogoTipos, CatalogoAccesorios, CatalogoRawItem,
  LoadAllDataResult, AssignmentProduct,
} from '../types'

function parseBoolean(val: unknown): boolean {
  return val === 'Si' || val === true || val === 'Yes'
}

function mapInventoryItem(item: any): InventoryItem {
  return {
    id: item.sharePointId,
    nombre: item.Nombre || item.Title,
    categoria: item.Categoria,
    barcode: item.CodigoBarras,
    stock: parseInt(item.Stock) || 0,
    stockMinimo: parseInt(item.StockMinimo) || 0,
    ubicacion: item.Ubicacion || '',
    estado: item.Estado || 'Nuevo',
    tier: item.Tier || 'Estándar',
  }
}

function mapActivo(item: any): Activo {
  return {
    id: item.sharePointId,
    idEtiqueta: item.IDEtiqueta || '',
    tipo: item.TipoMaterial || '',
    modelo: item.ModeloMaterial || '',
    estado: item.EstadoActivo || 'Almacen',
    ubicacion: item.UbicacionActivo || '',
    numSerie: item.NumSerie || '',
    notas: item.Notas || '',
    sociedad: item.Sociedad || '',
    asignadoA: item.AsignadoA || '',
    emailAsignadoA: item.EmailAsignadoA || '',
    fechaAsignacion: item.FechaAsignacion || null,
    transitoDestino: item.TransitoDestino || '',
    motivoIncidencia: item.MotivoIncidencia || '',
    proveedor: item.Proveedor || '',
    numAlbaran: item.NumAlbaran || '',
    fechaCompra: item.FechaCompra || null,
    fechaGarantia: item.FechaGarantia || null,
    accesorios: item.Accesorios || '',
    etiquetaImpresa: item.EtiquetaImpresa === true || item.EtiquetaImpresa === 'Yes',
  }
}

function mapAssignment(item: any): Assignment {
  return {
    id: item.sharePointId,
    nombreEmpleado: item.NombreEmpleado,
    emailEmpleado: item.EmailEmpleado,
    departamento: item.Departamento,
    puesto: item.Puesto,
    fechaIncorporacion: item.FechaIncorporacion,
    productosAsignados: JSON.parse(item.ProductosAsignados || '[]'),
    cantidadProductos: parseInt(item.CantidadProductos) || 0,
    firmaEmpleado: item.FirmaEmpleado,
    tecnicoResponsable: item.TecnicoResponsable,
    fechaAsignacion: item.FechaAsignacion,
    estado: item.Estado,
    observaciones: item.Observaciones || '',
    esPrestamo: item.EsPrestamo === 'Si',
  }
}

function mapHistoryEntry(item: any): HistoryEntry {
  return {
    id: item.sharePointId,
    fecha: item.FechaHora || item.Created,
    tipo: item.TipoMovimiento,
    producto: item.Producto,
    cantidad: parseInt(item.Cantidad) || 0,
    ticket: item.Ticket || '',
    usuario: item.Usuario || '',
    tecnico: item.Tecnico || '',
    idEtiqueta: item.IDEtiqueta || '',
    motivo: item.MotivoIncidencia || '',
  }
}

function mapTechnician(item: any): Technician {
  return {
    id: item.sharePointId,
    nombre: item.NombreTecnico || item.Title,
    codigo: item.CodigoTecnico,
    email: item.Email,
    activo: parseBoolean(item.Activo),
  }
}

function processCatalogo(items: any[]): {
  catalogo: CatalogoProcessed
  catalogoTipos: CatalogoTipos
  catalogoAccesorios: CatalogoAccesorios
} {
  const catalogoProcessed: CatalogoProcessed = {}
  const catalogoTipos: CatalogoTipos = {}
  const catalogoAccesorios: CatalogoAccesorios = {}
  items.forEach((item) => {
    const tipo = item.Title
    const modelo = item.Modelo
    const activo = item.Activo !== 'No' && item.Activo !== false
    const llevaEtiqueta =
      item.LlevaEtiqueta === 'Si' ||
      item.LlevaEtiqueta === null ||
      item.LlevaEtiqueta === undefined ||
      item.LlevaEtiqueta === ''
    if (!catalogoTipos[tipo]) catalogoTipos[tipo] = { llevaEtiqueta }
    if (llevaEtiqueta) catalogoTipos[tipo].llevaEtiqueta = true
    if (activo && tipo && modelo) {
      if (!catalogoProcessed[tipo]) catalogoProcessed[tipo] = []
      catalogoProcessed[tipo].push(modelo)
      if (item.Accesorios) catalogoAccesorios[tipo + '|' + modelo] = item.Accesorios
    }
  })
  return { catalogo: catalogoProcessed, catalogoTipos, catalogoAccesorios }
}

export class DataManager {
  graph: GraphAPIClient

  constructor(graphClient: GraphAPIClient) {
    this.graph = graphClient
  }

  async loadAllData(): Promise<LoadAllDataResult> {
    try {
      const [inventario, tecnicos, historial, admins, asignaciones, catalogo, ubicacionesRaw, activosRaw, sociedadesRaw, proveedoresRaw] =
        await Promise.all([
          this.graph.getListItems(CONFIG.sharepoint.lists.inventario),
          this.graph.getListItems(CONFIG.sharepoint.lists.tecnicos),
          this.graph.getListItems(CONFIG.sharepoint.lists.historial),
          this.graph.getListItems(CONFIG.sharepoint.lists.admins),
          this.graph.getListItems(CONFIG.sharepoint.lists.asignaciones).catch(() => []),
          this.graph.getListItems(CONFIG.sharepoint.lists.catalogo).catch(() => []),
          this.graph.getListItems(CONFIG.sharepoint.lists.ubicaciones).catch(() => []),
          this.graph.getListItems(CONFIG.sharepoint.lists.activos).catch(() => []),
          this.graph.getListItems(CONFIG.sharepoint.lists.sociedades).catch(() => []),
          this.graph.getListItems(CONFIG.sharepoint.lists.proveedores).catch(() => []),
        ])

      const { catalogo: catalogoProcessed, catalogoTipos, catalogoAccesorios } = processCatalogo(catalogo)

      return {
        inventory: inventario.map(mapInventoryItem),
        technicians: tecnicos.map(mapTechnician),
        history: historial
          .map(mapHistoryEntry)
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
        assignments: asignaciones
          .map(mapAssignment)
          .sort((a, b) => new Date(b.fechaAsignacion).getTime() - new Date(a.fechaAsignacion).getTime()),
        activos: activosRaw.map(mapActivo),
        sociedades: sociedadesRaw
          .map((item: any) => ({
            id: item.sharePointId,
            nombre: item.Title,
            codigo: (item.Codigo || '').toUpperCase(),
            pais: item.Pais || '',
            activo: parseBoolean(item.Activo),
          } as Sociedad))
          .sort((a: Sociedad, b: Sociedad) => a.nombre.localeCompare(b.nombre)),
        proveedores: proveedoresRaw
          .map((item: any) => ({
            id: item.sharePointId,
            nombre: item.Title,
            contacto: item.Contacto || '',
            email: item.Email || '',
            telefono: item.Telefono || '',
            activo: parseBoolean(item.Activo),
          } as Proveedor))
          .filter((p: Proveedor) => p.activo)
          .sort((a: Proveedor, b: Proveedor) => a.nombre.localeCompare(b.nombre)),
        adminsAll: admins.map((item: any) => ({
          id: item.sharePointId,
          email: item.Email,
          activo: parseBoolean(item.Activo),
        } as Admin)),
        catalogo: catalogoProcessed,
        catalogoTipos,
        catalogoAccesorios,
        ubicaciones: ubicacionesRaw
          .map((item: any) => ({
            id: item.sharePointId,
            nombre: item.Title,
            activo: parseBoolean(item.Activo),
          } as Ubicacion))
          .filter((u: Ubicacion) => u.activo)
          .sort((a: Ubicacion, b: Ubicacion) => a.nombre.localeCompare(b.nombre)),
        ubicacionesAll: ubicacionesRaw.map((item: any) => ({
          id: item.sharePointId,
          nombre: item.Title,
          activo: parseBoolean(item.Activo),
        } as Ubicacion)),
      }
    } catch (error: any) {
      ErrorLog.error('DataManager.loadAllData', error.message || 'Error cargando datos')
      throw error
    }
  }

  // -- Selective refreshes --

  async refreshInventory(): Promise<{ inventory: InventoryItem[] }> {
    const items = await this.graph.getListItems(CONFIG.sharepoint.lists.inventario, true)
    return { inventory: items.map(mapInventoryItem) }
  }

  async refreshActivos(): Promise<{ activos: Activo[] }> {
    const items = await this.graph.getListItems(CONFIG.sharepoint.lists.activos, true)
    return { activos: items.map(mapActivo) }
  }

  async refreshAsignaciones(): Promise<{ assignments: Assignment[] }> {
    const items = await this.graph.getListItems(CONFIG.sharepoint.lists.asignaciones, true)
    return {
      assignments: items
        .map(mapAssignment)
        .sort((a, b) => new Date(b.fechaAsignacion).getTime() - new Date(a.fechaAsignacion).getTime()),
    }
  }

  async refreshHistorial(): Promise<{ history: HistoryEntry[] }> {
    const items = await this.graph.getListItems(CONFIG.sharepoint.lists.historial, true)
    return {
      history: items
        .map(mapHistoryEntry)
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    }
  }

  async refreshCatalogo(): Promise<{
    catalogo: CatalogoProcessed
    catalogoTipos: CatalogoTipos
    catalogoAccesorios: CatalogoAccesorios
  }> {
    const items = await this.graph.getListItems(CONFIG.sharepoint.lists.catalogo, true)
    return processCatalogo(items)
  }

  // -- Inventory CRUD --

  async checkBarcodeExists(barcode: string): Promise<boolean> {
    try {
      const items = await this.graph.getListItems(CONFIG.sharepoint.lists.inventario)
      return items.some((item: any) => item.CodigoBarras === barcode)
    } catch (_) {
      return false
    }
  }

  async createInventoryItem(data: Partial<InventoryItem>): Promise<any> {
    return await this.graph.createListItem(CONFIG.sharepoint.lists.inventario, {
      Title: data.nombre,
      Nombre: data.nombre,
      Categoria: data.categoria,
      CodigoBarras: data.barcode,
      Stock: data.stock,
      StockMinimo: data.stockMinimo,
      Ubicacion: data.ubicacion,
      Estado: data.estado || 'Nuevo',
      Tier: data.tier || 'Estándar',
    })
  }

  async updateInventoryItem(itemId: string, data: Record<string, any>): Promise<void> {
    await this.graph.updateListItem(CONFIG.sharepoint.lists.inventario, itemId, data)
  }

  async deleteInventoryItem(itemId: string): Promise<void> {
    await this.graph.deleteListItem(CONFIG.sharepoint.lists.inventario, itemId)
  }

  // -- History --

  async addToHistory(data: {
    tipo: string
    producto: string
    cantidad: number
    ticket?: string
    usuario?: string
    tecnico?: string
    idEtiqueta?: string
    motivo?: string
  }): Promise<void> {
    await this.graph.createListItem(CONFIG.sharepoint.lists.historial, {
      Title: data.tipo + ' - ' + data.producto,
      TipoMovimiento: data.tipo,
      Producto: data.producto,
      Cantidad: data.cantidad,
      Ticket: data.ticket || '',
      Usuario: data.usuario || '',
      Tecnico: data.tecnico || '',
      FechaHora: new Date().toISOString(),
      IDEtiqueta: data.idEtiqueta || '',
      MotivoIncidencia: data.motivo || '',
    })
  }

  async deleteHistoryItem(itemId: string): Promise<void> {
    await this.graph.deleteListItem(CONFIG.sharepoint.lists.historial, itemId)
  }

  // -- Ubicaciones CRUD --

  async createUbicacion(nombre: string): Promise<any> {
    return await this.graph.createListItem(CONFIG.sharepoint.lists.ubicaciones, { Title: nombre, Activo: 'Si' })
  }

  async updateUbicacion(itemId: string, nombre: string): Promise<void> {
    await this.graph.updateListItem(CONFIG.sharepoint.lists.ubicaciones, itemId, { Title: nombre })
  }

  async toggleUbicacion(itemId: string, activo: boolean): Promise<void> {
    await this.graph.updateListItem(CONFIG.sharepoint.lists.ubicaciones, itemId, { Activo: activo ? 'No' : 'Si' })
  }

  async deleteUbicacion(itemId: string): Promise<void> {
    await this.graph.deleteListItem(CONFIG.sharepoint.lists.ubicaciones, itemId)
  }

  // -- Catalogo CRUD --

  async deleteCatalogItem(itemId: string): Promise<void> {
    await this.graph.deleteListItem(CONFIG.sharepoint.lists.catalogo, itemId)
  }

  async getCatalogoRaw(): Promise<CatalogoRawItem[]> {
    const items = await this.graph.getListItems(CONFIG.sharepoint.lists.catalogo)
    return items.map((item: any) => ({
      id: item.sharePointId,
      tipo: item.Title,
      modelo: item.Modelo,
      activo: item.Activo !== 'No' && item.Activo !== false,
      llevaEtiqueta:
        item.LlevaEtiqueta === 'Si' ||
        item.LlevaEtiqueta === null ||
        item.LlevaEtiqueta === undefined ||
        item.LlevaEtiqueta === '',
    }))
  }

  async addToCatalog(tipo: string, modelo: string, llevaEtiqueta: boolean): Promise<any> {
    const fields: Record<string, any> = {
      Title: tipo,
      Activo: 'Si',
      LlevaEtiqueta: llevaEtiqueta ? 'Si' : 'No',
    }
    if (modelo && modelo.trim()) fields.Modelo = modelo.trim()
    return await this.graph.createListItem(CONFIG.sharepoint.lists.catalogo, fields)
  }

  async updateCatalogLlevaEtiqueta(itemId: string, llevaEtiqueta: boolean): Promise<void> {
    await this.graph.updateListItem(CONFIG.sharepoint.lists.catalogo, itemId, {
      LlevaEtiqueta: llevaEtiqueta ? 'Si' : 'No',
    })
  }

  async updateCatalogAccesorios(itemId: string, accesorios: string): Promise<void> {
    await this.graph.updateListItem(CONFIG.sharepoint.lists.catalogo, itemId, { Accesorios: accesorios })
  }

  // -- Admins CRUD --

  async createAdmin(email: string): Promise<any> {
    return await this.graph.createListItem(CONFIG.sharepoint.lists.admins, {
      Title: email,
      Email: email,
      Activo: 'Si',
    })
  }

  async toggleAdmin(itemId: string, activo: boolean): Promise<void> {
    await this.graph.updateListItem(CONFIG.sharepoint.lists.admins, itemId, { Activo: activo ? 'No' : 'Si' })
  }

  async deleteAdmin(itemId: string): Promise<void> {
    await this.graph.deleteListItem(CONFIG.sharepoint.lists.admins, itemId)
  }

  // -- Technicians --

  async createTechnician(data: { nombre: string; codigo: string; email: string }): Promise<any> {
    try {
      return await this.graph.createListItem(CONFIG.sharepoint.lists.tecnicos, {
        Title: data.nombre,
        NombreTecnico: data.nombre,
        CodigoTecnico: data.codigo,
        Email: data.email,
        Activo: true,
      })
    } catch (e: any) {
      if (e.message && e.message.includes('General exception')) {
        return await this.graph.createListItem(CONFIG.sharepoint.lists.tecnicos, {
          Title: data.nombre,
          NombreTecnico: data.nombre,
          CodigoTecnico: data.codigo,
          Email: data.email,
          Activo: 'Si',
        })
      }
      throw e
    }
  }

  async toggleTechnicianStatus(itemId: string, currentStatus: boolean): Promise<void> {
    try {
      await this.graph.updateListItem(CONFIG.sharepoint.lists.tecnicos, itemId, { Activo: !currentStatus })
    } catch (_) {
      await this.graph.updateListItem(CONFIG.sharepoint.lists.tecnicos, itemId, {
        Activo: currentStatus ? 'No' : 'Si',
      })
    }
  }

  // -- Activos (equipment) --

  async getNextEtiquetaId(codigoSociedad: string): Promise<string> {
    const anyo = new Date().getFullYear().toString().slice(-2)
    const codigo = (codigoSociedad || 'SLF').toUpperCase()
    const prefix = codigo + '-' + anyo + '-'

    try {
      let maxNum = 0
      let endpoint: string | null =
        '/sites/' +
        CONFIG.sharepoint.sitePath +
        ':/lists/' +
        CONFIG.sharepoint.lists.activos +
        '/items?$select=fields/IDEtiqueta&$expand=fields&$top=500'
      while (endpoint) {
        const result = await this.graph.request(endpoint)
        for (const item of result.value || []) {
          const id = (item.fields && item.fields.IDEtiqueta) || ''
          if (id.startsWith(prefix)) {
            const numStr = id.slice(prefix.length)
            const num = parseInt(numStr, 10)
            if (!isNaN(num) && num > maxNum) maxNum = num
          }
        }
        endpoint = result['@odata.nextLink']
          ? result['@odata.nextLink'].replace('https://graph.microsoft.com/v1.0', '')
          : null
      }
      const nextNum = (maxNum + 1).toString().padStart(5, '0')
      console.log('[ID] Próximo ID:', prefix + nextNum, '(máximo actual:', maxNum + ')')
      return prefix + nextNum
    } catch (e: any) {
      console.warn('[ID] Error obteniendo correlativo, usando timestamp:', e.message)
      const fallback = Date.now().toString().slice(-5).padStart(5, '0')
      return prefix + fallback
    }
  }

  async createActivo(data: {
    idEtiqueta: string
    tipo: string
    modelo: string
    estado?: string
    ubicacion?: string
    numSerie?: string
    notas?: string
    sociedad?: string
  }): Promise<any> {
    return await this.graph.createListItem(CONFIG.sharepoint.lists.activos, {
      Title: data.idEtiqueta,
      IDEtiqueta: data.idEtiqueta,
      TipoMaterial: data.tipo,
      ModeloMaterial: data.modelo,
      EstadoActivo: data.estado || 'Pendiente',
      UbicacionActivo: data.ubicacion || '',
      NumSerie: data.numSerie || '',
      Notas: data.notas || '',
      Sociedad: data.sociedad || '',
    })
  }

  async cambiarEstadoActivo(
    itemId: string,
    estado: string,
    extra?: {
      ubicacion?: string
      asignadoA?: string
      emailAsignadoA?: string
      fechaAsignacion?: string | null
      transitoDestino?: string
      fechaTransito?: string
      motivoIncidencia?: string
    }
  ): Promise<void> {
    const fields: Record<string, any> = { EstadoActivo: estado }
    const ex = extra || {}
    if (ex.ubicacion !== undefined) fields.UbicacionActivo = ex.ubicacion
    if (ex.asignadoA !== undefined) fields.AsignadoA = ex.asignadoA
    if (ex.emailAsignadoA !== undefined) fields.EmailAsignadoA = ex.emailAsignadoA
    if (ex.fechaAsignacion !== undefined) fields.FechaAsignacion = ex.fechaAsignacion
    if (ex.transitoDestino !== undefined) fields.TransitoDestino = ex.transitoDestino
    if (ex.fechaTransito !== undefined) fields.FechaTransito = ex.fechaTransito
    if (ex.motivoIncidencia !== undefined) fields.MotivoIncidencia = ex.motivoIncidencia
    if (estado === 'Almacen') {
      fields.AsignadoA = ''
      fields.EmailAsignadoA = ''
      fields.FechaAsignacion = null
      fields.TransitoDestino = ''
    }
    await this.graph.updateListItem(CONFIG.sharepoint.lists.activos, itemId, fields)
  }

  async updateActivoEstado(itemId: string, estado: string, ubicacion?: string): Promise<void> {
    await this.graph.updateListItem(CONFIG.sharepoint.lists.activos, itemId, {
      EstadoActivo: estado,
      UbicacionActivo: ubicacion || '',
    })
  }

  async updateActivoNS(itemId: string, numSerie: string): Promise<void> {
    await this.graph.updateListItem(CONFIG.sharepoint.lists.activos, itemId, {
      NumSerie: numSerie,
      EstadoActivo: 'Almacen',
    })
  }

  async updateActivoAccesorios(itemId: string, accesorios: string): Promise<void> {
    await this.graph.updateListItem(CONFIG.sharepoint.lists.activos, itemId, { Accesorios: accesorios })
  }

  async deleteActivo(itemId: string): Promise<void> {
    await this.graph.deleteListItem(CONFIG.sharepoint.lists.activos, itemId)
  }

  // -- Sociedades CRUD --

  async createSociedad(data: { nombre: string; codigo: string; pais: string }): Promise<any> {
    const codigo = data.codigo.toUpperCase().slice(0, 3)
    return await this.graph.createListItem(CONFIG.sharepoint.lists.sociedades, {
      Title: data.nombre,
      Codigo: codigo,
      Pais: data.pais,
      Activo: 'Si',
    })
  }

  async updateSociedad(itemId: string, data: { nombre?: string; codigo?: string; pais?: string }): Promise<void> {
    const fields: Record<string, any> = {}
    if (data.nombre !== undefined) fields.Title = data.nombre
    if (data.codigo !== undefined) fields.Codigo = data.codigo.toUpperCase().slice(0, 3)
    if (data.pais !== undefined) fields.Pais = data.pais
    await this.graph.updateListItem(CONFIG.sharepoint.lists.sociedades, itemId, fields)
  }

  async toggleSociedad(itemId: string, activo: boolean): Promise<void> {
    await this.graph.updateListItem(CONFIG.sharepoint.lists.sociedades, itemId, { Activo: activo ? 'No' : 'Si' })
  }

  async deleteSociedad(itemId: string): Promise<void> {
    await this.graph.deleteListItem(CONFIG.sharepoint.lists.sociedades, itemId)
  }

  // -- Proveedores CRUD --

  async createProveedor(data: {
    nombre: string
    contacto?: string
    email?: string
    telefono?: string
  }): Promise<any> {
    return await this.graph.createListItem(CONFIG.sharepoint.lists.proveedores, {
      Title: data.nombre,
      Contacto: data.contacto || '',
      Email: data.email || '',
      Telefono: data.telefono || '',
      Activo: true,
    })
  }

  async updateProveedor(
    itemId: string,
    data: { nombre: string; contacto?: string; email?: string; telefono?: string }
  ): Promise<void> {
    await this.graph.updateListItem(CONFIG.sharepoint.lists.proveedores, itemId, {
      Title: data.nombre,
      Contacto: data.contacto || '',
      Email: data.email || '',
      Telefono: data.telefono || '',
    })
  }

  async toggleProveedor(itemId: string, activo: boolean): Promise<void> {
    await this.graph.updateListItem(CONFIG.sharepoint.lists.proveedores, itemId, { Activo: !activo })
  }

  async deleteProveedor(itemId: string): Promise<void> {
    await this.graph.deleteListItem(CONFIG.sharepoint.lists.proveedores, itemId)
  }

  // -- Assignments --

  async createAssignment(data: {
    nombreEmpleado: string
    emailEmpleado: string
    departamento: string
    puesto: string
    fechaIncorporacion: string
    productosAsignados: AssignmentProduct[]
    equiposAsignados?: AssignmentProduct[]
    firmaEmpleado: string
    tecnicoResponsable: string
    observaciones?: string
    esPrestamo: boolean
  }): Promise<any> {
    const titulo = data.esPrestamo
      ? 'Prestamo - ' + data.nombreEmpleado
      : 'Asignacion - ' + data.nombreEmpleado + ' - ' + new Date().toLocaleDateString('es-ES')
    const todosProductos = (data.productosAsignados || []).concat(data.equiposAsignados || [])
    const detalleProductos = todosProductos
      .map((p, i) => i + 1 + '. ' + p.nombre + ' (Cod: ' + (p.barcode || p.idEtiqueta || '') + ')')
      .join('\n')

    const tipoAsig = data.esPrestamo ? 'PRÉSTAMO' : 'ASIGNACIÓN'
    const colorTipo = data.esPrestamo ? '#f97316' : '#1e5c3a'
    const filasHTML = todosProductos
      .map((p, i) => {
        const esEquipo = !!p.idEtiqueta || p.esEquipo
        const icono = esEquipo ? '💻' : '📦'
        const idStr = p.idEtiqueta
          ? '<span style="font-family:monospace;font-size:12px;background:#e8f4ed;color:#1e5c3a;padding:2px 6px;border-radius:4px;">' +
            p.idEtiqueta +
            '</span>'
          : '—'
        const nsStr = p.numSerie ? p.numSerie : '—'
        const modeloStr = p.modelo ? p.modelo : '—'
        const bg = i % 2 === 0 ? '#ffffff' : '#f8f9fa'
        return (
          '<tr style="background:' + bg + ';">' +
          '<td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;">' + (i + 1) + '</td>' +
          '<td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;">' + icono + ' ' + (p.nombre || p.tipo || '—') + '</td>' +
          '<td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;">' + modeloStr + '</td>' +
          '<td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;">' + idStr + '</td>' +
          '<td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;font-family:monospace;">' + nsStr + '</td>' +
          '</tr>'
        )
      })
      .join('')

    const detalleProductosHTML =
      '<div style="margin:0;">' +
      '<div style="background:' + colorTipo + ';color:white;padding:10px 15px;border-radius:8px 8px 0 0;font-size:13px;font-weight:700;">' +
      '📦 DETALLE DE MATERIAL EN ' + tipoAsig + ' — ' + todosProductos.length + ' artículo(s)' +
      '</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:13px;">' +
      '<thead><tr style="background:#f0f0f0;">' +
      '<th style="padding:8px 12px;text-align:left;font-size:12px;color:#666;border-bottom:2px solid #ddd;width:30px;">#</th>' +
      '<th style="padding:8px 12px;text-align:left;font-size:12px;color:#666;border-bottom:2px solid #ddd;">Producto</th>' +
      '<th style="padding:8px 12px;text-align:left;font-size:12px;color:#666;border-bottom:2px solid #ddd;">Modelo</th>' +
      '<th style="padding:8px 12px;text-align:left;font-size:12px;color:#666;border-bottom:2px solid #ddd;">ID Etiqueta</th>' +
      '<th style="padding:8px 12px;text-align:left;font-size:12px;color:#666;border-bottom:2px solid #ddd;">N/S</th>' +
      '</tr></thead>' +
      '<tbody>' + filasHTML + '</tbody>' +
      '</table></div>'

    return await this.graph.createListItem(CONFIG.sharepoint.lists.asignaciones, {
      Title: titulo,
      NombreEmpleado: data.nombreEmpleado,
      EmailEmpleado: data.emailEmpleado,
      Departamento: data.departamento,
      Puesto: data.puesto,
      FechaIncorporacion: data.fechaIncorporacion,
      ProductosAsignados: JSON.stringify(todosProductos),
      CantidadProductos: todosProductos.length,
      FirmaEmpleado: data.firmaEmpleado,
      TecnicoResponsable: data.tecnicoResponsable,
      FechaAsignacion: new Date().toISOString(),
      Estado: 'Activo',
      Observaciones: data.observaciones || '',
      EsPrestamo: data.esPrestamo ? 'Si' : 'No',
      DetalleProductos: detalleProductos,
      DetalleProductosHTML: detalleProductosHTML,
      Foto1: '',
      Foto2: '',
      Foto3: '',
    })
  }

  async updateAssignmentStatus(itemId: string, nuevoEstado: string): Promise<void> {
    await this.graph.updateListItem(CONFIG.sharepoint.lists.asignaciones, itemId, { Estado: nuevoEstado })
  }

  async deleteAssignment(itemId: string): Promise<void> {
    await this.graph.deleteListItem(CONFIG.sharepoint.lists.asignaciones, itemId)
  }

  async searchUsers(searchTerm: string): Promise<any[]> {
    return await this.graph.searchUsers(searchTerm)
  }

  async returnMaterial(
    assignmentId: string,
    returnedProducts: AssignmentProduct[],
    allProducts: AssignmentProduct[],
    observaciones: string,
    tecnico: string,
    inventoryData: InventoryItem[],
    activosData: Activo[]
  ): Promise<string> {
    const fullyReturned = returnedProducts.length === allProducts.length
    const newState = fullyReturned ? 'Devuelto' : 'Parcial'
    const returnedKeys = new Set(returnedProducts.map((p) => p.idEtiqueta || p.barcode))
    const remainingProducts = fullyReturned
      ? []
      : allProducts.filter((p) => !returnedKeys.has(p.idEtiqueta || p.barcode))

    const updateFields: Record<string, any> = {
      Estado: newState,
      Observaciones: observaciones,
      ProductosAsignados: JSON.stringify(remainingProducts),
      CantidadProductos: remainingProducts.length,
    }

    if (!fullyReturned && remainingProducts.length > 0) {
      const filasHTML = remainingProducts
        .map((p, i) => {
          const esEquipo = !!p.idEtiqueta || p.esEquipo
          const idStr = p.idEtiqueta
            ? '<span style="font-family:monospace;font-size:12px;background:#e8f4ed;color:#1e5c3a;padding:2px 6px;border-radius:4px;">' +
              p.idEtiqueta +
              '</span>'
            : '—'
          const bg = i % 2 === 0 ? '#ffffff' : '#f8f9fa'
          return (
            '<tr style="background:' + bg + ';"><td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;">' + (i + 1) + '</td>' +
            '<td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;">' + (esEquipo ? '💻' : '📦') + ' ' + (p.nombre || p.tipo || '—') + '</td>' +
            '<td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;">' + (p.modelo || '—') + '</td>' +
            '<td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;">' + idStr + '</td>' +
            '<td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;font-family:monospace;">' + (p.numSerie || '—') + '</td></tr>'
          )
        })
        .join('')
      updateFields.DetalleProductosHTML =
        '<div style="margin:0;"><div style="background:#f97316;color:white;padding:10px 15px;border-radius:8px 8px 0 0;font-size:13px;font-weight:700;">📦 PENDIENTE DEVOLUCIÓN — ' +
        remainingProducts.length +
        ' artículo(s)</div><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#f0f0f0;"><th style="padding:8px 12px;text-align:left;font-size:12px;color:#666;border-bottom:2px solid #ddd;width:30px;">#</th><th style="padding:8px 12px;text-align:left;font-size:12px;color:#666;border-bottom:2px solid #ddd;">Producto</th><th style="padding:8px 12px;text-align:left;font-size:12px;color:#666;border-bottom:2px solid #ddd;">Modelo</th><th style="padding:8px 12px;text-align:left;font-size:12px;color:#666;border-bottom:2px solid #ddd;">ID Etiqueta</th><th style="padding:8px 12px;text-align:left;font-size:12px;color:#666;border-bottom:2px solid #ddd;">N/S</th></tr></thead><tbody>' +
        filasHTML +
        '</tbody></table></div>'
    }

    await this.graph.updateListItem(CONFIG.sharepoint.lists.asignaciones, assignmentId, updateFields)

    // Group fungible products by barcode to sum quantities
    const fungibleMap: Record<string, { prod: AssignmentProduct; cantidad: number }> = {}
    for (const prod of returnedProducts) {
      if (prod.esEquipo) {
        const activo = (activosData || []).find((a) => a.idEtiqueta === prod.idEtiqueta)
        if (activo) await this.cambiarEstadoActivo(activo.id, 'Almacen', {})
        await this.addToHistory({
          tipo: 'Devolucion',
          producto: prod.nombre,
          cantidad: 1,
          usuario: '',
          tecnico,
          idEtiqueta: prod.idEtiqueta || '',
        })
      } else {
        const key = prod.barcode || prod.nombre
        if (!fungibleMap[key]) fungibleMap[key] = { prod, cantidad: 0 }
        fungibleMap[key].cantidad += parseInt(String(prod.cantidad)) || 1
      }
    }

    for (const key of Object.keys(fungibleMap)) {
      const { prod, cantidad } = fungibleMap[key]
      const inventoryItem = (inventoryData || []).find((i) => i.barcode === prod.barcode)
      if (inventoryItem) {
        await this.graph.updateListItem(CONFIG.sharepoint.lists.inventario, inventoryItem.id, {
          Stock: (inventoryItem.stock || 0) + cantidad,
        })
      }
      await this.addToHistory({ tipo: 'Devolucion', producto: prod.nombre, cantidad, usuario: '', tecnico })
    }

    return newState
  }

  async findProductByBarcode(barcode: string): Promise<InventoryItem | null> {
    const items = await this.graph.getListItems(CONFIG.sharepoint.lists.inventario)
    const item = items.find((i: any) => i.CodigoBarras === barcode)
    if (item) {
      return {
        id: item.sharePointId,
        nombre: item.Nombre || item.Title,
        stock: parseInt(item.Stock) || 0,
        barcode: item.CodigoBarras,
        categoria: item.Categoria || '',
        stockMinimo: parseInt(item.StockMinimo) || 0,
        ubicacion: item.Ubicacion || '',
        estado: item.Estado || 'Nuevo',
        tier: item.Tier || 'Estándar',
      }
    }
    return null
  }
}
