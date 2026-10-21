/**
 * Tests del motor de auditoría. Standalone — ejecutar con:
 *   npx tsc --project tsconfig.audit-tests.json
 *   node ./.audit-test-out/src/utils/audit.test.js
 *
 * NO forma parte del bundle de producción (está incluido en tsconfig
 * principal pero no se referencia desde ningún punto de entrada).
 */

import { runAudit, type AuditAnomaly, type AuditReport } from './audit'
import { classifyTipo, getCategoryBreakdown } from './categoryClassifier'
import type { Activo } from '../types/equipment'
import type { Assignment, AssignmentProduct } from '../types/assignment'

// ─────────── helpers ───────────
let failed = 0
let passed = 0
function test(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log('  ✅ ' + name)
  } catch (e: any) {
    failed++
    console.log('  ❌ ' + name)
    console.log('     ' + (e.message || e))
  }
}
function assert(cond: any, msg: string) {
  if (!cond) throw new Error(msg)
}
function assertEq(actual: any, expected: any, msg?: string) {
  if (actual !== expected) {
    throw new Error((msg || 'assertEq') + ' — expected ' + JSON.stringify(expected) + ' got ' + JSON.stringify(actual))
  }
}

const activo = (overrides: Partial<Activo>): Activo => ({
  id: 'sp_' + Math.random().toString(36).slice(2),
  idEtiqueta: 'SLF-26-00001',
  tipo: 'Portátil',
  modelo: 'Dell XPS',
  estado: 'Almacen',
  ubicacion: '',
  numSerie: 'SN123',
  notas: '',
  sociedad: 'SLF',
  asignadoA: '',
  emailAsignadoA: '',
  fechaAsignacion: null,
  transitoDestino: '',
  motivoIncidencia: '',
  proveedor: '',
  numAlbaran: '',
  fechaCompra: null,
  fechaGarantia: null,
  accesorios: '',
  etiquetaImpresa: true,
  ...overrides,
})

const asg = (overrides: Partial<Assignment>): Assignment => ({
  id: 'ag_' + Math.random().toString(36).slice(2),
  nombreEmpleado: 'Juan Pérez',
  emailEmpleado: 'juan.perez@sanlucar.com',
  departamento: 'IT',
  puesto: 'Técnico',
  fechaIncorporacion: '2024-01-01',
  productosAsignados: [],
  cantidadProductos: 0,
  firmaEmpleado: '',
  tecnicoResponsable: 'Admin IT',
  fechaAsignacion: '2026-10-15T10:00:00Z',
  estado: 'Activo',
  observaciones: '',
  esPrestamo: false,
  ...overrides,
})

const eqProd = (idEtiqueta: string, extra?: Partial<AssignmentProduct>): AssignmentProduct => ({
  nombre: 'Dell XPS',
  idEtiqueta,
  esEquipo: true,
  ...extra,
})

// ─────────── category classifier ───────────
console.log('\n[categoryClassifier]')

test('clasifica portátil con/sin acento', () => {
  assertEq(classifyTipo('Portátil'), 'portatil')
  assertEq(classifyTipo('portatil'), 'portatil')
  assertEq(classifyTipo('Laptop'), 'portatil')
  assertEq(classifyTipo('MacBook Pro'), 'portatil')
})
test('clasifica móvil', () => {
  assertEq(classifyTipo('Móvil'), 'movil')
  assertEq(classifyTipo('iPhone 16'), 'movil')
  assertEq(classifyTipo('Smartphone'), 'movil')
  assertEq(classifyTipo('Telefono'), 'movil')
})
test('clasifica monitor', () => {
  assertEq(classifyTipo('Monitor'), 'monitor')
  assertEq(classifyTipo('Pantalla 24'), 'monitor')
})
test('devuelve null para tipos no vigilados', () => {
  assertEq(classifyTipo('Cable HDMI'), null)
  assertEq(classifyTipo('Ratón'), null)
  assertEq(classifyTipo(''), null)
})
test('getCategoryBreakdown agrupa correctamente', () => {
  const b = getCategoryBreakdown(['Portátil', 'HP EliteBook', 'iPhone 16', 'Monitor Dell', 'Cable HDMI', 'Ratón'])
  assert(b.portatil.includes('Portátil'), 'portatil[Portátil]')
  assert(b.movil.includes('iPhone 16'), 'movil[iPhone 16]')
  assert(b.monitor.includes('Monitor Dell'), 'monitor[Monitor Dell]')
  assert(b.otros.includes('Cable HDMI'), 'otros[Cable HDMI]')
  assert(b.otros.includes('Ratón'), 'otros[Ratón]')
  // HP EliteBook no es portátil por sí solo
  assert(b.otros.includes('HP EliteBook'), 'otros[HP EliteBook] — HP no es patrón')
})

