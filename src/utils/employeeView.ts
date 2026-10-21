/**
 * Helpers puros para la Ficha 360° del empleado.
 *
 * Identificación: email normalizado (lowercase + trim). NUNCA agrupamos por
 * coincidencia de nombre. Si un empleado no tiene email, se trata como
 * registro aislado (no se mezcla con otros sin email).
 *
 * Historial: `HistoryEntry.usuario` es un STRING libre con el nombre del
 * empleado — no hay email. Esto significa que si dos empleados comparten
 * nombre, su historial se mezcla. La función `getEmployeeView` detecta ese
 * caso y lo señala en `historyNameCollision`.
 */

import type { Activo } from '../types/equipment'
import type { Assignment, AssignmentProduct } from '../types/assignment'
import type { HistoryEntry } from '../types/history'
import { classifyTipo, type ControlledCategory } from './categoryClassifier'

export const normalizeEmail = (e: string | undefined | null) => (e || '').toLowerCase().trim()

export interface EmployeeIndex {
  email: string          // normalizado
  nombre: string         // mejor nombre conocido (último visto)
  departamento: string
  puesto: string
  equiposActivos: number // activos.estado='Asignado' con este email
  asignacionesActivas: number
  prestamosActivos: number
}

/**
 * Construye un índice de empleados únicos a partir del estado.
 * Cada entrada es un email distinto. Registros sin email no se incluyen
 * en el índice principal (habría que listarlos aparte si se necesitan).
 */
export function buildEmployeeIndex(state: {
  activos: Activo[]
  assignments: Assignment[]
}): EmployeeIndex[] {
  const byEmail = new Map<string, EmployeeIndex>()

  // Semilla desde activos.emailAsignadoA (empleados que tienen equipo asignado)
  for (const a of state.activos || []) {
    if (a.estado !== 'Asignado') continue
    const email = normalizeEmail(a.emailAsignadoA)
    if (!email) continue
    if (!byEmail.has(email)) {
      byEmail.set(email, {
        email,
        nombre: a.asignadoA || '',
        departamento: '',
        puesto: '',
        equiposActivos: 0,
        asignacionesActivas: 0,
        prestamosActivos: 0,
      })
    }
    byEmail.get(email)!.equiposActivos++
  }

  // Fusionar con assignments (añade empleados que solo tienen fungible, o
  // que acaban de ser devueltos y aún figuran en una asignación activa)
  for (const asg of state.assignments || []) {
    const email = normalizeEmail(asg.emailEmpleado)
    if (!email) continue
    if (!byEmail.has(email)) {
      byEmail.set(email, {
        email,
        nombre: asg.nombreEmpleado || '',
        departamento: asg.departamento || '',
        puesto: asg.puesto || '',
        equiposActivos: 0,
        asignacionesActivas: 0,
        prestamosActivos: 0,
      })
    }
    const entry = byEmail.get(email)!
    // Dpto/puesto más recientes (assignments viene ordenado desc por fecha en loadAllData)
    if (!entry.departamento && asg.departamento) entry.departamento = asg.departamento
    if (!entry.puesto && asg.puesto) entry.puesto = asg.puesto
    if (!entry.nombre && asg.nombreEmpleado) entry.nombre = asg.nombreEmpleado
    if (asg.estado === 'Activo' || asg.estado === 'Parcial') {
      entry.asignacionesActivas++
      if (asg.esPrestamo) entry.prestamosActivos++
    }
  }

  return Array.from(byEmail.values())
}

/**
 * Busca empleados cuyo nombre o email contenga la query (case-insensitive).
 * Devuelve ordenados por relevancia: primero por match exacto en email,
 * luego por match al inicio del nombre, luego el resto.
 */
export function searchEmployees(
  index: EmployeeIndex[],
  query: string,
  limit = 10
): EmployeeIndex[] {
  const q = (query || '').toLowerCase().trim()
  if (q.length < 2) return []
  const matches = index.filter(
    (e) => e.email.includes(q) || e.nombre.toLowerCase().includes(q)
  )
  matches.sort((a, b) => {
    const aExact = a.email === q ? 2 : a.nombre.toLowerCase().startsWith(q) ? 1 : 0
    const bExact = b.email === q ? 2 : b.nombre.toLowerCase().startsWith(q) ? 1 : 0
    if (aExact !== bExact) return bExact - aExact
    return a.nombre.localeCompare(b.nombre)
  })
  return matches.slice(0, limit)
}

