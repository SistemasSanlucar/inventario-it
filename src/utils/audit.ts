/**
 * Motor de auditoría de inventario. Solo lectura.
 *
 * Produce 4 tipos de anomalías cruzando el estado en memoria
 * (state.activos + state.assignments). Ninguna función aquí escribe
 * en SharePoint; son puras y testeables.
 *
 * Reglas:
 *  - Email del empleado SIEMPRE normalizado (lowercase + trim).
 *  - Si un empleado no tiene email → la anomalía se marca
 *    needsReview=true. NUNCA se agrupa por nombre.
 *  - Préstamos y asignaciones ambas con estado 'Activo' cuentan
 *    como "vigente" (misma semántica que el UI).
 *  - Devoluciones parciales: ProductosAsignados contiene SOLO los
 *    equipos que siguen en poder del empleado (verificado en
 *    DataManager.returnMaterial, línea 746-754) → representa el estado
 *    actual, no el histórico.
 */

import type { Activo } from '../types/equipment'
import type { Assignment, AssignmentProduct } from '../types/assignment'
import { classifyTipo, type ControlledCategory, CATEGORY_LABELS } from './categoryClassifier'

export type AnomalyType =
  | 'multi_equipment'          // Empleado con >1 portátil/móvil/monitor
  | 'stock_but_assigned'       // Activo.estado='Almacen' pero aparece en asignación vigente
  | 'assigned_without_record'  // Activo.estado='Asignado' pero sin asignación vigente que lo contenga
  | 'different_employees'      // Mismo activo en 2 asignaciones vigentes de empleados distintos

export type AnomalySeverity = 'critical' | 'warning' | 'info'

export interface AuditAnomaly {
  type: AnomalyType
  severity: AnomalySeverity
  reason: string
  needsReview?: boolean  // true si falta info crítica (ej. email vacío)

  // Contexto (según tipo)
  empleado?: { nombre: string; email: string }
  category?: ControlledCategory
  activo?: { id: string; idEtiqueta: string; tipo: string; modelo: string; estado: string }
  activos?: Array<{ id: string; idEtiqueta: string; tipo: string; modelo: string; estado: string }>  // para multi_equipment
  assignment?: { id: string; fechaAsignacion: string; esPrestamo: boolean; tecnico: string }
  assignments?: Array<{ id: string; empleadoEmail: string; empleadoNombre: string; fechaAsignacion: string }>  // para different_employees
  evidence: Record<string, any>  // bruto, para que la UI lo muestre expandible
}

export interface AuditReport {
  anomalies: AuditAnomaly[]
  counts: Record<AnomalyType, number>
  totalReviewed: {
    activos: number
    assignments: number
    employees: number
  }
}

const normalizeEmail = (e: string | undefined | null) => (e || '').toLowerCase().trim()

/** Asignación "vigente" = estado 'Activo' o 'Parcial' (en parcial sigue habiendo material en poder del empleado) */
const isActive = (a: Assignment) => a.estado === 'Activo' || a.estado === 'Parcial'

/**
 * Extrae los equipos (items con idEtiqueta) de una asignación activa.
 * Los fungibles (sin idEtiqueta) se ignoran para la auditoría de equipos.
 */
function getEquiposFromAssignment(a: Assignment): AssignmentProduct[] {
  const prods = Array.isArray(a.productosAsignados) ? a.productosAsignados : []
  return prods.filter((p) => !!p.idEtiqueta)
}

/* ─────────────────────────────────────────────────────────────────
   #1  multi_equipment
   Para cada empleado (agrupado por email normalizado), contar los
   activos vigentes por categoría. Si hay >1 en portátil/móvil/monitor,
   anomalía.
   La fuente autoritativa es state.activos filtrado por
   estado='Asignado' + emailAsignadoA.
───────────────────────────────────────────────────────────────── */
function detectMultiEquipment(activos: Activo[]): AuditAnomaly[] {
  const anomalies: AuditAnomaly[] = []
  // Agrupar activos asignados por (email, categoria)
  const byEmployeeCategory = new Map<string, Map<ControlledCategory, Activo[]>>()
  const noEmailActivos: Record<ControlledCategory, Activo[]> = { portatil: [], movil: [], monitor: [] }

  for (const a of activos) {
    if (a.estado !== 'Asignado') continue
    const cat = classifyTipo(a.tipo)
    if (!cat) continue  // tipo no vigilado
    const email = normalizeEmail(a.emailAsignadoA)
    if (!email) {
      noEmailActivos[cat].push(a)
      continue
    }
    if (!byEmployeeCategory.has(email)) byEmployeeCategory.set(email, new Map())
    const catMap = byEmployeeCategory.get(email)!
    if (!catMap.has(cat)) catMap.set(cat, [])
    catMap.get(cat)!.push(a)
  }

  // Emplear nombre más reciente si hay varias filas por empleado
  for (const [email, catMap] of byEmployeeCategory.entries()) {
    for (const [cat, items] of catMap.entries()) {
      if (items.length < 2) continue
      const nombre = items[0].asignadoA || '(sin nombre)'
      anomalies.push({
        type: 'multi_equipment',
        severity: 'warning',
        reason: `${nombre} tiene ${items.length} ${CATEGORY_LABELS[cat].toLowerCase()}(s) asignado(s). La norma es 1 por empleado.`,
        empleado: { nombre, email },
        category: cat,
        activos: items.map((x) => ({ id: x.id, idEtiqueta: x.idEtiqueta, tipo: x.tipo, modelo: x.modelo, estado: x.estado })),
        evidence: {
          emailNormalizado: email,
          categoria: CATEGORY_LABELS[cat],
          cantidad: items.length,
          ids: items.map((x) => x.idEtiqueta),
        },
      })
    }
  }

  // Activos asignados sin email → cada uno es revisión manual
  for (const cat of Object.keys(noEmailActivos) as ControlledCategory[]) {
    for (const a of noEmailActivos[cat]) {
      anomalies.push({
        type: 'multi_equipment',
        severity: 'info',
        reason: `Equipo ${a.idEtiqueta} figura como "Asignado" a "${a.asignadoA || '(sin nombre)'}" pero sin email. No se puede comprobar duplicidad por empleado.`,
        needsReview: true,
        empleado: { nombre: a.asignadoA || '(sin nombre)', email: '' },
        category: cat,
        activo: { id: a.id, idEtiqueta: a.idEtiqueta, tipo: a.tipo, modelo: a.modelo, estado: a.estado },
        evidence: { motivo: 'emailAsignadoA vacío en el activo', idEtiqueta: a.idEtiqueta },
      })
    }
  }

  return anomalies
}