// ─────────── audit baseline ───────────
console.log('\n[audit — baseline]')

test('estado limpio no produce anomalías', () => {
  const activos: Activo[] = [
    activo({ idEtiqueta: 'SLF-26-00001', tipo: 'Portátil', estado: 'Almacen' }),
    activo({ idEtiqueta: 'SLF-26-00002', tipo: 'Monitor', estado: 'Asignado', asignadoA: 'Juan Pérez', emailAsignadoA: 'juan.perez@sanlucar.com' }),
  ]
  const assignments: Assignment[] = [
    asg({ estado: 'Activo', productosAsignados: [eqProd('SLF-26-00002')] }),
  ]
  const r = runAudit({ activos, assignments })
  assertEq(r.anomalies.length, 0, 'sin anomalías')
})

// ─────────── #1 multi_equipment ───────────
console.log('\n[audit — multi_equipment]')

test('empleado con 2 portátiles asignados', () => {
  const activos: Activo[] = [
    activo({ idEtiqueta: 'SLF-26-00001', tipo: 'Portátil', estado: 'Asignado', asignadoA: 'Juan Pérez', emailAsignadoA: 'juan.perez@sanlucar.com' }),
    activo({ idEtiqueta: 'SLF-26-00002', tipo: 'Portátil', estado: 'Asignado', asignadoA: 'Juan Pérez', emailAsignadoA: 'juan.perez@sanlucar.com' }),
    activo({ idEtiqueta: 'SLF-26-00003', tipo: 'Monitor', estado: 'Asignado', asignadoA: 'Juan Pérez', emailAsignadoA: 'juan.perez@sanlucar.com' }),
  ]
  const r = runAudit({ activos, assignments: [] })
  const multi = r.anomalies.filter((a) => a.type === 'multi_equipment' && !a.needsReview)
  assertEq(multi.length, 1, 'una anomalía (2 portátiles)')
  assertEq(multi[0].category, 'portatil')
  assertEq(multi[0].activos?.length, 2)
})

test('empleado con 1 portátil y 1 monitor NO es anomalía', () => {
  const activos: Activo[] = [
    activo({ idEtiqueta: 'SLF-26-00001', tipo: 'Portátil', estado: 'Asignado', asignadoA: 'Ana', emailAsignadoA: 'ana@sanlucar.com' }),
    activo({ idEtiqueta: 'SLF-26-00002', tipo: 'Monitor', estado: 'Asignado', asignadoA: 'Ana', emailAsignadoA: 'ana@sanlucar.com' }),
  ]
  const r = runAudit({ activos, assignments: [] })
  const multi = r.anomalies.filter((a) => a.type === 'multi_equipment')
  assertEq(multi.length, 0, 'sin duplicidades')
})

test('activo "Asignado" sin email marca needsReview, no agrupa por nombre', () => {
  const activos: Activo[] = [
    activo({ idEtiqueta: 'SLF-26-00001', tipo: 'Portátil', estado: 'Asignado', asignadoA: 'Juan Pérez', emailAsignadoA: '' }),
    activo({ idEtiqueta: 'SLF-26-00002', tipo: 'Portátil', estado: 'Asignado', asignadoA: 'Juan Pérez', emailAsignadoA: 'juan.perez@sanlucar.com' }),
  ]
  const r = runAudit({ activos, assignments: [] })
  const needsReview = r.anomalies.filter((a) => a.needsReview)
  assertEq(needsReview.length, 1, 'uno marcado como needsReview')
  // El otro (con email) está solo → NO es anomalía
  const multi = r.anomalies.filter((a) => a.type === 'multi_equipment' && !a.needsReview)
  assertEq(multi.length, 0, 'no se agrupa por nombre')
})

