// End-to-end test for bulk import: generates a test .xlsx, then runs the
// validator against a mocked AppState and reports what would happen.
//
// Run: node scripts/test-bulk-import.mjs

import * as XLSX from 'xlsx'
import { readFileSync } from 'fs'

// ── Mock AppState (mirrors the shape produced by DataManager.loadAllData) ──
const state = {
  catalogo: {
    'Portátil': ['HP EliteBook 840 G10', 'Dell Latitude 7440'],
    'Monitor': ['Dell U2422H', 'HP E24 G4'],
    'Ratones': ['Logitech M90', 'Logitech MX Master 3'],
    'Cable': ['HDMI 2m', 'USB-C 1m'],
  },
  catalogoTipos: {
    'Portátil': { llevaEtiqueta: true },
    'Monitor':  { llevaEtiqueta: true },
    'Ratones':  { llevaEtiqueta: false },
    'Cable':    { llevaEtiqueta: false },
  },
  sociedades: [
    { nombre: 'Sanlúcar', codigo: 'SLF', activo: true },
    { nombre: 'Sanlúcar Portugal', codigo: 'SLP', activo: true },
  ],
  ubicaciones: [
    { nombre: 'Puzol - Almacén', activo: true },
    { nombre: 'Madrid - Oficina', activo: true },
  ],
  activos: [
    { numSerie: 'EXISTING123' }, // pre-existing serial for duplicate detection
  ],
}

// ── Build test workbook ──
const wb = XLSX.utils.book_new()

// Inventario fungible: 3 valid rows + 1 row with invalid categoria
const invRows = [
  ['nombre', 'categoria', 'stock', 'stockMinimo', 'ubicacion', 'estado', 'tier'],
  ['Ratones - Logitech M90', 'Ratones', 15, 3, 'Puzol - Almacén', 'Nuevo', 'Estándar'],  // valid
  ['Cable HDMI 2m', 'Cable', 25, 5, 'Puzol - Almacén', 'Nuevo', 'Estándar'],             // valid
  ['Ratones - Logitech MX Master 3', 'Ratones', 8, 2, 'Madrid - Oficina', 'Nuevo', 'Premium'], // valid
  ['Producto raro', 'CategoriaInventada', 5, 2, 'Puzol - Almacén', 'Nuevo', 'Estándar'], // ERROR: bad categoria
]
const wsInv = XLSX.utils.aoa_to_sheet(invRows)
XLSX.utils.book_append_sheet(wb, wsInv, 'Inventario fungible')

// Equipos: 2 valid rows
const eqRows = [
  ['tipo', 'modelo', 'numSerie', 'sociedad', 'ubicacion', 'proveedor', 'numAlbaran', 'fechaCompra'],
  ['Portátil', 'HP EliteBook 840 G10', 'ABC-001-TEST', 'Sanlúcar', 'Puzol - Almacén', 'PC Componentes', 'ALB-2026-01', '2026-03-15'],
  ['Monitor',  'Dell U2422H',          'MON-002-TEST', 'Sanlúcar', 'Madrid - Oficina', '', '', ''],
]
const wsEq = XLSX.utils.aoa_to_sheet(eqRows)
XLSX.utils.book_append_sheet(wb, wsEq, 'Equipos')

const outputPath = 'test-import-sample.xlsx'
XLSX.writeFile(wb, outputPath)
console.log(`\n✅ Generated test file: ${outputPath}`)
console.log(`   - Inventario fungible: 3 valid + 1 error row`)
console.log(`   - Equipos: 2 valid rows\n`)

