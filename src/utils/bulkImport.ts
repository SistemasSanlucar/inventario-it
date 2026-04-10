import * as XLSX from 'xlsx'
import type { AppState } from '../types/app'

// ── Types ──

export interface ImportEquipoRow {
  tipo: string
  modelo: string
  numSerie: string
  sociedad: string
  ubicacion: string
  proveedor: string
  numAlbaran: string
  fechaCompra: string
  row: number
  errors: string[]
}

export interface ImportInventarioRow {
  nombre: string
  categoria: string
  stock: number
  stockMinimo: number
  ubicacion: string
  estado: string
  tier: string
  row: number
  errors: string[]
}

export interface ImportValidationResult {
  equipos: ImportEquipoRow[]
  inventario: ImportInventarioRow[]
  equiposValid: ImportEquipoRow[]
  inventarioValid: ImportInventarioRow[]
  totalErrors: number
}

// ── Helpers for Data Validation ──

interface DVEntry {
  type: string
  operator: string
  formula1: string
  showErrorMessage: boolean
  errorTitle: string
  error: string
  sqref?: string
}

/** Build a SheetJS-compatible data validation formula referencing a column in the hidden Listas sheet */
function listValidation(colLetter: string, count: number): DVEntry {
  return {
    type: 'list',
    operator: 'equal',
    formula1: 'Listas!$' + colLetter + '$2:$' + colLetter + '$' + (count + 1),
    showErrorMessage: true,
    errorTitle: 'Valor no válido',
    error: 'Selecciona un valor de la lista desplegable.',
  }
}

function applyValidationToRange(ws: XLSX.WorkSheet, col: number, startRow: number, endRow: number, dv: DVEntry) {
  if (!(ws as any)['!dataValidations']) (ws as any)['!dataValidations'] = []
  const colLetter = XLSX.utils.encode_col(col)
  const range = colLetter + startRow + ':' + colLetter + endRow
  ;((ws as any)['!dataValidations'] as DVEntry[]).push({ ...dv, sqref: range })
}

function setCell(ws: XLSX.WorkSheet, col: number, row: number, value: string | number, style?: Record<string, any>) {
  const ref = XLSX.utils.encode_cell({ c: col, r: row })
  ws[ref] = { v: value, t: typeof value === 'number' ? 'n' : 's', ...style }
}

function setRange(ws: XLSX.WorkSheet, cols: number, rows: number) {
  ws['!ref'] = XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: cols - 1, r: rows - 1 } })
}

// ── Template generation ──