// ─────────── #2 stock_but_assigned ───────────
console.log('\n[audit — stock_but_assigned]')

test('equipo en Almacen pero en asignación activa', () => {
  const activos: Activo[] = [activo({ idEtiqueta: 'SLF-26-00001', tipo: 'Portátil', estado: 'Almacen' })]
  const assignments: Assignment[] = [
    asg({ estado: 'Activo', productosAsignados: [eqProd('SLF-26-00001')] }),
  ]
  const r = runAudit({ activos, assignments })
  const anom = r.anomalies.filter((a) => a.type === 'stock_but_assigned')
  assertEq(anom.length, 1)
  assertEq(anom[0].severity, 'critical')
})

test('equipo en Almacen con asignación Devuelta NO es anomalía', () => {
  const activos: Activo[] = [activo({ idEtiqueta: 'SLF-26-00001', estado: 'Almacen' })]
  const assignments: Assignment[] = [
    asg({ estado: 'Devuelto', productosAsignados: [eqProd('SLF-26-00001')] }),
  ]
  const r = runAudit({ activos, assignments })
  assertEq(r.anomalies.length, 0)
})

// ─────────── #3 assigned_without_record ───────────
console.log('\n[audit — assigned_without_record]')

test('activo Asignado sin asignación vigente', () => {
  const activos: Activo[] = [activo({ idEtiqueta: 'SLF-26-00001', estado: 'Asignado', asignadoA: 'Juan', emailAsignadoA: 'juan@x.com' })]
  const r = runAudit({ activos, assignments: [] })
  const anom = r.anomalies.filter((a) => a.type === 'assigned_without_record')
  assertEq(anom.length, 1)
})

test('activo Asignado con asignación vigente que lo contiene NO es anomalía', () => {
  const activos: Activo[] = [activo({ idEtiqueta: 'SLF-26-00001', estado: 'Asignado', asignadoA: 'Juan', emailAsignadoA: 'juan@x.com' })]
  const assignments: Assignment[] = [
    asg({ estado: 'Activo', nombreEmpleado: 'Juan', emailEmpleado: 'juan@x.com', productosAsignados: [eqProd('SLF-26-00001')] }),
  ]
  const r = runAudit({ activos, assignments })
  const anom = r.anomalies.filter((a) => a.type === 'assigned_without_record')
  assertEq(anom.length, 0)
})

test('activo Asignado dentro de asignación Parcial NO es anomalía', () => {
  const activos: Activo[] = [activo({ idEtiqueta: 'SLF-26-00001', estado: 'Asignado', asignadoA: 'Juan', emailAsignadoA: 'juan@x.com' })]
  const assignments: Assignment[] = [
    asg({ estado: 'Parcial', nombreEmpleado: 'Juan', emailEmpleado: 'juan@x.com', productosAsignados: [eqProd('SLF-26-00001')] }),
  ]
  const r = runAudit({ activos, assignments })
  const anom = r.anomalies.filter((a) => a.type === 'assigned_without_record')
  assertEq(anom.length, 0, 'parcial sigue siendo vigente')
})

// ─────────── #4 different_employees ───────────
console.log('\n[audit — different_employees]')

test('equipo en 2 asignaciones vigentes de empleados distintos', () => {
  const activos: Activo[] = [activo({ idEtiqueta: 'SLF-26-00001', estado: 'Asignado', asignadoA: 'Juan', emailAsignadoA: 'juan@x.com' })]
  const assignments: Assignment[] = [
    asg({ nombreEmpleado: 'Juan', emailEmpleado: 'juan@x.com', productosAsignados: [eqProd('SLF-26-00001')] }),
    asg({ nombreEmpleado: 'Ana', emailEmpleado: 'ana@x.com', productosAsignados: [eqProd('SLF-26-00001')] }),
  ]
  const r = runAudit({ activos, assignments })
  const anom = r.anomalies.filter((a) => a.type === 'different_employees')
  assertEq(anom.length, 1)
  assertEq(anom[0].severity, 'critical')
  assertEq(anom[0].assignments?.length, 2)
})