// ── Replicate the validateImportData logic ──
function validateImportData(workbook, state, existingSerials) {
  const tipos = Object.keys(state.catalogo || {})
  const modelosPorTipo = state.catalogo || {}
  const sociedades = new Set((state.sociedades || []).filter((s) => s.activo).map((s) => s.nombre.toLowerCase()))
  const ubicaciones = new Set((state.ubicaciones || []).filter((u) => u.activo).map((u) => u.nombre.toLowerCase()))
  const tiposSet = new Set(tipos.map((t) => t.toLowerCase()))
  const equipos = [], inventario = []
  const importSerials = new Set()

  const wsEq = workbook.Sheets['Equipos']
  if (wsEq) {
    const rows = XLSX.utils.sheet_to_json(wsEq, { defval: '' })
    rows.forEach((r, idx) => {
      const tipo = String(r['tipo'] || '').trim()
      const modelo = String(r['modelo'] || '').trim()
      const numSerie = String(r['numSerie'] || '').trim()
      const sociedad = String(r['sociedad'] || '').trim()
      const ubicacion = String(r['ubicacion'] || '').trim()
      const proveedor = String(r['proveedor'] || '').trim()
      const numAlbaran = String(r['numAlbaran'] || '').trim()
      const fechaCompra = String(r['fechaCompra'] || '').trim()
      if (!tipo && !modelo && !numSerie && !sociedad && !ubicacion && !proveedor && !numAlbaran && !fechaCompra) return
      const errors = []
      if (!tipo) errors.push('Tipo obligatorio')
      else if (!tiposSet.has(tipo.toLowerCase())) errors.push(`Tipo "${tipo}" no existe en catálogo`)
      if (!modelo) errors.push('Modelo obligatorio')
      else if (tipo && tiposSet.has(tipo.toLowerCase())) {
        const matchedTipo = tipos.find((t) => t.toLowerCase() === tipo.toLowerCase()) || tipo
        const modelosValidos = modelosPorTipo[matchedTipo] || []
        if (!modelosValidos.some((m) => m.toLowerCase() === modelo.toLowerCase())) {
          errors.push(`Modelo "${modelo}" no existe para tipo "${tipo}"`)
        }
      }
      if (!sociedad) errors.push('Sociedad obligatoria')
      else if (!sociedades.has(sociedad.toLowerCase())) errors.push(`Sociedad "${sociedad}" no existe`)
      if (ubicacion && !ubicaciones.has(ubicacion.toLowerCase())) errors.push(`Ubicación "${ubicacion}" no existe`)
      if (fechaCompra && !/^\d{4}-\d{2}-\d{2}$/.test(fechaCompra)) errors.push('Formato fecha inválido')
      if (numSerie) {
        const nsUpper = numSerie.toUpperCase()
        if (existingSerials.has(nsUpper)) errors.push(`N/S "${numSerie}" ya existe en el sistema`)
        else if (importSerials.has(nsUpper)) errors.push(`N/S "${numSerie}" duplicado en el fichero`)
        importSerials.add(nsUpper)
      }
      equipos.push({ tipo, modelo, numSerie, sociedad, ubicacion, proveedor, numAlbaran, fechaCompra, row: idx + 2, errors })
    })
  }

  const wsInv = workbook.Sheets['Inventario fungible']
  if (wsInv) {
    const rows = XLSX.utils.sheet_to_json(wsInv, { defval: '' })
    rows.forEach((r, idx) => {
      const nombre = String(r['nombre'] || '').trim()
      const categoria = String(r['categoria'] || '').trim()
      const stockRaw = r['stock'] ?? ''
      const stockMinRaw = r['stockMinimo'] ?? ''
      const ubicacion = String(r['ubicacion'] || '').trim()
      const estado = String(r['estado'] || 'Nuevo').trim()
      const tier = String(r['tier'] || 'Estándar').trim()
      if (!nombre && !categoria && stockRaw === '' && !ubicacion) return
      const errors = []
      const stock = Number(stockRaw)
      const stockMinimo = stockMinRaw === '' ? 2 : Number(stockMinRaw)
      if (!nombre) errors.push('Nombre obligatorio')
      if (!categoria) errors.push('Categoría obligatoria')
      else if (!tiposSet.has(categoria.toLowerCase())) errors.push(`Categoría "${categoria}" no existe en catálogo`)
      if (isNaN(stock) || stock < 0) errors.push('Stock debe ser un número positivo')
      if (isNaN(stockMinimo) || stockMinimo < 0) errors.push('Stock mínimo debe ser un número positivo')
      if (ubicacion && !ubicaciones.has(ubicacion.toLowerCase())) errors.push(`Ubicación "${ubicacion}" no existe`)
      if (estado && estado !== 'Nuevo' && estado !== 'Usado') errors.push('Estado inválido')
      if (tier && tier !== 'Estándar' && tier !== 'Premium') errors.push('Tier inválido')
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

// ── Run validation ──
const readBack = XLSX.read(readFileSync(outputPath), { type: 'buffer' })
const existingSerials = new Set(state.activos.filter((a) => a.numSerie).map((a) => a.numSerie.toUpperCase()))
const result = validateImportData(readBack, state, existingSerials)

console.log('─── VALIDATION RESULT ───\n')
console.log(`Inventario: ${result.inventario.length} rows (${result.inventarioValid.length} valid, ${result.inventario.length - result.inventarioValid.length} with errors)`)
result.inventario.forEach((r) => {
  const status = r.errors.length === 0 ? '✅' : '❌'
  console.log(`  ${status} row ${r.row}: ${r.nombre} / ${r.categoria} / stock=${r.stock}${r.errors.length ? ' → ' + r.errors.join('; ') : ''}`)
})

console.log(`\nEquipos: ${result.equipos.length} rows (${result.equiposValid.length} valid, ${result.equipos.length - result.equiposValid.length} with errors)`)
result.equipos.forEach((r) => {
  const status = r.errors.length === 0 ? '✅' : '❌'
  console.log(`  ${status} row ${r.row}: ${r.tipo} / ${r.modelo} / N/S=${r.numSerie}${r.errors.length ? ' → ' + r.errors.join('; ') : ''}`)
})

console.log(`\nTotal errores: ${result.totalErrors}`)
console.log(`Total a importar: ${result.inventarioValid.length + result.equiposValid.length} registros`)

console.log('\n─── SIMULATED IMPORT (what would happen in SharePoint) ───\n')
let n = 0
const totalItems = result.inventarioValid.length + result.equiposValid.length
for (const row of result.inventarioValid) {
  n++
  const barcode = 'XXXXXXXXXXXXX' // would be crypto.randomUUID() in browser
  console.log(`  [${n}/${totalItems}] createInventoryItem: "${row.nombre}" (${row.categoria}) stock=${row.stock} barcode=${barcode}`)
  console.log(`       addToHistory: Entrada, ${row.nombre}, cantidad=${row.stock}`)
}
const bySoc = {}
for (const row of result.equiposValid) {
  const ms = state.sociedades.find((s) => s.nombre.toLowerCase() === row.sociedad.toLowerCase())
  const cod = ms?.codigo || 'SLF'
  if (!bySoc[cod]) bySoc[cod] = []
  bySoc[cod].push(row)
}
for (const [codigo, rows] of Object.entries(bySoc)) {
  const anyo = new Date().getFullYear().toString().slice(-2)
  let numPart = 1
  const prefix = `${codigo}-${anyo}-`
  for (const row of rows) {
    n++
    const id = prefix + String(numPart).padStart(5, '0')
    numPart++
    const estado = row.numSerie ? 'Almacen' : 'Pendiente'
    console.log(`  [${n}/${totalItems}] createActivo: ${id} ${row.tipo} ${row.modelo} N/S=${row.numSerie || '(vacio)'} estado=${estado}`)
  }
}

console.log('\n─── SUMMARY ───')
console.log(`✅ ${result.inventarioValid.length + result.equiposValid.length} registros se crearían correctamente en SharePoint`)
console.log(`❌ ${result.totalErrors} fila(s) con error serían excluidas`)