export interface EmployeeViewEquipo {
  id: string
  idEtiqueta: string
  tipo: string
  modelo: string
  numSerie: string
  estado: string
  fechaAsignacion: string | null
  categoria: ControlledCategory | null  // null si no es portátil/móvil/monitor
}

export interface EmployeeViewPrestamo {
  id: string
  fechaAsignacion: string
  fechaDevolucionPrevista: string | null  // extraída de observaciones; null si no se encontró
  cantidadProductos: number
  productos: AssignmentProduct[]
  vencido: boolean
  tecnicoResponsable: string
}

export interface EmployeeViewHistoryItem {
  id: string
  fecha: string
  tipo: string
  producto: string
  cantidad: number
  tecnico: string
  idEtiqueta: string
  motivo: string
}

export interface EmployeeView {
  email: string
  nombre: string
  departamento: string
  puesto: string
  equipos: EmployeeViewEquipo[]
  prestamosActivos: EmployeeViewPrestamo[]
  asignacionesActivas: Assignment[]        // completas, por si se necesitan
  historial: EmployeeViewHistoryItem[]     // ordenado desc por fecha; VACÍO si historyWithheld
  duplicidades: { category: ControlledCategory; count: number; ids: string[] }[]
  // Diagnóstico de datos
  historyNameCollision: boolean   // true si otros empleados en el sistema tienen el mismo nombre y email distinto
  historyLookupByName: boolean    // true si el historial se recuperó por nombre (siempre true salvo esquema futuro)
  historyWithheld: boolean        // true si NO podemos atribuir el historial con seguridad → la UI muestra aviso y oculta la tabla
  historyWithheldReason?: string  // mensaje explicativo cuando historyWithheld
}

