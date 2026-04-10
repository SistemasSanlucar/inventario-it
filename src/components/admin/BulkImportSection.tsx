import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { useAppContext } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { useAppData } from '../../hooks/useAppData'
import { showToast } from '../../hooks/useToast'
import { T } from '../../i18n'
import { generateImportTemplate, validateImportData } from '../../utils/bulkImport'
import type { ImportValidationResult, ImportEquipoRow, ImportInventarioRow } from '../../utils/bulkImport'

type Phase = 'initial' | 'preview' | 'importing' | 'done'

interface ImportResult {
  equiposCreated: number
  inventarioCreated: number
  errors: string[]
}

export default function BulkImportSection() {
  const { state, dataManagerRef } = useAppContext()
  const { user } = useAuth()
  const { refreshData } = useAppData()
  const t = T()
  const fileRef = useRef<HTMLInputElement>(null)

  const [phase, setPhase] = useState<Phase>('initial')
  const [validation, setValidation] = useState<ImportValidationResult | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0, label: '' })
  const [result, setResult] = useState<ImportResult | null>(null)

  // ── Build set of existing serial numbers for duplicate detection ──
  const getExistingSerials = (): Set<string> => {
    const serials = new Set<string>()
    for (const a of (state.activos || [])) {
      if (a.numSerie) serials.add(a.numSerie.toUpperCase())
    }
    return serials
  }

  // ── Export current inventory as CSV ──
  const handleExportCSV = () => {
    const items = state.inventory || []
    if (items.length === 0) {
      showToast('No hay productos en el inventario', 'warning')
      return
    }
    const data = items.map((i) => ({
      Nombre: i.nombre,
      Categoría: i.categoria,
      'Código de barras': i.barcode,
      Stock: i.stock,
      'Stock Mínimo': i.stockMinimo,
      Ubicación: i.ubicacion,
      Estado: i.estado,
      Tier: i.tier,
    }))
    // Use XLSX to export CSV directly
    const ws = XLSX.utils.json_to_sheet(data)
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'Inventario_IT_' + new Date().toISOString().split('T')[0] + '.csv'
    link.click()
    showToast('CSV exportado', 'success')
  }

  // ── Read uploaded Excel file ──
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })

        // Detect which sheets are present
        const hasInv = wb.SheetNames.includes('Inventario fungible')
        const hasEq = wb.SheetNames.includes('Equipos')
        if (!hasInv && !hasEq) {
          showToast('El archivo no contiene hojas "Inventario fungible" ni "Equipos"', 'warning')
          return
        }

        const existingSerials = getExistingSerials()
        const result = validateImportData(wb, state, existingSerials)
        if (result.equipos.length === 0 && result.inventario.length === 0) {
          showToast('No se encontraron datos en el archivo (todas las filas están vacías)', 'warning')
          return
        }
        setValidation(result)
        setPhase('preview')
      } catch (err: any) {
        showToast('Error leyendo el archivo: ' + err.message, 'error')
      }
    }
    reader.readAsArrayBuffer(file)
    // Reset file input so same file can be re-uploaded
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Execute import ──
  const handleImport = async () => {
    if (!validation || !dataManagerRef.current) return
    const dm = dataManagerRef.current
    const errors: string[] = []
    const tecnico = user?.name || 'Sistema'

    const totalItems = validation.equiposValid.length + validation.inventarioValid.length
    setProgress({ current: 0, total: totalItems, label: 'Preparando...' })
    setPhase('importing')

    let created = 0
    let equiposCreated = 0
    let inventarioCreated = 0

    // ── Import Inventario fungible ──
    for (let i = 0; i < validation.inventarioValid.length; i++) {
      const row = validation.inventarioValid[i]
      created++
      setProgress({ current: created, total: totalItems, label: 'Creando producto ' + created + ' de ' + totalItems + '...' })

      try {
        const matchedCat = Object.keys(state.catalogo || {}).find((t) => t.toLowerCase() === row.categoria.toLowerCase()) || row.categoria
        const matchedUbi = (state.ubicaciones || []).find((u) => u.nombre.toLowerCase() === row.ubicacion.toLowerCase())
        const barcode = crypto.randomUUID().replace(/-/g, '').slice(0, 13).toUpperCase()

        await dm.createInventoryItem({
          nombre: row.nombre,
          categoria: matchedCat,
          barcode,
          stock: row.stock,
          stockMinimo: row.stockMinimo,
          ubicacion: matchedUbi?.nombre || row.ubicacion,
          estado: (row.estado as any) || 'Nuevo',
          tier: (row.tier as any) || 'Estándar',
        })

        // Register history entry
        await dm.addToHistory({
          tipo: 'Entrada',
          producto: row.nombre,
          cantidad: row.stock,
          tecnico,
          motivo: 'Importación masiva',
        })

        inventarioCreated++
      } catch (err: any) {
        errors.push('Fila ' + row.row + ' (Inv) "' + row.nombre + '": ' + (err.message || 'Error desconocido'))
      }
    }

    // ── Import Equipos (sequential for ID generation) ──
    if (validation.equiposValid.length > 0) {
      // Group by sociedad to batch ID generation
      const bySociedad: Record<string, ImportEquipoRow[]> = {}
      for (const row of validation.equiposValid) {
        const matchedSoc = (state.sociedades || []).find((s) => s.nombre.toLowerCase() === row.sociedad.toLowerCase())
        const codigo = matchedSoc?.codigo || 'SLF'
        if (!bySociedad[codigo]) bySociedad[codigo] = []
        bySociedad[codigo].push(row)
      }

      for (const [codigo, rows] of Object.entries(bySociedad)) {
        // Get starting ID once per sociedad
        let nextId: string
        try {
          nextId = await dm.getNextEtiquetaId(codigo)
        } catch {
          for (const row of rows) {
            errors.push('Fila ' + row.row + ' (Equipo): Error obteniendo ID para sociedad ' + codigo)
            created++
          }
          setProgress({ current: created, total: totalItems, label: 'Procesando...' })
          continue
        }

        // Parse numeric part and increment locally
        const prefix = nextId.slice(0, nextId.lastIndexOf('-') + 1)
        let numPart = parseInt(nextId.slice(nextId.lastIndexOf('-') + 1), 10)

        for (const row of rows) {
          const idEtiqueta = prefix + numPart.toString().padStart(5, '0')
          numPart++
          created++
          setProgress({ current: created, total: totalItems, label: 'Creando equipo ' + created + ' de ' + totalItems + ' (' + idEtiqueta + ')...' })

          try {
            const matchedTipo = Object.keys(state.catalogo || {}).find((t) => t.toLowerCase() === row.tipo.toLowerCase()) || row.tipo
            const modelosValidos = (state.catalogo || {})[matchedTipo] || []
            const matchedModelo = modelosValidos.find((m) => m.toLowerCase() === row.modelo.toLowerCase()) || row.modelo
            const matchedSoc = (state.sociedades || []).find((s) => s.nombre.toLowerCase() === row.sociedad.toLowerCase())
            const matchedUbi = (state.ubicaciones || []).find((u) => u.nombre.toLowerCase() === row.ubicacion.toLowerCase())

            await dm.createActivo({
              idEtiqueta,
              tipo: matchedTipo,
              modelo: matchedModelo,
              estado: row.numSerie ? 'Almacen' : 'Pendiente',
              ubicacion: matchedUbi?.nombre || row.ubicacion,
              numSerie: row.numSerie,
              sociedad: matchedSoc?.nombre || row.sociedad,
              proveedor: row.proveedor,
              numAlbaran: row.numAlbaran,
              fechaCompra: row.fechaCompra || null,
            })
            equiposCreated++
          } catch (err: any) {
            errors.push('Fila ' + row.row + ' (Equipo) "' + row.tipo + ' ' + row.modelo + '": ' + (err.message || 'Error desconocido'))
          }
        }
      }
    }

    setResult({ equiposCreated, inventarioCreated, errors })
    setPhase('done')
    await refreshData()
    const totalCreated = equiposCreated + inventarioCreated
    showToast(totalCreated + ' registros importados correctamente', totalCreated > 0 ? 'success' : 'warning')
  }

  const reset = () => {
    setPhase('initial')
    setValidation(null)
    setProgress({ current: 0, total: 0, label: '' })
    setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  // ── Preview table helper ──
  const previewTable = (
    title: string,
    headers: string[],
    rows: (ImportEquipoRow | ImportInventarioRow)[],
    getValues: (row: any) => string[]
  ) => {
    if (rows.length === 0) return null
    const validCount = rows.filter((r) => r.errors.length === 0).length
    const errorCount = rows.filter((r) => r.errors.length > 0).length
    return (
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontWeight: 700, fontSize: '14px' }}>{title}</span>
          <span style={{ fontSize: '12px', color: '#3fb950' }}>{validCount} válidos</span>
          {errorCount > 0 && <span style={{ fontSize: '12px', color: '#ef4444' }}>{errorCount} con errores</span>}
        </div>
        <div style={{ overflowX: 'auto', maxHeight: '300px', overflowY: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                {headers.map((h) => <th key={h} style={thStyle}>{h}</th>)}
                <th style={thStyle}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const hasErr = row.errors.length > 0
                return (
                  <tr key={row.row} style={{ background: hasErr ? 'rgba(239,68,68,.06)' : 'rgba(63,185,80,.04)' }}>
                    <td style={tdStyle}>{row.row}</td>
                    {getValues(row).map((v, i) => <td key={i} style={tdStyle}>{v || '—'}</td>)}
                    <td style={tdStyle}>
                      {hasErr
                        ? <span style={{ color: '#ef4444', fontSize: '11px' }}>❌ {row.errors.join('; ')}</span>
                        : <span style={{ color: '#3fb950', fontSize: '11px' }}>✅ OK</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '16px' }}>
          📥 {t.bulkImport}
        </div>
        <div style={{ padding: '20px' }}>

          {/* ── Phase: Initial ── */}
          {phase === 'initial' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Info banner */}
              <div className="info-banner blue" style={{ fontSize: '13px' }}>
                Descarga la plantilla Excel, rellena los datos y sube el fichero para importar equipos e inventario de forma masiva. Las filas con errores se muestran antes de confirmar.
              </div>

              {/* Buttons row */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {/* Export current inventory CSV */}
                <button className="button button-secondary" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📤 Exportar inventario (CSV)
                </button>

                {/* Download empty template */}
                <button className="button button-primary" onClick={() => generateImportTemplate(state)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📋 {t.downloadTemplate}
                </button>

                {/* Import file */}
                <label className="button button-success" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📥 {t.importExcel}
                  <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
              </div>

              {/* Quick help */}
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong>Flujo de trabajo:</strong><br />
                1. Descarga la plantilla Excel (incluye desplegables con valores del catálogo actual).<br />
                2. Rellena las hojas "Inventario fungible" y/o "Equipos" con los datos.<br />
                3. Sube el fichero rellenado con el botón "Importar Excel".<br />
                4. Revisa la previsualización y confirma la importación.
              </div>
            </div>
          )}

          {/* ── Phase: Preview ── */}
          {phase === 'preview' && validation && (
            <div>
              {/* Summary badges */}
              <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ padding: '10px 16px', background: 'rgba(63,185,80,.1)', border: '1px solid rgba(63,185,80,.3)', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                  ✅ {validation.equiposValid.length + validation.inventarioValid.length} registros válidos
                </div>
                {validation.totalErrors > 0 && (
                  <div style={{ padding: '10px 16px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '8px', fontSize: '13px', color: '#ef4444', fontWeight: 600 }}>
                    ❌ {validation.totalErrors} {t.rowsWithErrors}
                  </div>
                )}
                {validation.totalErrors > 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Las filas con errores se excluirán de la importación.
                  </div>
                )}
              </div>

              {/* Inventario preview table */}
              {previewTable(
                '📦 Inventario fungible',
                ['Nombre', 'Categoría', 'Stock', 'Mín.', 'Ubicación', 'Estado', 'Tier'],
                validation.inventario,
                (r: ImportInventarioRow) => [r.nombre, r.categoria, String(r.stock), String(r.stockMinimo), r.ubicacion, r.estado, r.tier]
              )}

              {/* Equipos preview table */}
              {previewTable(
                '💻 Equipos',
                ['Tipo', 'Modelo', 'N/S', 'Sociedad', 'Ubicación', 'Proveedor', 'Albarán', 'F. Compra'],
                validation.equipos,
                (r: ImportEquipoRow) => [r.tipo, r.modelo, r.numSerie, r.sociedad, r.ubicacion, r.proveedor, r.numAlbaran, r.fechaCompra]
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button className="button button-secondary" onClick={reset}>{t.cancel}</button>
                <button
                  className="button button-success"
                  onClick={handleImport}
                  disabled={validation.equiposValid.length + validation.inventarioValid.length === 0}
                  style={{ fontWeight: 700 }}
                >
                  {t.confirmImport} ({validation.equiposValid.length + validation.inventarioValid.length} registros)
                </button>
              </div>
            </div>
          )}

          {/* ── Phase: Importing ── */}
          {phase === 'importing' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div className="loading-spinner" style={{ marginBottom: '16px' }} />
              <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>{t.importing}</div>
              <div style={{ background: 'var(--bg-primary)', borderRadius: '10px', height: '28px', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '12px' }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple))', borderRadius: '10px', transition: 'width .3s ease', width: pct + '%' }} />
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {progress.label}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {progress.current} / {progress.total} ({pct}%)
              </div>
            </div>
          )}

          {/* ── Phase: Done ── */}
          {phase === 'done' && result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Success summary */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {result.inventarioCreated > 0 && (
                  <div style={{ padding: '14px 24px', background: 'rgba(63,185,80,.1)', border: '1px solid rgba(63,185,80,.3)', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#3fb950' }}>{result.inventarioCreated}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Productos creados</div>
                  </div>
                )}
                {result.equiposCreated > 0 && (
                  <div style={{ padding: '14px 24px', background: 'rgba(88,166,255,.1)', border: '1px solid rgba(88,166,255,.3)', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#58a6ff' }}>{result.equiposCreated}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Equipos creados</div>
                  </div>
                )}
                {result.inventarioCreated === 0 && result.equiposCreated === 0 && (
                  <div style={{ padding: '14px 24px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '14px', color: '#ef4444', fontWeight: 600 }}>No se importó ningún registro</div>
                  </div>
                )}
              </div>

              {/* Errors detail */}
              {result.errors.length > 0 && (
                <div style={{ background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '10px', padding: '16px', maxHeight: '220px', overflowY: 'auto' }}>
                  <div style={{ fontWeight: 700, color: '#ef4444', fontSize: '13px', marginBottom: '10px' }}>
                    ⚠️ {result.errors.length} error(es) durante la importación:
                  </div>
                  {result.errors.map((err, i) => (
                    <div key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '3px 0', borderBottom: i < result.errors.length - 1 ? '1px solid rgba(239,68,68,.1)' : 'none' }}>
                      {err}
                    </div>
                  ))}
                </div>
              )}

              <button className="button button-primary" onClick={reset} style={{ alignSelf: 'flex-start' }}>
                Nueva importación
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '8px 10px',
  textAlign: 'left',
  background: 'var(--bg-secondary)',
  borderBottom: '1px solid var(--border)',
  fontWeight: 700,
  fontSize: '11px',
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  position: 'sticky',
  top: 0,
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderBottom: '1px solid var(--border)',
  fontSize: '12px',
}