/* ─────────────────────────────────────────────────────────────────
   #2  stock_but_assigned
   Activo con estado='Almacen' que figura dentro de los
   productosAsignados de una asignación vigente.
───────────────────────────────────────────────────────────────── */
function detectStockButAssigned(activos: Activo[], assignments: Assignment[]): AuditAnomaly[] {
  const anomalies: AuditAnomaly[] = []
  const activosByEtiqueta = new Map<string, Activo>()
  for (const a of activos) {
    if (a.idEtiqueta) activosByEtiqueta.set(a.idEtiqueta.toUpperCase(), a)
  }
  for (const asg of assignments) {
    if (!isActive(asg)) continue
    for (const eq of getEquiposFromAssignment(asg)) {
      const id = (eq.idEtiqueta || '').toUpperCase()
      if (!id) continue
      const activo = activosByEtiqueta.get(id)
      if (!activo) continue
      if (activo.estado === 'Almacen') {
        anomalies.push({
          type: 'stock_but_assigned',
          severity: 'critical',
          reason: `El equipo ${activo.idEtiqueta} figura en una asignación vigente de ${asg.nombreEmpleado} pero su estado es "Almacén".`,
          empleado: { nombre: asg.nombreEmpleado, email: normalizeEmail(asg.emailEmpleado) },
          activo: { id: activo.id, idEtiqueta: activo.idEtiqueta, tipo: activo.tipo, modelo: activo.modelo, estado: activo.estado },
          assignment: { id: asg.id, fechaAsignacion: asg.fechaAsignacion, esPrestamo: asg.esPrestamo, tecnico: asg.tecnicoResponsable },
          evidence: {
            activoEstado: activo.estado,
            asignacionEstado: asg.estado,
            esPrestamo: asg.esPrestamo,
            posibleCausa: 'cambiarEstadoActivo no se ejecutó al asignar, o se forzó manualmente el estado en SharePoint.',
          },
        })
      }
    }
  }
  return anomalies
}

/* ─────────────────────────────────────────────────────────────────
   #3  assigned_without_record
   Activo con estado='Asignado' y emailAsignadoA, pero ninguna
   asignación vigente lo contiene.
───────────────────────────────────────────────────────────────── */
function detectAssignedWithoutRecord(activos: Activo[], assignments: Assignment[]): AuditAnomaly[] {
  const anomalies: AuditAnomaly[] = []
  // Set de idEtiquetas que aparecen en asignaciones vigentes
  const inActiveAssignments = new Set<string>()
  for (const asg of assignments) {
    if (!isActive(asg)) continue
    for (const eq of getEquiposFromAssignment(asg)) {
      if (eq.idEtiqueta) inActiveAssignments.add(eq.idEtiqueta.toUpperCase())
    }
  }
  for (const a of activos) {
    if (a.estado !== 'Asignado') continue
    const id = (a.idEtiqueta || '').toUpperCase()
    if (!id) continue
    if (inActiveAssignments.has(id)) continue  // Está en al menos una asignación vigente
    anomalies.push({
      type: 'assigned_without_record',
      severity: 'critical',
      reason: `El equipo ${a.idEtiqueta} figura como "Asignado" a ${a.asignadoA || '(sin nombre)'} pero no existe ninguna asignación vigente que lo contenga.`,
      empleado: { nombre: a.asignadoA || '(sin nombre)', email: normalizeEmail(a.emailAsignadoA) },
      activo: { id: a.id, idEtiqueta: a.idEtiqueta, tipo: a.tipo, modelo: a.modelo, estado: a.estado },
      evidence: {
        emailAsignadoA: a.emailAsignadoA,
        fechaAsignacion: a.fechaAsignacion,
        posibleCausa: 'La asignación se eliminó pero el activo no se devolvió al almacén, o se marcó como asignado manualmente sin crear la asignación.',
      },
    })
  }
  return anomalies
}

