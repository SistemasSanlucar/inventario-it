/**
 * Clasificador de "tipos" del catálogo en categorías vigiladas.
 *
 * El modelo de datos (StockControl_Catalogo) NO almacena ninguna categoría
 * formal: `tipo` es un texto libre introducido por el administrador
 * (p.ej. "Portátil", "Móvil", "iPhone", "Monitor 24", …).
 *
 * Para la auditoría necesitamos saber qué `tipo`s cuentan como
 * portátil / móvil / monitor. Esto se hace por coincidencia de patrones
 * (case-insensitive, insensible a acentos).
 *
 * Si tu catálogo usa nombres distintos a los de aquí, EDITA este fichero
 * añadiendo tus propios strings al array correspondiente. La UI de la
 * sección Auditoría muestra qué `tipo`s de tu catálogo real se han
 * clasificado en cada categoría para que puedas verificarlo en vivo.
 */

export type ControlledCategory = 'portatil' | 'movil' | 'monitor'

/**
 * Patrones por categoría. Cada patrón se compara contra el `tipo` normalizado
 * (lowercase, sin acentos). Basta con que CONTENGA el patrón para considerarlo
 * de esa categoría.
 */
const CATEGORY_PATTERNS: Record<ControlledCategory, string[]> = {
  portatil: ['portatil', 'laptop', 'macbook', 'notebook'],
  movil: ['movil', 'telefono', 'phone', 'iphone', 'android', 'smartphone'],
  monitor: ['monitor', 'pantalla', 'display'],
}

export const CATEGORY_LABELS: Record<ControlledCategory, string> = {
  portatil: 'Portátil',
  movil: 'Móvil',
  monitor: 'Monitor',
}

/** Elimina acentos y pasa a minúsculas */
function normalize(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

/**
 * Devuelve la categoría controlada del `tipo` dado, o null si no es
 * ninguna de las vigiladas.
 *
 * Precedencia: el primer patrón que matchee gana. El orden importa:
 * si un `tipo` matchea más de uno (p.ej. "monitor-portatil" matchearía
 * portátil y monitor), se devuelve el primero del Record.
 */
export function classifyTipo(tipo: string): ControlledCategory | null {
  const n = normalize(tipo)
  if (!n) return null
  for (const cat of Object.keys(CATEGORY_PATTERNS) as ControlledCategory[]) {
    for (const pattern of CATEGORY_PATTERNS[cat]) {
      if (n.includes(pattern)) return cat
    }
  }
  return null
}

/**
 * Dado el catálogo (lista de tipos), devuelve qué tipos encajan en cada
 * categoría vigilada. Útil para que la UI muestre al usuario qué está
 * siendo clasificado como qué, y detecte si algún tipo real del catálogo
 * no está siendo reconocido.
 */
export function getCategoryBreakdown(tipos: string[]): {
  portatil: string[]
  movil: string[]
  monitor: string[]
  otros: string[]
} {
  const result = { portatil: [] as string[], movil: [] as string[], monitor: [] as string[], otros: [] as string[] }
  for (const tipo of tipos) {
    const cat = classifyTipo(tipo)
    if (cat) result[cat].push(tipo)
    else result.otros.push(tipo)
  }
  return result
}