/** Extrae la fecha prevista del formato "[Dev. prevista: DD/MM/YYYY] …" en observaciones. */
function extractFechaDevolucion(obs: string): string | null {
  const m = (obs || '').match(/\[Dev\. prevista:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\]/)
  if (!m) return null
  // Devuelve ISO date (YYYY-MM-DD) para formateo uniforme
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

/**
 * Construye la ficha 360° de un empleado.
 */
export function getEmployeeView(
  state: {
    activos: Activo[]
    assignments: Assignment[]
    history: HistoryEntry[]
  },
  identifier: { email: string; nombre?: string }
): EmployeeView {
  const email = normalizeEmail(identifier.email)
  if (!email) {
    return {
      email: '',
      nombre: identifier.nombre || '',
      departamento: '',
      puesto: '',
      equipos: [],
      prestamosActivos: [],
      asignacionesActivas: [],
      historial: [],
      duplicidades: [],
      historyNameCollision: false,
      historyLookupByName: true,
      historyWithheld: false,
    }
  }

  // Empleado: mejor nombre, dpto, puesto desde cualquier fuente disponible
  let nombre = identifier.nombre || ''
  let departamento = ''
  let puesto = ''
  for (const asg of state.assignments || []) {
    if (normalizeEmail(asg.emailEmpleado) !== email) continue
    if (!nombre && asg.nombreEmpleado) nombre = asg.nombreEmpleado
    if (!departamento && asg.departamento) departamento = asg.departamento
    if (!puesto && asg.puesto) puesto = asg.puesto
  }
  if (!nombre) {
    for (const a of state.activos || []) {
      if (normalizeEmail(a.emailAsignadoA) === email && a.asignadoA) {
        nombre = a.asignadoA
        break
      }
    }
  }

  // Equipos actuales (fuente de verdad: state.activos)
  const equipos: EmployeeViewEquipo[] = (state.activos || [])
    .filter((a) => a.estado === 'Asignado' && normalizeEmail(a.emailAsignadoA) === email)
    .map((a) => ({
      id: a.id,
      idEtiqueta: a.idEtiqueta,
      tipo: a.tipo,
      modelo: a.modelo,
      numSerie: a.numSerie,
      estado: a.estado,
      fechaAsignacion: a.fechaAsignacion,
      categoria: classifyTipo(a.tipo),
    }))
    .sort((x, y) => {
      // Priorizar categorías vigiladas
      const order = { portatil: 0, movil: 1, monitor: 2 } as Record<string, number>
      const ox = x.categoria ? order[x.categoria] : 99
      const oy = y.categoria ? order[y.categoria] : 99
      if (ox !== oy) return ox - oy
      return x.tipo.localeCompare(y.tipo)
    })

  // Asignaciones vigentes (Activo o Parcial)
  const asignacionesActivas = (state.assignments || []).filter(
    (asg) =>
      normalizeEmail(asg.emailEmpleado) === email &&
      (asg.estado === 'Activo' || asg.estado === 'Parcial')
  )

  // Préstamos pendientes
  const now = new Date()
  const prestamosActivos: EmployeeViewPrestamo[] = asignacionesActivas
    .filter((a) => a.esPrestamo)
    .map((a) => {
      const fdISO = extractFechaDevolucion(a.observaciones)
      const vencido = fdISO ? new Date(fdISO + 'T23:59:59') < now : false
      return {
        id: a.id,
        fechaAsignacion: a.fechaAsignacion,
        fechaDevolucionPrevista: fdISO,
        cantidadProductos: a.cantidadProductos,
        productos: Array.isArray(a.productosAsignados) ? a.productosAsignados : [],
        vencido,
        tecnicoResponsable: a.tecnicoResponsable,
      }
    })

  // Historial — por NOMBRE (único campo disponible). Documentar colisión.
  const historial: EmployeeViewHistoryItem[] = []
  if (nombre) {
    const lowerNombre = nombre.toLowerCase()
    for (const h of state.history || []) {
      if ((h.usuario || '').toLowerCase() === lowerNombre) {
        historial.push({
          id: h.id,
          fecha: h.fecha,
          tipo: h.tipo,
          producto: h.producto,
          cantidad: h.cantidad,
          tecnico: h.tecnico,
          idEtiqueta: h.idEtiqueta,
          motivo: h.motivo,
        })
      }
    }
    historial.sort((a, b) => (b.fecha > a.fecha ? 1 : -1))
  }

  // Colisión de nombre: hay OTRA persona con el mismo nombre y email distinto
  // en el sistema (activos o assignments)
  let historyNameCollision = false
  if (nombre) {
    const lowerNombre = nombre.toLowerCase()
    const otherEmails = new Set<string>()
    for (const asg of state.assignments || []) {
      if (
        (asg.nombreEmpleado || '').toLowerCase() === lowerNombre &&
        normalizeEmail(asg.emailEmpleado) !== email &&
        normalizeEmail(asg.emailEmpleado) !== ''
      ) {
        otherEmails.add(normalizeEmail(asg.emailEmpleado))
      }
    }
    for (const a of state.activos || []) {
      if (
        (a.asignadoA || '').toLowerCase() === lowerNombre &&
        normalizeEmail(a.emailAsignadoA) !== email &&
        normalizeEmail(a.emailAsignadoA) !== ''
      ) {
        otherEmails.add(normalizeEmail(a.emailAsignadoA))
      }
    }
    historyNameCollision = otherEmails.size > 0
  }

  // Duplicidades por categoría (mismo detector que la auditoría)
  const byCategory = new Map<ControlledCategory, string[]>()
  for (const eq of equipos) {
    if (!eq.categoria) continue
    if (!byCategory.has(eq.categoria)) byCategory.set(eq.categoria, [])
    byCategory.get(eq.categoria)!.push(eq.idEtiqueta)
  }
  const duplicidades: EmployeeView['duplicidades'] = []
  for (const [cat, ids] of byCategory.entries()) {
    if (ids.length > 1) duplicidades.push({ category: cat, count: ids.length, ids })
  }

  // Si hay colisión de nombre, NO podemos atribuir el historial con
  // seguridad a este empleado. Vaciamos la lista y marcamos la bandera
  // para que la UI muestre un aviso explícito en vez de datos ambiguos.
  const historyWithheld = historyNameCollision
  const safeHistorial = historyWithheld ? [] : historial
  const historyWithheldReason = historyWithheld
    ? `Existen otras personas en el sistema con el mismo nombre ("${nombre}") y emails distintos. El historial se guarda por nombre y no se puede atribuir con certeza a este empleado.`
    : undefined

  return {
    email,
    nombre,
    departamento,
    puesto,
    equipos,
    prestamosActivos,
    asignacionesActivas,
    historial: safeHistorial,
    duplicidades,
    historyNameCollision,
    historyLookupByName: true,
    historyWithheld,
    historyWithheldReason,
  }
}
