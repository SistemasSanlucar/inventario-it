import * as XLSX from 'xlsx'
import type { AppState } from '../types/app'

export function exportToCSV(data: Record<string, any>[], filename: string, showToast: (msg: string, type: string) => void): void {
  if (!data || data.length === 0) {
    showToast('No hay datos para exportar', 'warning')
    return
  }
  const headers = Object.keys(data[0])
  const csvRows = [headers.join(',')]
  data.forEach((row) => {
    const values = headers.map((field) => {
      let value = String(row[field] || '')
      if (value.includes(',') || value.includes('"')) value = '"' + value.replace(/"/g, '""') + '"'
      return value
    })
    csvRows.push(values.join(','))
  })
  const blob = new Blob(['\ufeff' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename + '_' + new Date().toISOString().split('T')[0] + '.csv'
  link.click()
  showToast('Archivo exportado correctamente', 'success')
}

export function exportAuditoria(
  state: Pick<AppState, 'activos' | 'inventory' | 'history' | 'assignments' | 'technicians'>,
  opts: { sociedad?: string; desde?: string; hasta?: string },
  showToast: (msg: string, type: string) => void
): void {
  const { sociedad, desde, hasta } = opts || {}
  const wb = XLSX.utils.book_new()
  const fechaHoy = new Date().toISOString().split('T')[0]
  const filtroSoc = (v: string | undefined) => !sociedad || !v || v === sociedad
  const filtroFecha = (f: string | undefined) => {
    if (!f) return true
    const d = new Date(f)
    if (desde && d < new Date(desde)) return false
    if (hasta && d > new Date(hasta + 'T23:59:59')) return false
    return true
  }

  // Sheet 1: Equipos
  const equiposRows = (state.activos || [])
    .filter((a) => filtroSoc(a.sociedad))
    .map((a) => ({
      'ID Etiqueta': a.idEtiqueta || '',
      Tipo: a.tipo || '',
      Modelo: a.modelo || '',
      'Nº Serie': a.numSerie || '',
      Estado: a.estado || '',
      Ubicación: a.ubicacion || '',
      Sociedad: a.sociedad || '',
      'Asignado A': a.asignadoA || '',
      'Email Asignado': a.emailAsignadoA || '',
      'Fecha Asignación': a.fechaAsignacion ? new Date(a.fechaAsignacion).toLocaleDateString('es-ES') : '',
      Proveedor: a.proveedor || '',
      'Nº Albarán': a.numAlbaran || '',
      'Fecha Compra': a.fechaCompra ? new Date(a.fechaCompra).toLocaleDateString('es-ES') : '',
      'Garantía hasta': a.fechaGarantia ? new Date(a.fechaGarantia).toLocaleDateString('es-ES') : '',
      Notas: a.notas || '',
    }))
  const wsEquipos = XLSX.utils.json_to_sheet(
    equiposRows.length ? equiposRows : [{ 'Sin datos': 'No hay equipos con estos filtros' }]
  )
  wsEquipos['!cols'] = [14, 14, 18, 16, 12, 16, 10, 20, 26, 16, 16, 14, 13, 14, 30].map((w) => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, wsEquipos, 'Equipos')

  // Sheet 2: Inventario fungible
  const invRows = (state.inventory || []).map((i) => ({
    Nombre: i.nombre || '',
    Categoría: i.categoria || '',
    'Cód. Barras': i.barcode || '',
    Stock: i.stock || 0,
    'Stock Mínimo': i.stockMinimo || 0,
    Estado: i.stock === 0 ? 'SIN STOCK' : i.stock <= i.stockMinimo ? 'BAJO' : 'OK',
    Ubicación: i.ubicacion || '',
  }))
  const wsInv = XLSX.utils.json_to_sheet(invRows.length ? invRows : [{ 'Sin datos': '' }])
  wsInv['!cols'] = [30, 16, 14, 8, 12, 10, 16].map((w) => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, wsInv, 'Inventario')

  // Sheet 3: Historial
  const histRows = (state.history || [])
    .filter((h) => filtroFecha(h.fecha))
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .map((h) => ({
      Fecha: h.fecha ? new Date(h.fecha).toLocaleDateString('es-ES') : '',
      Hora: h.fecha ? new Date(h.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '',
      Tipo: h.tipo || '',
      Producto: h.producto || '',
      Cantidad: h.cantidad || '',
      Técnico: h.tecnico || '',
      Usuario: h.usuario || '',
      Ticket: h.ticket || '',
      'ID Equipo': h.idEtiqueta || '',
    }))
  const wsHist = XLSX.utils.json_to_sheet(
    histRows.length ? histRows : [{ 'Sin datos': 'No hay movimientos en este período' }]
  )
  wsHist['!cols'] = [11, 7, 12, 28, 8, 20, 20, 12, 16].map((w) => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, wsHist, 'Historial')

  // Sheet 4: Asignaciones activas
  const asigRows = (state.assignments || [])
    .filter((a) => a.estado === 'Activo')
    .map((a) => ({
      Empleado: a.nombreEmpleado || '',
      Email: a.emailEmpleado || '',
      Departamento: a.departamento || '',
      Puesto: a.puesto || '',
      Tipo: a.esPrestamo ? 'Préstamo' : 'Asignación',
      Estado: a.estado || '',
      Fecha: a.fechaAsignacion ? new Date(a.fechaAsignacion).toLocaleDateString('es-ES') : '',
      Técnico: a.tecnicoResponsable || '',
      Observaciones: a.observaciones || '',
    }))
  const wsAsig = XLSX.utils.json_to_sheet(
    asigRows.length ? asigRows : [{ 'Sin datos': 'No hay asignaciones activas' }]
  )
  wsAsig['!cols'] = [24, 28, 18, 18, 10, 10, 12, 20, 24].map((w) => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, wsAsig, 'Asignaciones')

  // Sheet 5: Resumen ejecutivo
  const totalEquipos = equiposRows.length
  const asignados = equiposRows.filter((r) => r.Estado === 'Asignado').length
  const almacen = equiposRows.filter((r) => r.Estado === 'Almacen').length
  const resumenData = [
    { Concepto: 'RESUMEN EJECUTIVO IT', Valor: '', Detalle: 'Generado: ' + fechaHoy },
    { Concepto: '', Valor: '', Detalle: '' },
    { Concepto: '── EQUIPOS ──', Valor: '', Detalle: '' },
    { Concepto: 'Total equipos etiquetados', Valor: totalEquipos, Detalle: '' },
    { Concepto: 'Asignados a empleados', Valor: asignados, Detalle: Math.round((asignados / (totalEquipos || 1)) * 100) + '%' },
    { Concepto: 'En almacén', Valor: almacen, Detalle: '' },
    { Concepto: 'Extraviados / Robados', Valor: equiposRows.filter((r) => r.Estado === 'Extraviado' || r.Estado === 'Robado').length, Detalle: '' },
    { Concepto: '', Valor: '', Detalle: '' },
    { Concepto: '── INVENTARIO ──', Valor: '', Detalle: '' },
    { Concepto: 'Referencias de material', Valor: invRows.length, Detalle: '' },
    { Concepto: 'Total unidades en stock', Valor: invRows.reduce((s, i) => s + ((i.Stock as number) || 0), 0), Detalle: '' },
    { Concepto: 'Productos sin stock', Valor: invRows.filter((i) => i.Estado === 'SIN STOCK').length, Detalle: '' },
    { Concepto: 'Productos con stock bajo', Valor: invRows.filter((i) => i.Estado === 'BAJO').length, Detalle: '' },
    { Concepto: '', Valor: '', Detalle: '' },
    { Concepto: '── ACTIVIDAD ──', Valor: '', Detalle: '' },
    { Concepto: 'Movimientos en período', Valor: histRows.length, Detalle: (desde || 'inicio') + ' → ' + (hasta || 'hoy') },
    { Concepto: 'Asignaciones activas', Valor: asigRows.length, Detalle: '' },
    { Concepto: 'Técnicos activos', Valor: (state.technicians || []).filter((t) => t.activo).length, Detalle: '' },
  ]
  const wsResumen = XLSX.utils.json_to_sheet(resumenData)
  wsResumen['!cols'] = [{ wch: 32 }, { wch: 10 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

  const filename = 'Auditoria_IT_' + (sociedad ? sociedad + '_' : '') + fechaHoy + '.xlsx'
  XLSX.writeFile(wb, filename)
  showToast('Auditoría exportada — ' + filename, 'success')
}