export function generateImportTemplate(state: AppState): void {
  const wb = XLSX.utils.book_new()

  // Gather catalog values
  const tipos = Object.keys(state.catalogo || {})
  const allModelos: string[] = []
  for (const tipo of tipos) {
    for (const modelo of (state.catalogo[tipo] || [])) {
      allModelos.push(modelo)
    }
  }
  const sociedades = (state.sociedades || []).filter((s) => s.activo).map((s) => s.nombre)
  const ubicaciones = (state.ubicaciones || []).filter((u) => u.activo).map((u) => u.nombre)
  const estados = ['Nuevo', 'Usado']
  const tiers = ['Estándar', 'Premium']

  const EXAMPLE_ROW = 1  // 0-indexed (row 2 in Excel)
  const DATA_START = 2   // 0-indexed (row 3 in Excel)
  const TOTAL_ROWS = DATA_START + 50  // 50 empty rows after example

  // ────────────────────────────────────────────────
  // Sheet 1: Inventario fungible
  // ────────────────────────────────────────────────
  const invHeaders = ['nombre', 'categoria', 'stock', 'stockMinimo', 'ubicacion', 'estado', 'tier']
  const invExample = ['Cable HDMI 2m', tipos[0] || 'Cable', 10, 2, ubicaciones[0] || 'Almacén IT', 'Nuevo', 'Estándar']

  const wsInv = XLSX.utils.aoa_to_sheet([invHeaders])
  // Write example row
  invExample.forEach((val, col) => setCell(wsInv, col, EXAMPLE_ROW, val))
  // Extend range to include 50 empty rows
  setRange(wsInv, invHeaders.length, TOTAL_ROWS)
  wsInv['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 12 }, { wch: 12 }]

  // Data validations: categoria (col B), ubicacion (col E), estado (col F), tier (col G)
  // References to Listas sheet: A=tipos, B=sociedades, C=ubicaciones, D=estados, E=tiers, F=modelos
  if (tipos.length > 0) applyValidationToRange(wsInv, 1, EXAMPLE_ROW + 1, TOTAL_ROWS, listValidation('A', tipos.length))
  if (ubicaciones.length > 0) applyValidationToRange(wsInv, 4, EXAMPLE_ROW + 1, TOTAL_ROWS, listValidation('C', ubicaciones.length))
  applyValidationToRange(wsInv, 5, EXAMPLE_ROW + 1, TOTAL_ROWS, listValidation('D', estados.length))
  applyValidationToRange(wsInv, 6, EXAMPLE_ROW + 1, TOTAL_ROWS, listValidation('E', tiers.length))

  XLSX.utils.book_append_sheet(wb, wsInv, 'Inventario fungible')

  // ────────────────────────────────────────────────
  // Sheet 2: Equipos
  // ────────────────────────────────────────────────
  const eqHeaders = ['tipo', 'modelo', 'numSerie', 'sociedad', 'ubicacion', 'proveedor', 'numAlbaran', 'fechaCompra']
  const eqExample = [tipos[0] || 'Portátil', allModelos[0] || 'HP EliteBook 840 G10', 'ABC123456', sociedades[0] || 'Sanlúcar', ubicaciones[0] || 'Almacén IT', '', '', '2026-01-15']

  const wsEq = XLSX.utils.aoa_to_sheet([eqHeaders])
  eqExample.forEach((val, col) => setCell(wsEq, col, EXAMPLE_ROW, val))
  setRange(wsEq, eqHeaders.length, TOTAL_ROWS)
  wsEq['!cols'] = [{ wch: 18 }, { wch: 30 }, { wch: 22 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 16 }]

  // Data validations: tipo (col A), modelo (col B), sociedad (col D), ubicacion (col E)
  if (tipos.length > 0) applyValidationToRange(wsEq, 0, EXAMPLE_ROW + 1, TOTAL_ROWS, listValidation('A', tipos.length))
  if (allModelos.length > 0) applyValidationToRange(wsEq, 1, EXAMPLE_ROW + 1, TOTAL_ROWS, listValidation('F', allModelos.length))
  if (sociedades.length > 0) applyValidationToRange(wsEq, 3, EXAMPLE_ROW + 1, TOTAL_ROWS, listValidation('B', sociedades.length))
  if (ubicaciones.length > 0) applyValidationToRange(wsEq, 4, EXAMPLE_ROW + 1, TOTAL_ROWS, listValidation('C', ubicaciones.length))

  XLSX.utils.book_append_sheet(wb, wsEq, 'Equipos')

  // ────────────────────────────────────────────────
  // Sheet 3: Instrucciones
  // ────────────────────────────────────────────────
  const modelosPorTipo = tipos.map((t) => t + ': ' + ((state.catalogo || {})[t] || []).join(', '))

  const instrucciones = [
    ['INSTRUCCIONES PARA LA IMPORTACION MASIVA'],
    [''],
    ['REGLAS GENERALES:'],
    ['- NO modifiques los nombres de las columnas (fila 1 de cada hoja).'],
    ['- NO añadas columnas nuevas.'],
    ['- La fila 2 de cada hoja es un ejemplo con fondo gris. Puedes sobreescribirla o empezar en la fila 3.'],
    ['- Las celdas con desplegable muestran los valores validos al hacer clic.'],
    ['- Las filas completamente vacias se ignoran automaticamente.'],
    [''],
    ['HOJA "Inventario fungible":'],
    ['- nombre: Nombre descriptivo del producto (obligatorio, texto libre).'],
    ['- categoria: Debe ser un tipo del catalogo (desplegable). Obligatorio.'],
    ['- stock: Stock inicial, numero positivo. Obligatorio.'],
    ['- stockMinimo: Umbral de alerta, numero. Si lo dejas vacio, se usara 2.'],
    ['- ubicacion: Ubicacion activa del sistema (desplegable). Opcional.'],
    ['- estado: "Nuevo" o "Usado" (desplegable). Por defecto "Nuevo".'],
    ['- tier: "Estandar" o "Premium" (desplegable). Por defecto "Estandar".'],
    ['- El codigo de barras se genera automaticamente al importar.'],
    [''],
    ['HOJA "Equipos":'],
    ['- tipo: Tipo de equipo del catalogo (desplegable). Obligatorio.'],
    ['- modelo: Modelo del catalogo (desplegable). Obligatorio.'],
    ['- numSerie: Numero de serie del equipo (texto). Opcional. Si tiene N/S el estado sera "Almacen", si no, "Pendiente".'],
    ['- sociedad: Sociedad activa del sistema (desplegable). Obligatorio.'],
    ['- ubicacion: Ubicacion activa del sistema (desplegable). Opcional.'],
    ['- proveedor: Nombre del proveedor (texto libre). Opcional.'],
    ['- numAlbaran: Numero de albaran (texto libre). Opcional.'],
    ['- fechaCompra: Fecha en formato YYYY-MM-DD (ej: 2026-01-15). Opcional.'],
    ['- El ID de etiqueta se genera automaticamente al importar (correlativo por sociedad).'],
    [''],
    ['VALORES VALIDOS:'],
    [''],
    ['Tipos: ' + tipos.join(', ')],
    ['Sociedades: ' + sociedades.join(', ')],
    ['Ubicaciones: ' + ubicaciones.join(', ')],
    [''],
    ['Modelos por tipo:'],
    ...modelosPorTipo.map((m) => ['  ' + m]),
  ]
  const wsInstr = XLSX.utils.aoa_to_sheet(instrucciones)
  wsInstr['!cols'] = [{ wch: 100 }]
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Instrucciones')

  // ────────────────────────────────────────────────
  // Sheet 4: Listas (hidden reference for dropdowns)
  // ────────────────────────────────────────────────
  // Column layout: A=tipos, B=sociedades, C=ubicaciones, D=estados, E=tiers, F=modelos
  const listsHeader = ['Tipos', 'Sociedades', 'Ubicaciones', 'Estados', 'Tiers', 'Modelos']
  const maxLen = Math.max(tipos.length, sociedades.length, ubicaciones.length, estados.length, tiers.length, allModelos.length)
  const listasData: (string | undefined)[][] = [listsHeader]
  for (let i = 0; i < maxLen; i++) {
    listasData.push([
      tipos[i],
      sociedades[i],
      ubicaciones[i],
      estados[i],
      tiers[i],
      allModelos[i],
    ])
  }
  const wsListas = XLSX.utils.aoa_to_sheet(listasData)
  wsListas['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, wsListas, 'Listas')

  XLSX.writeFile(wb, 'Plantilla_Importacion_IT.xlsx')
}

// ── Validation ──

export function validateImportData(
  workbook: XLSX.WorkBook,
  state: AppState,
  existingSerials: Set<string>
): ImportValidationResult {
  const tipos = Object.keys(state.catalogo || {})
  const modelosPorTipo = state.catalogo || {}
  const sociedades = new Set((state.sociedades || []).filter((s) => s.activo).map((s) => s.nombre.toLowerCase()))
  const ubicaciones = new Set((state.ubicaciones || []).filter((u) => u.activo).map((u) => u.nombre.toLowerCase()))
  const tiposSet = new Set(tipos.map((t) => t.toLowerCase()))

  const equipos: ImportEquipoRow[] = []
  const inventario: ImportInventarioRow[] = []

  // Track serials within the import file to detect intra-file duplicates
  const importSerials = new Set<string>()

  // ── Parse Equipos sheet ──
  const wsEq = workbook.Sheets['Equipos']
  if (wsEq) {
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(wsEq, { defval: '' })
    rows.forEach((r, idx) => {
      const tipo = String(r['tipo'] || r['Tipo'] || '').trim()
      const modelo = String(r['modelo'] || r['Modelo'] || '').trim()
      const numSerie = String(r['numSerie'] || r['Número de Serie'] || r['Numero de Serie'] || '').trim()
      const sociedad = String(r['sociedad'] || r['Sociedad'] || '').trim()
      const ubicacion = String(r['ubicacion'] || r['Ubicación'] || r['Ubicacion'] || '').trim()
      const proveedor = String(r['proveedor'] || r['Proveedor'] || '').trim()
      const numAlbaran = String(r['numAlbaran'] || r['Nº Albarán'] || r['N Albaran'] || r['Nº Albaran'] || '').trim()
      const fechaCompra = String(r['fechaCompra'] || r['Fecha Compra'] || '').trim()

      // Skip completely empty rows
      if (!tipo && !modelo && !numSerie && !sociedad && !ubicacion && !proveedor && !numAlbaran && !fechaCompra) return

      const errors: string[] = []

      if (!tipo) errors.push('Tipo obligatorio')
      else if (!tiposSet.has(tipo.toLowerCase())) errors.push('Tipo "' + tipo + '" no existe en catálogo')

      if (!modelo) errors.push('Modelo obligatorio')
      else if (tipo && tiposSet.has(tipo.toLowerCase())) {
        const matchedTipo = tipos.find((t) => t.toLowerCase() === tipo.toLowerCase()) || tipo
        const modelosValidos = modelosPorTipo[matchedTipo] || []
        if (!modelosValidos.some((m) => m.toLowerCase() === modelo.toLowerCase())) {
          errors.push('Modelo "' + modelo + '" no existe para tipo "' + tipo + '"')
        }
      }

      if (!sociedad) errors.push('Sociedad obligatoria')
      else if (!sociedades.has(sociedad.toLowerCase())) errors.push('Sociedad "' + sociedad + '" no existe')

      if (ubicacion && !ubicaciones.has(ubicacion.toLowerCase())) errors.push('Ubicación "' + ubicacion + '" no existe')

      if (fechaCompra && !/^\d{4}-\d{2}-\d{2}$/.test(fechaCompra)) errors.push('Formato fecha inválido (YYYY-MM-DD)')

      // Check numSerie duplicates
      if (numSerie) {
        const nsUpper = numSerie.toUpperCase()
        if (existingSerials.has(nsUpper)) {
          errors.push('N/S "' + numSerie + '" ya existe en el sistema')
        } else if (importSerials.has(nsUpper)) {
          errors.push('N/S "' + numSerie + '" duplicado en el fichero')
        }
        importSerials.add(nsUpper)
      }

      equipos.push({ tipo, modelo, numSerie, sociedad, ubicacion, proveedor, numAlbaran, fechaCompra, row: idx + 2, errors })
    })
  }

  // ── Parse Inventario fungible sheet ──
  const wsInv = workbook.Sheets['Inventario fungible']
  if (wsInv) {
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(wsInv, { defval: '' })
    rows.forEach((r, idx) => {
      const nombre = String(r['nombre'] || r['Nombre del producto'] || r['Nombre'] || '').trim()
      const categoria = String(r['categoria'] || r['Tipo/Categoría'] || r['Tipo/Categoria'] || '').trim()
      const stockRaw = r['stock'] ?? r['Stock inicial'] ?? ''
      const stockMinRaw = r['stockMinimo'] ?? r['Stock mínimo'] ?? r['Stock minimo'] ?? ''
      const ubicacion = String(r['ubicacion'] || r['Ubicación'] || r['Ubicacion'] || '').trim()
      const estado = String(r['estado'] || r['Estado'] || 'Nuevo').trim()
      const tier = String(r['tier'] || r['Tier'] || 'Estándar').trim()

      // Skip completely empty rows
      if (!nombre && !categoria && stockRaw === '' && !ubicacion) return

      const errors: string[] = []
      const stock = Number(stockRaw)
      const stockMinimo = stockMinRaw === '' || stockMinRaw === undefined ? 2 : Number(stockMinRaw)

      if (!nombre) errors.push('Nombre obligatorio')

      if (!categoria) errors.push('Categoría obligatoria')
      else if (!tiposSet.has(categoria.toLowerCase())) errors.push('Categoría "' + categoria + '" no existe en catálogo')

      if (isNaN(stock) || stock < 0) errors.push('Stock debe ser un número positivo')
      if (isNaN(stockMinimo) || stockMinimo < 0) errors.push('Stock mínimo debe ser un número positivo')

      if (ubicacion && !ubicaciones.has(ubicacion.toLowerCase())) errors.push('Ubicación "' + ubicacion + '" no existe')
      if (estado && estado !== 'Nuevo' && estado !== 'Usado') errors.push('Estado debe ser "Nuevo" o "Usado"')
      if (tier && tier !== 'Estándar' && tier !== 'Premium') errors.push('Tier debe ser "Estándar" o "Premium"')

      inventario.push({ nombre, categoria, stock, stockMinimo, ubicacion, estado, tier, row: idx + 2, errors })
    })
  }

  return {
    equipos,
    inventario,
    equiposValid: equipos.filter((r) => r.errors.length === 0),
    inventarioValid: inventario.filter((r) => r.errors.length === 0),
    totalErrors: equipos.filter((r) => r.errors.length > 0).length + inventario.filter((r) => r.errors.length > 0).length,
  }
}
