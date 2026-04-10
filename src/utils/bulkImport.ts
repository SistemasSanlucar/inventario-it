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
  categoria: string
  nombre: string
  barcode: string
  stock: number
  stockMinimo: number
  ubicacion: string
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

// ── Template generation ──

export function generateImportTemplate(state: AppState): void {
  const wb = XLSX.utils.book_new()

  // Gather catalog values for validation reference
  const tipos = Object.keys(state.catalogo || {})
  const modelos: string[] = []
  for (const tipo of tipos) {
    for (const modelo of (state.catalogo[tipo] || [])) {
      modelos.push(tipo + ' > ' + modelo)
    }
  }
  const sociedades = (state.sociedades || []).filter((s) => s.activo).map((s) => s.nombre)
  const ubicaciones = (state.ubicaciones || []).filter((u) => u.activo).map((u) => u.nombre)
  const proveedores = (state.proveedores || []).filter((p) => p.activo).map((p) => p.nombre)
  const categorias = Object.keys(state.catalogo || {})
  const tiers = ['Estándar', 'Premium']

  // Sheet 1: Equipos
  const equiposHeaders = ['Tipo', 'Modelo', 'Número de Serie', 'Sociedad', 'Ubicación', 'Proveedor', 'Nº Albarán', 'Fecha Compra']
  const equiposData = [equiposHeaders, ['Ej: Portátil', 'Ej: HP EliteBook 840 G10', 'Ej: ABC123', 'Ej: Sanlúcar', 'Ej: Almacén IT', 'Ej: PC Componentes', 'Ej: ALB-001', 'Ej: 2026-01-15']]
  const wsEquipos = XLSX.utils.aoa_to_sheet(equiposData)
  wsEquipos['!cols'] = [{ wch: 18 }, { wch: 30 }, { wch: 22 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, wsEquipos, 'Equipos')

  // Sheet 2: Inventario
  const invHeaders = ['Tipo/Categoría', 'Nombre del producto', 'Código de barras', 'Stock inicial', 'Stock mínimo', 'Ubicación', 'Tier']
  const invData = [invHeaders, ['Ej: Cable', 'Ej: Cable HDMI 2m', 'Ej: 8431234567890', '10', '3', 'Ej: Almacén IT', 'Estándar']]
  const wsInv = XLSX.utils.aoa_to_sheet(invData)
  wsInv['!cols'] = [{ wch: 18 }, { wch: 30 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, wsInv, 'Inventario fungible')

  // Sheet 3: Instrucciones
  const instrucciones = [
    ['INSTRUCCIONES PARA LA IMPORTACIÓN MASIVA'],
    [''],
    ['1. Rellena las hojas "Equipos" e "Inventario fungible" con los datos correspondientes.'],
    ['2. La primera fila de cada hoja es la cabecera — NO la modifiques.'],
    ['3. La segunda fila contiene ejemplos — elimínala o sobrescríbela con datos reales.'],
    ['4. Campos obligatorios para Equipos: Tipo, Modelo, Sociedad.'],
    ['5. Campos obligatorios para Inventario: Tipo/Categoría, Nombre del producto, Stock inicial.'],
    ['6. El campo "Fecha Compra" debe usar formato YYYY-MM-DD (ej: 2026-01-15).'],
    ['7. El campo "Tier" solo acepta: Estándar o Premium.'],
    [''],
    ['VALORES VÁLIDOS (consulta la hoja "Listas" para la referencia completa):'],
    [''],
    ['Tipos de equipo: ' + tipos.join(', ')],
    ['Sociedades: ' + sociedades.join(', ')],
    ['Ubicaciones: ' + ubicaciones.join(', ')],
    ['Proveedores: ' + proveedores.join(', ')],
    ['Tiers: ' + tiers.join(', ')],
    [''],
    ['Modelos por tipo (Tipo > Modelo):'],
    ...modelos.map((m) => ['  ' + m]),
  ]
  const wsInstr = XLSX.utils.aoa_to_sheet(instrucciones)
  wsInstr['!cols'] = [{ wch: 90 }]
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Instrucciones')

  // Sheet 4: Listas (reference data for dropdowns)
  const maxLen = Math.max(tipos.length, sociedades.length, ubicaciones.length, proveedores.length, tiers.length, modelos.length)
  const listasData: string[][] = [['Tipos', 'Sociedades', 'Ubicaciones', 'Proveedores', 'Tiers', 'Modelos (Tipo > Modelo)']]
  for (let i = 0; i < maxLen; i++) {
    listasData.push([
      tipos[i] || '',
      sociedades[i] || '',
      ubicaciones[i] || '',
      proveedores[i] || '',
      tiers[i] || '',
      modelos[i] || '',
    ])
  }
  const wsListas = XLSX.utils.aoa_to_sheet(listasData)
  wsListas['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 35 }]
  XLSX.utils.book_append_sheet(wb, wsListas, 'Listas')

  XLSX.writeFile(wb, 'Plantilla_Importacion_IT.xlsx')
}

// ── Validation ──

export function validateImportData(workbook: XLSX.WorkBook, state: AppState): ImportValidationResult {
  const tipos = Object.keys(state.catalogo || {})
  const modelosPorTipo = state.catalogo || {}
  const sociedades = new Set((state.sociedades || []).filter((s) => s.activo).map((s) => s.nombre.toLowerCase()))
  const ubicaciones = new Set((state.ubicaciones || []).filter((u) => u.activo).map((u) => u.nombre.toLowerCase()))
  const proveedores = new Set((state.proveedores || []).filter((p) => p.activo).map((p) => p.nombre.toLowerCase()))
  const tiposSet = new Set(tipos.map((t) => t.toLowerCase()))

  const equipos: ImportEquipoRow[] = []
  const inventario: ImportInventarioRow[] = []

  // Parse Equipos sheet
  const wsEq = workbook.Sheets['Equipos']
  if (wsEq) {
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(wsEq, { defval: '' })
    rows.forEach((r, idx) => {
      const tipo = String(r['Tipo'] || '').trim()
      const modelo = String(r['Modelo'] || '').trim()
      const numSerie = String(r['Número de Serie'] || r['Numero de Serie'] || '').trim()
      const sociedad = String(r['Sociedad'] || '').trim()
      const ubicacion = String(r['Ubicación'] || r['Ubicacion'] || '').trim()
      const proveedor = String(r['Proveedor'] || '').trim()
      const numAlbaran = String(r['Nº Albarán'] || r['N Albaran'] || r['Nº Albaran'] || '').trim()
      const fechaCompra = String(r['Fecha Compra'] || '').trim()
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
      if (proveedor && !proveedores.has(proveedor.toLowerCase())) errors.push('Proveedor "' + proveedor + '" no existe')

      if (fechaCompra && !/^\d{4}-\d{2}-\d{2}$/.test(fechaCompra)) errors.push('Formato de fecha inválido (usar YYYY-MM-DD)')

      equipos.push({ tipo, modelo, numSerie, sociedad, ubicacion, proveedor, numAlbaran, fechaCompra, row: idx + 2, errors })
    })
  }

  // Parse Inventario sheet
  const wsInv = workbook.Sheets['Inventario fungible']
  if (wsInv) {
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(wsInv, { defval: '' })
    rows.forEach((r, idx) => {
      const categoria = String(r['Tipo/Categoría'] || r['Tipo/Categoria'] || '').trim()
      const nombre = String(r['Nombre del producto'] || '').trim()
      const barcode = String(r['Código de barras'] || r['Codigo de barras'] || '').trim()
      const stockRaw = r['Stock inicial']
      const stockMinRaw = r['Stock mínimo'] ?? r['Stock minimo'] ?? ''
      const ubicacion = String(r['Ubicación'] || r['Ubicacion'] || '').trim()
      const tier = String(r['Tier'] || 'Estándar').trim()
      const errors: string[] = []

      const stock = Number(stockRaw)
      const stockMinimo = stockMinRaw === '' ? 0 : Number(stockMinRaw)

      if (!categoria) errors.push('Tipo/Categoría obligatorio')
      else if (!tiposSet.has(categoria.toLowerCase())) errors.push('Categoría "' + categoria + '" no existe en catálogo')

      if (!nombre) errors.push('Nombre obligatorio')

      if (isNaN(stock) || stock < 0) errors.push('Stock inicial inválido')
      if (isNaN(stockMinimo) || stockMinimo < 0) errors.push('Stock mínimo inválido')

      if (ubicacion && !ubicaciones.has(ubicacion.toLowerCase())) errors.push('Ubicación "' + ubicacion + '" no existe')

      if (tier && tier !== 'Estándar' && tier !== 'Premium') errors.push('Tier debe ser "Estándar" o "Premium"')

      inventario.push({ categoria, nombre, barcode, stock, stockMinimo, ubicacion, tier, row: idx + 2, errors })
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
