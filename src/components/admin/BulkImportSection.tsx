import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { useAppContext } from '../../context/AppContext'
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
  const { refreshData } = useAppData()
  const t = T()
  const fileRef = useRef<HTMLInputElement>(null)

  const [phase, setPhase] = useState<Phase>('initial')
  const [validation, setValidation] = useState<ImportValidationResult | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [result, setResult] = useState<ImportResult | null>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const result = validateImportData(wb, state)
        if (result.equipos.length === 0 && result.inventario.length === 0) {
          showToast('No se encontraron datos en el archivo', 'warning')
          return
        }
        setValidation(result)
        setPhase('preview')
      } catch (err: any) {
        showToast('Error leyendo el archivo: ' + err.message, 'error')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleImport = async () => {
    if (!validation || !dataManagerRef.current) return
    const dm = dataManagerRef.current
    const errors: string[] = []

    const totalItems = validation.equiposValid.length + validation.inventarioValid.length
    setProgress({ current: 0, total: totalItems })
    setPhase('importing')

    let created = 0
    let equiposCreated = 0
    let inventarioCreated = 0

    // Import equipos - need to generate etiqueta IDs
    if (validation.equiposValid.length > 0) {
      // Group by sociedad to batch ID generation
      const bySociedad: Record<string, ImportEquipoRow[]> = {}
      for (const row of validation.equiposValid) {
        const soc = row.sociedad
        const matchedSoc = (state.sociedades || []).find((s) => s.nombre.toLowerCase() === soc.toLowerCase())
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
          errors.push('Error obteniendo ID para sociedad ' + codigo)
          created += rows.length
          setProgress({ current: created, total: totalItems })
          continue
        }

        // Parse the numeric part to increment locally
        const prefix = nextId.slice(0, nextId.lastIndexOf('-') + 1)
        let numPart = parseInt(nextId.slice(nextId.lastIndexOf('-') + 1), 10)

        for (const row of rows) {
          const idEtiqueta = prefix + numPart.toString().padStart(5, '0')
          numPart++
          try {
            // Find exact names from catalog (case-insensitive match)
            const matchedTipo = Object.keys(state.catalogo || {}).find((t) => t.toLowerCase() === row.tipo.toLowerCase()) || row.tipo
            const modelosValidos = (state.catalogo || {})[matchedTipo] || []
            const matchedModelo = modelosValidos.find((m) => m.toLowerCase() === row.modelo.toLowerCase()) || row.modelo
            const matchedSoc = (state.sociedades || []).find((s) => s.nombre.toLowerCase() === row.sociedad.toLowerCase())
            const matchedUbi = (state.ubicaciones || []).find((u) => u.nombre.toLowerCase() === row.ubicacion.toLowerCase())
            const matchedProv = (state.proveedores || []).find((p) => p.nombre.toLowerCase() === row.proveedor.toLowerCase())

            await dm.createActivo({
              idEtiqueta,
              tipo: matchedTipo,
              modelo: matchedModelo,
              estado: row.numSerie ? 'Almacen' : 'Pendiente',
              ubicacion: matchedUbi?.nombre || row.ubicacion,
              numSerie: row.numSerie,
              sociedad: matchedSoc?.nombre || row.sociedad,
              proveedor: matchedProv?.nombre || row.proveedor,
              numAlbaran: row.numAlbaran,
              fechaCompra: row.fechaCompra || null,
            })
            equiposCreated++
          } catch (err: any) {
            errors.push('Fila ' + row.row + ' (Equipo): ' + (err.message || 'Error desconocido'))
          }
          created++
          setProgress({ current: created, total: totalItems })
        }
      }
    }

    // Import inventario
    for (const row of validation.inventarioValid) {
      try {
        const matchedCat = Object.keys(state.catalogo || {}).find((t) => t.toLowerCase() === row.categoria.toLowerCase()) || row.categoria
        const matchedUbi = (state.ubicaciones || []).find((u) => u.nombre.toLowerCase() === row.ubicacion.toLowerCase())

        await dm.createInventoryItem({
          nombre: row.nombre,
          categoria: matchedCat,
          barcode: row.barcode,
          stock: row.stock,
          stockMinimo: row.stockMinimo,
          ubicacion: matchedUbi?.nombre || row.ubicacion,
          tier: row.tier as any,
        })
        inventarioCreated++
      } catch (err: any) {
        errors.push('Fila ' + row.row + ' (Inventario): ' + (err.message || 'Error desconocido'))
      }
      created++
      setProgress({ current: created, total: totalItems })
    }

    setResult({ equiposCreated, inventarioCreated, errors })
    setPhase('done')
    await refreshData()
    showToast(equiposCreated + inventarioCreated + ' ' + t.rowsProcessed, 'success')
  }

  const reset = () => {
    setPhase('initial')
    setValidation(null)
    setProgress({ current: 0, total: 0 })
    setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  // ── Preview table ──
  const previewTable = (title: string, headers: string[], rows: (ImportEquipoRow | ImportInventarioRow)[], getValues: (row: any) => string[]) => (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>{title} ({rows.length})</div>
      {rows.length === 0 ? (
        <div style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '12px' }}>Sin datos</div>
      ) : (
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
                  <tr key={row.row} style={{ background: hasErr ? 'rgba(239,68,68,.06)' : 'transparent' }}>
                    <td style={tdStyle}>{row.row}</td>
                    {getValues(row).map((v, i) => <td key={i} style={tdStyle}>{v || '—'}</td>)}
                    <td style={tdStyle}>
                      {hasErr
                        ? <span style={{ color: '#ef4444', fontSize: '11px' }}>{row.errors.join('; ')}</span>
                        : <span style={{ color: '#3fb950', fontSize: '11px' }}>OK</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  return (
    <div>
      <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '16px' }}>
          {t.bulkImport}
        </div>
        <div style={{ padding: '20px' }}>

          {/* Phase: Initial */}
          {phase === 'initial' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="info-banner blue" style={{ fontSize: '13px' }}>
                Descarga la plantilla Excel, rellena los datos y sube el fichero para importar equipos e inventario de forma masiva.
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button className="button button-primary" onClick={() => generateImportTemplate(state)}>
                  {t.downloadTemplate}
                </button>
                <label className="button button-success" style={{ cursor: 'pointer' }}>
                  {t.importExcel}
                  <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
          )}

          {/* Phase: Preview */}
          {phase === 'preview' && validation && (
            <div>
              <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ padding: '10px 16px', background: 'rgba(63,185,80,.1)', border: '1px solid rgba(63,185,80,.3)', borderRadius: '8px', fontSize: '13px' }}>
                  {validation.equiposValid.length + validation.inventarioValid.length} registros válidos
                </div>
                {validation.totalErrors > 0 && (
                  <div style={{ padding: '10px 16px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '8px', fontSize: '13px', color: '#ef4444' }}>
                    {validation.totalErrors} {t.rowsWithErrors}
                  </div>
                )}
              </div>

              {previewTable(
                'Equipos',
                ['Tipo', 'Modelo', 'N/S', 'Sociedad', 'Ubicación', 'Proveedor'],
                validation.equipos,
                (r: ImportEquipoRow) => [r.tipo, r.modelo, r.numSerie, r.sociedad, r.ubicacion, r.proveedor]
              )}

              {previewTable(
                'Inventario',
                ['Categoría', 'Nombre', 'Código', 'Stock', 'Mín.', 'Ubicación', 'Tier'],
                validation.inventario,
                (r: ImportInventarioRow) => [r.categoria, r.nombre, r.barcode, String(r.stock), String(r.stockMinimo), r.ubicacion, r.tier]
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button className="button button-secondary" onClick={reset}>{t.cancel}</button>
                <button
                  className="button button-success"
                  onClick={handleImport}
                  disabled={validation.equiposValid.length + validation.inventarioValid.length === 0}
                >
                  {t.confirmImport} ({validation.equiposValid.length + validation.inventarioValid.length} registros)
                </button>
              </div>
            </div>
          )}

          {/* Phase: Importing */}
          {phase === 'importing' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>{t.importing}</div>
              <div style={{ background: 'var(--bg-primary)', borderRadius: '10px', height: '28px', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '12px' }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple))', borderRadius: '10px', transition: 'width .3s ease', width: pct + '%' }} />
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                {progress.current} / {progress.total} ({pct}%)
              </div>
            </div>
          )}

          {/* Phase: Done */}
          {phase === 'done' && result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {result.equiposCreated > 0 && (
                  <div style={{ padding: '12px 20px', background: 'rgba(63,185,80,.1)', border: '1px solid rgba(63,185,80,.3)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#3fb950' }}>{result.equiposCreated}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Equipos creados</div>
                  </div>
                )}
                {result.inventarioCreated > 0 && (
                  <div style={{ padding: '12px 20px', background: 'rgba(168,85,247,.1)', border: '1px solid rgba(168,85,247,.3)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#a855f7' }}>{result.inventarioCreated}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Productos creados</div>
                  </div>
                )}
              </div>

              {result.errors.length > 0 && (
                <div style={{ background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '10px', padding: '14px', maxHeight: '200px', overflowY: 'auto' }}>
                  <div style={{ fontWeight: 700, color: '#ef4444', fontSize: '13px', marginBottom: '8px' }}>{result.errors.length} error(es):</div>
                  {result.errors.map((err, i) => (
                    <div key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '2px 0' }}>{err}</div>
                  ))}
                </div>
              )}

              <button className="button button-primary" onClick={reset}>Nueva importación</button>
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
}

const tdStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderBottom: '1px solid var(--border)',
  fontSize: '12px',
}