/* ─────────────────────────────────────────────────────────────────
   #4  different_employees
   Mismo idEtiqueta en productosAsignados de 2+ asignaciones vigentes
   con empleados distintos (comparando por email normalizado).
───────────────────────────────────────────────────────────────── */
function detectDifferentEmployees(activos: Activo[], assignments: Assignment[]): AuditAnomaly[] {
  const anomalies: AuditAnomaly[] = []
  const activosByEtiqueta = new Map<string, Activo>()
  for (const a of activos) {
    if (a.idEtiqueta) activosByEtiqueta.set(a.idEtiqueta.toUpperCase(), a)
  }
  // Para cada idEtiqueta, lista de asignaciones vigentes que lo contienen
  const occurrences = new Map<string, Array<{ asg: Assignment }>>()
  for (const asg of assignments) {
    if (!isActive(asg)) continue
    for (const eq of getEquiposFromAssignment(asg)) {
      const id = (eq.idEtiqueta || '').toUpperCase()
      if (!id) continue
      if (!occurrences.has(id)) occurrences.set(id, [])
      occurrences.get(id)!.push({ asg })
    }
  }
  for (const [id, list] of occurrences.entries()) {
    if (list.length < 2) continue
    // Agrupar por email normalizado; si todos tienen el mismo email → NO es anomalía
    // (podría ser 2 préstamos superpuestos al mismo empleado — raro pero no cruzado)
    const emails = new Set(list.map(({ asg }) => normalizeEmail(asg.emailEmpleado)))
    const hasEmptyEmail = emails.has('')
    if (emails.size < 2 && !hasEmptyEmail) continue  // Mismo email para todos → no es duplicidad entre empleados
    const activo = activosByEtiqueta.get(id)
    const empleadosDistintos = Array.from(new Set(list.map(({ asg }) => asg.nombreEmpleado))).filter(Boolean)
    anomalies.push({
      type: 'different_employees',
      severity: 'critical',
      reason: `El equipo ${activo?.idEtiqueta || id} aparece en asignaciones vigentes de ${empleadosDistintos.length} empleados distintos: ${empleadosDistintos.join(', ')}.`,
      needsReview: hasEmptyEmail,
      activo: activo ? { id: activo.id, idEtiqueta: activo.idEtiqueta, tipo: activo.tipo, modelo: activo.modelo, estado: activo.estado } : undefined,
      assignments: list.map(({ asg }) => ({
        id: asg.id,
        empleadoEmail: normalizeEmail(asg.emailEmpleado),
        empleadoNombre: asg.nombreEmpleado,
        fechaAsignacion: asg.fechaAsignacion,
      })),
      evidence: {
        idEtiqueta: id,
        asignacionesIds: list.map(({ asg }) => asg.id),
        emailsNormalizados: Array.from(emails),
      },
    })
  }
  return anomalies
}

/* ─────────────────────────────────────────────────────────────────
   Entry point
───────────────────────────────────────────────────────────────── */
export function runAudit(state: { activos: Activo[]; assignments: Assignment[] }): AuditReport {
  const activos = state.activos || []
  const assignments = state.assignments || []
  const anomalies: AuditAnomaly[] = [
    ...detectMultiEquipment(activos),
    ...detectStockButAssigned(activos, assignments),
    ...detectAssignedWithoutRecord(activos, assignments),
    ...detectDifferentEmployees(activos, assignments),
  ]
  const counts: Record<AnomalyType, number> = {
    multi_equipment: 0,
    stock_but_assigned: 0,
    assigned_without_record: 0,
    different_employees: 0,
  }
  for (const a of anomalies) counts[a.type]++
  const uniqueEmails = new Set<string>()
  for (const a of assignments) {
    const e = normalizeEmail(a.emailEmpleado)
    if (e) uniqueEmails.add(e)
  }
  for (const a of activos) {
    const e = normalizeEmail(a.emailAsignadoA)
    if (e) uniqueEmails.add(e)
  }
  return {
    anomalies,
    counts,
    totalReviewed: {
      activos: activos.length,
      assignments: assignments.filter(isActive).length,
      employees: uniqueEmails.size,
    },
  }
}

export const ANOMALY_LABELS: Record<AnomalyType, string> = {
  multi_equipment: 'Empleado con duplicidades',
  stock_but_assigned: 'Equipo en almacén pero asignado',
  assigned_without_record: 'Asignado sin asignación vigente',
  different_employees: 'Equipo en varios empleados',
}

export const ANOMALY_ICONS: Record<AnomalyType, string> = {
  multi_equipment: '👥',
  stock_but_assigned: '📦',
  assigned_without_record: '❓',
  different_employees: '⚠️',
}