test('equipo en 2 asignaciones vigentes del MISMO empleado NO es anomalía cruzada', () => {
  const activos: Activo[] = [activo({ idEtiqueta: 'SLF-26-00001', estado: 'Asignado' })]
  const assignments: Assignment[] = [
    asg({ nombreEmpleado: 'Juan', emailEmpleado: 'juan@x.com', esPrestamo: false, productosAsignados: [eqProd('SLF-26-00001')] }),
    asg({ nombreEmpleado: 'Juan', emailEmpleado: 'JUAN@X.COM', esPrestamo: true, productosAsignados: [eqProd('SLF-26-00001')] }),
  ]
  const r = runAudit({ activos, assignments })
  const anom = r.anomalies.filter((a) => a.type === 'different_employees')
  assertEq(anom.length, 0, 'normaliza mayúsculas en el email')
})

// ─────────── Loan false-positive guard ───────────
console.log('\n[audit — préstamos y devoluciones parciales no son falsos positivos]')

test('préstamo normal (estado Activo) no genera falso positivo', () => {
  const activos: Activo[] = [activo({ idEtiqueta: 'SLF-26-00001', estado: 'Asignado', asignadoA: 'Juan', emailAsignadoA: 'juan@x.com' })]
  const assignments: Assignment[] = [
    asg({ esPrestamo: true, nombreEmpleado: 'Juan', emailEmpleado: 'juan@x.com', productosAsignados: [eqProd('SLF-26-00001')] }),
  ]
  const r = runAudit({ activos, assignments })
  assertEq(r.anomalies.length, 0, 'préstamo bien formado no es anomalía')
})

test('devolución parcial coherente no genera falso positivo', () => {
  // Asignación con 2 equipos, 1 devuelto (ProductosAsignados ya reescrito a 1)
  const activos: Activo[] = [
    activo({ idEtiqueta: 'SLF-26-00001', estado: 'Asignado', asignadoA: 'Juan', emailAsignadoA: 'juan@x.com' }),
    activo({ idEtiqueta: 'SLF-26-00002', estado: 'Almacen' }),  // ya devuelto
  ]
  const assignments: Assignment[] = [
    asg({ estado: 'Parcial', nombreEmpleado: 'Juan', emailEmpleado: 'juan@x.com', productosAsignados: [eqProd('SLF-26-00001')] }),
  ]
  const r = runAudit({ activos, assignments })
  assertEq(r.anomalies.length, 0)
})

// ─────────── Report counts ───────────
console.log('\n[audit — report metadata]')

test('counts y totalReviewed cuadran', () => {
  const activos: Activo[] = [
    activo({ idEtiqueta: 'SLF-26-00001', estado: 'Almacen' }),
    activo({ idEtiqueta: 'SLF-26-00002', estado: 'Asignado', asignadoA: 'Juan', emailAsignadoA: 'juan@x.com' }),
  ]
  const assignments: Assignment[] = [
    asg({ estado: 'Activo', nombreEmpleado: 'Juan', emailEmpleado: 'juan@x.com', productosAsignados: [eqProd('SLF-26-00002')] }),
    asg({ estado: 'Devuelto', nombreEmpleado: 'Juan', emailEmpleado: 'juan@x.com' }),
  ]
  const r = runAudit({ activos, assignments })
  assertEq(r.totalReviewed.activos, 2)
  assertEq(r.totalReviewed.assignments, 1, 'solo cuenta las vigentes')
  assertEq(r.totalReviewed.employees, 1, 'un único email entre activos y assignments')
  for (const k of Object.keys(r.counts)) assertEq((r.counts as any)[k], 0, 'counts[' + k + ']=0')
})

// ─────────── summary ───────────
console.log('\n──────────────────')
console.log('  ' + passed + ' passed, ' + failed + ' failed')
if (failed > 0) process.exit(1)
