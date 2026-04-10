import type { GraphAPIClient } from './GraphAPIClient'
import type { LineaRow, TarifaInfo } from '../types/lineas'

const SITE = 'sanlucarfruit.sharepoint.com:/sites/InformationSystems:'
const ITEM_ID = '935D9076-87D9-4A63-A37D-80F985C5ADD7'
const BASE = '/sites/' + SITE + '/drive/items/' + ITEM_ID + '/workbook/worksheets'

// Column order in LINEAS / LINEAS VIP sheets:
// 0:Tarifa 1:PERFIL 2:Column1(observaciones) 3:Numero 4:Extension 5:Usuario 6:IMEI 7:PIN 8:SIM2ª 9:PUK_SIM2ª 10:__PowerAppsId__
const COL_MAP = {
  tarifa: 0,
  perfil: 1,
  observaciones: 2,
  numero: 3,
  extension: 4,
  usuario: 5,
  imei: 6,
  pin: 7,
  sim2: 8,
  pukSim2: 9,
  powerAppsId: 10,
} as const

function colToLetter(idx: number): string {
  let s = ''
  let n = idx
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s
    n = Math.floor(n / 26) - 1
  }
  return s
}

function parseRows(values: (string | number | null)[][], sheet: string): LineaRow[] {
  if (!values || values.length < 2) return []
  // Skip header row (index 0), parse data rows
  const rows: LineaRow[] = []
  for (let i = 1; i < values.length; i++) {
    const r = values[i]
    if (!r) continue
    const numero = String(r[COL_MAP.numero] ?? '').trim()
    const usuario = String(r[COL_MAP.usuario] ?? '').trim()
    // Skip completely empty rows
    if (!numero && !usuario) continue
    rows.push({
      tarifa: String(r[COL_MAP.tarifa] ?? '').trim(),
      perfil: String(r[COL_MAP.perfil] ?? '').trim(),
      observaciones: String(r[COL_MAP.observaciones] ?? '').trim(),
      numero,
      extension: String(r[COL_MAP.extension] ?? '').trim(),
      usuario,
      imei: String(r[COL_MAP.imei] ?? '').trim(),
      pin: String(r[COL_MAP.pin] ?? '').trim(),
      sim2: String(r[COL_MAP.sim2] ?? '').trim(),
      pukSim2: String(r[COL_MAP.pukSim2] ?? '').trim(),
      powerAppsId: String(r[COL_MAP.powerAppsId] ?? '').trim(),
      _rowIndex: i + 1, // Excel rows are 1-indexed, +1 because usedRange includes header
      _sheet: sheet,
    })
  }
  return rows
}

export async function fetchLineas(graph: GraphAPIClient): Promise<LineaRow[]> {
  const res = await graph.request(BASE + '/LINEAS/usedRange')
  return parseRows(res.values, 'LINEAS')
}

export async function fetchLineasVIP(graph: GraphAPIClient): Promise<LineaRow[]> {
  const res = await graph.request(BASE + '/LINEAS%20VIP/usedRange')
  return parseRows(res.values, 'LINEAS VIP')
}

export async function fetchTarifas(graph: GraphAPIClient): Promise<TarifaInfo[]> {
  const res = await graph.request(BASE + '/TARIFA/usedRange')
  if (!res.values || res.values.length < 2) return []
  const tarifas: TarifaInfo[] = []
  for (let i = 1; i < res.values.length; i++) {
    const row = res.values[i]
    if (!row || !row[0]) continue
    tarifas.push({
      nombre: String(row[0]).trim(),
      datos: String(row[1] ?? '').trim(),
    })
  }
  return tarifas
}

/** Editable fields and their column indices */
export const EDITABLE_COLS: Record<string, number> = {
  usuario: COL_MAP.usuario,
  tarifa: COL_MAP.tarifa,
  perfil: COL_MAP.perfil,
  observaciones: COL_MAP.observaciones,
}

export async function updateLineaCell(
  graph: GraphAPIClient,
  sheet: string,
  rowIndex: number,
  colIndex: number,
  value: string
): Promise<void> {
  const cellRef = colToLetter(colIndex) + rowIndex
  const encodedSheet = encodeURIComponent(sheet)
  await graph.request(
    BASE + '/' + encodedSheet + "/range(address='" + cellRef + "')",
    {
      method: 'PATCH',
      body: JSON.stringify({ values: [[value]] }),
    }
  )
}
