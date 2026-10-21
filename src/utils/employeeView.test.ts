/**
 * Tests de la Ficha 360° del empleado.
 * Standalone — se compila con tsconfig.audit-tests.json y se ejecuta con node.
 */

import {
  normalizeEmail,
  buildEmployeeIndex,
  searchEmployees,
  getEmployeeView,
} from './employeeView'
import type { Activo } from '../types/equipment'
import type { Assignment, AssignmentProduct } from '../types/assignment'
import type { HistoryEntry } from '../types/history'

let passed = 0, failed = 0
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log('  ✅ ' + name) }
  catch (e: any) { failed++; console.log('  ❌ ' + name); console.log('     ' + (e.message || e)) }
}
function assert(c: any, m: string) { if (!c) throw new Error(m) }
function assertEq(a: any, b: any, m?: string) { if (a !== b) throw new Error((m||'')+' — expected '+JSON.stringify(b)+' got '+JSON.stringify(a)) }

const activo = (o: Partial<Activo>): Activo => ({
  id: 'sp_' + Math.random().toString(36).slice(2),
  idEtiqueta: 'SLF-26-00001', tipo: 'Portátil', modelo: 'Dell XPS',
  estado: 'Almacen', ubicacion: '', numSerie: 'SN-1', notas: '', sociedad: 'SLF',
  asignadoA: '', emailAsignadoA: '', fechaAsignacion: null,
  transitoDestino: '', motivoIncidencia: '', proveedor: '', numAlbaran: '',
  fechaCompra: null, fechaGarantia: null, accesorios: '', etiquetaImpresa: true,
  ...o,
})
const asg = (o: Partial<Assignment>): Assignment => ({
  id: 'ag_' + Math.random().toString(36).slice(2),
  nombreEmpleado: 'Juan Pérez', emailEmpleado: 'juan.perez@sanlucar.com',
  departamento: 'IT', puesto: 'Técnico', fechaIncorporacion: '2024-01-01',
  productosAsignados: [], cantidadProductos: 0, firmaEmpleado: '',
  tecnicoResponsable: 'Admin IT', fechaAsignacion: '2026-10-15T10:00:00Z',
  estado: 'Activo', observaciones: '', esPrestamo: false, ...o,
})
const eqProd = (idEtiqueta: string, extra?: Partial<AssignmentProduct>): AssignmentProduct =>
  ({ nombre: 'Dell XPS', idEtiqueta, esEquipo: true, ...extra })
const histE = (o: Partial<HistoryEntry>): HistoryEntry => ({
  id: 'h_' + Math.random().toString(36).slice(2),
  fecha: '2026-10-15T10:00:00Z', tipo: 'Asignacion', producto: 'Dell XPS',
  cantidad: 1, ticket: '', usuario: 'Juan Pérez', tecnico: 'Admin IT',
  idEtiqueta: 'SLF-26-00001', motivo: '', ...o,
})

console.log('\n[normalizeEmail]')
test('lowercase + trim', () => {
  assertEq(normalizeEmail(' JUAN@X.COM '), 'juan@x.com')
  assertEq(normalizeEmail(''), '')
  assertEq(normalizeEmail(null), '')
  assertEq(normalizeEmail(undefined), '')
})

console.log('\n[buildEmployeeIndex]')
test('agrupa por email, sin duplicar', () => {
  const idx = buildEmployeeIndex({
    activos: [
      activo({ idEtiqueta: 'A1', estado: 'Asignado', asignadoA: 'Juan', emailAsignadoA: 'juan@x.com' }),
      activo({ idEtiqueta: 'A2', estado: 'Asignado', asignadoA: 'Juan', emailAsignadoA: 'JUAN@X.COM' }),
    ],
    assignments: [
      asg({ nombreEmpleado: 'Juan', emailEmpleado: 'juan@x.com', esPrestamo: true, estado: 'Activo' }),
      asg({ nombreEmpleado: 'Ana', emailEmpleado: 'ana@x.com', estado: 'Devuelto' }),
    ],
  })
  assertEq(idx.length, 2, '2 empleados únicos')
  const juan = idx.find((e) => e.email === 'juan@x.com')!
  assertEq(juan.equiposActivos, 2)
  assertEq(juan.prestamosActivos, 1)
  const ana = idx.find((e) => e.email === 'ana@x.com')!
  // Ana solo tiene asignación Devuelta, no cuenta como activa
  assertEq(ana.equiposActivos, 0)
  assertEq(ana.asignacionesActivas, 0)
})
test('registros sin email NO entran al índice', () => {
  const idx = buildEmployeeIndex({
    activos: [activo({ estado: 'Asignado', asignadoA: 'Fulano', emailAsignadoA: '' })],
    assignments: [asg({ nombreEmpleado: 'Mengano', emailEmpleado: '' })],
  })
  assertEq(idx.length, 0, 'ningún empleado agrupable')
})

console.log('\n[searchEmployees]')
test('match por nombre y email', () => {
  const idx = [
    { email: 'juan@x.com', nombre: 'Juan Pérez', departamento: '', puesto: '', equiposActivos: 1, asignacionesActivas: 1, prestamosActivos: 0 },
    { email: 'ana@x.com', nombre: 'Ana García', departamento: '', puesto: '', equiposActivos: 0, asignacionesActivas: 0, prestamosActivos: 0 },
  ]
  assertEq(searchEmployees(idx, 'juan').length, 1)
  assertEq(searchEmployees(idx, '@X.COM').length, 2)
  assertEq(searchEmployees(idx, 'a').length, 0, 'descarta queries < 2 chars')
})

console.log('\n[Caso 1 — empleado con 1 equipo]')
test('equipo visible, categoría clasificada, duplicidades vacías', () => {
  const v = getEmployeeView({
    activos: [activo({ idEtiqueta: 'SLF-26-00001', tipo: 'Portátil', estado: 'Asignado', asignadoA: 'Juan', emailAsignadoA: 'juan@x.com', fechaAsignacion: '2026-10-01' })],
    assignments: [asg({ emailEmpleado: 'juan@x.com', nombreEmpleado: 'Juan', productosAsignados: [eqProd('SLF-26-00001')] })],
    history: [],
  }, { email: 'juan@x.com', nombre: 'Juan' })
  assertEq(v.equipos.length, 1)
  assertEq(v.equipos[0].categoria, 'portatil')
  assertEq(v.duplicidades.length, 0)
})

console.log('\n[Caso 2 — empleado con varios equipos (duplicidad)]')
test('duplicidad detectada en portátil', () => {
  const v = getEmployeeView({
    activos: [
      activo({ idEtiqueta: 'P1', tipo: 'Portátil', estado: 'Asignado', asignadoA: 'Juan', emailAsignadoA: 'juan@x.com' }),
      activo({ idEtiqueta: 'P2', tipo: 'Portátil', estado: 'Asignado', asignadoA: 'Juan', emailAsignadoA: 'juan@x.com' }),
      activo({ idEtiqueta: 'M1', tipo: 'Monitor', estado: 'Asignado', asignadoA: 'Juan', emailAsignadoA: 'juan@x.com' }),
    ],
    assignments: [],
    history: [],
  }, { email: 'juan@x.com', nombre: 'Juan' })
  assertEq(v.equipos.length, 3)
  assertEq(v.duplicidades.length, 1)
  assertEq(v.duplicidades[0].category, 'portatil')
  assertEq(v.duplicidades[0].count, 2)
})

console.log('\n[Caso 3 — empleado sin asignaciones]')
test('todas las listas vacías pero el view se construye', () => {
  const v = getEmployeeView({
    activos: [],
    assignments: [],
    history: [],
  }, { email: 'ghost@x.com', nombre: 'Fantasma' })
  assertEq(v.equipos.length, 0)
  assertEq(v.prestamosActivos.length, 0)
  assertEq(v.historial.length, 0)
  assertEq(v.duplicidades.length, 0)
  assertEq(v.nombre, 'Fantasma')
})

console.log('\n[Caso 4 — préstamos activos]')
test('fecha de devolución extraída de observaciones + vencido=true', () => {
  const v = getEmployeeView({
    activos: [],
    assignments: [
      asg({
        emailEmpleado: 'juan@x.com', esPrestamo: true, estado: 'Activo',
        cantidadProductos: 1,
        observaciones: '[Dev. prevista: 01/01/2020] préstamo de prueba',
      }),
    ],
    history: [],
  }, { email: 'juan@x.com' })
  assertEq(v.prestamosActivos.length, 1)
  assertEq(v.prestamosActivos[0].fechaDevolucionPrevista, '2020-01-01')
  assertEq(v.prestamosActivos[0].vencido, true, 'préstamo del 2020 debe estar vencido')
})
test('préstamo sin fecha prevista → vencido=false y campo null', () => {
  const v = getEmployeeView({
    activos: [],
    assignments: [asg({ emailEmpleado: 'juan@x.com', esPrestamo: true, estado: 'Activo' })],
    history: [],
  }, { email: 'juan@x.com' })
  assertEq(v.prestamosActivos[0].fechaDevolucionPrevista, null)
  assertEq(v.prestamosActivos[0].vencido, false)
})

console.log('\n[Caso 5 — devoluciones parciales]')
test('asignación Parcial sigue vigente, equipos vienen de state.activos', () => {
  const v = getEmployeeView({
    activos: [
      activo({ idEtiqueta: 'A1', estado: 'Asignado', asignadoA: 'Juan', emailAsignadoA: 'juan@x.com' }),
      activo({ idEtiqueta: 'A2', estado: 'Almacen' }), // devuelto
    ],
    assignments: [asg({ emailEmpleado: 'juan@x.com', estado: 'Parcial', productosAsignados: [eqProd('A1')] })],
    history: [],
  }, { email: 'juan@x.com' })
  assertEq(v.equipos.length, 1, 'solo el equipo todavía en poder del empleado')
  assertEq(v.equipos[0].idEtiqueta, 'A1')
  assertEq(v.asignacionesActivas.length, 1)
})

console.log('\n[Caso 6 — equipos devueltos no aparecen]')
test('activo con estado Almacen aunque haya sido suyo no sale', () => {
  const v = getEmployeeView({
    activos: [activo({ idEtiqueta: 'A1', estado: 'Almacen', asignadoA: '', emailAsignadoA: '' })],
    assignments: [asg({ emailEmpleado: 'juan@x.com', estado: 'Devuelto' })],
    history: [histE({ usuario: 'Juan Pérez', tipo: 'Devolucion' })],
  }, { email: 'juan@x.com', nombre: 'Juan Pérez' })
  assertEq(v.equipos.length, 0)
  assertEq(v.asignacionesActivas.length, 0, 'devueltas no son vigentes')
  assertEq(v.historial.length, 1, 'pero sí quedan en historial')
})

console.log('\n[Caso 7 — historial incompleto]')
test('campos vacíos en history no crashean', () => {
  const v = getEmployeeView({
    activos: [],
    assignments: [],
    history: [
      histE({ usuario: 'Juan Pérez', producto: '', cantidad: 0, tecnico: '', idEtiqueta: '', motivo: '' }),
    ],
  }, { email: 'juan@x.com', nombre: 'Juan Pérez' })
  assertEq(v.historial.length, 1)
  // Los campos vacíos se exponen como "", el UI muestra "no disponible"
  assertEq(v.historial[0].producto, '')
})

console.log('\n[Caso 8 — dos empleados mismo nombre, emails distintos]')
test('equipos y assignments separados por email; historial OCULTO (withheld) en ambas', () => {
  // Dos Juans distintos
  const base = {
    activos: [
      activo({ idEtiqueta: 'A1', estado: 'Asignado', asignadoA: 'Juan Pérez', emailAsignadoA: 'juan@x.com' }),
      activo({ idEtiqueta: 'A2', estado: 'Asignado', asignadoA: 'Juan Pérez', emailAsignadoA: 'juan@y.com' }),
    ],
    assignments: [
      asg({ nombreEmpleado: 'Juan Pérez', emailEmpleado: 'juan@x.com', productosAsignados: [eqProd('A1')] }),
      asg({ nombreEmpleado: 'Juan Pérez', emailEmpleado: 'juan@y.com', productosAsignados: [eqProd('A2')] }),
    ],
    history: [histE({ usuario: 'Juan Pérez', tipo: 'Asignacion', idEtiqueta: 'A1' })],
  }
  const v1 = getEmployeeView(base, { email: 'juan@x.com', nombre: 'Juan Pérez' })
  const v2 = getEmployeeView(base, { email: 'juan@y.com', nombre: 'Juan Pérez' })
  // Equipos: separados correctamente por email
  assertEq(v1.equipos.length, 1, 'v1 ve solo su equipo')
  assertEq(v1.equipos[0].idEtiqueta, 'A1')
  assertEq(v2.equipos.length, 1, 'v2 ve solo su equipo')
  assertEq(v2.equipos[0].idEtiqueta, 'A2')
  // Historial: OCULTO en ambas (no se muestra el movimiento ambiguo)
  assertEq(v1.historyNameCollision, true, 'v1 detecta colisión')
  assertEq(v2.historyNameCollision, true, 'v2 detecta colisión')
  assertEq(v1.historyWithheld, true, 'v1 marca historial como withheld')
  assertEq(v2.historyWithheld, true, 'v2 marca historial como withheld')
  assertEq(v1.historial.length, 0, 'v1 NO expone el movimiento ambiguo')
  assertEq(v2.historial.length, 0, 'v2 NO expone el movimiento ambiguo')
  assert(v1.historyWithheldReason && v1.historyWithheldReason.includes('Juan Pérez'), 'v1 tiene razón explicativa')
})
test('un empleado único con nombre no repetido conserva su historial', () => {
  const base = {
    activos: [],
    assignments: [asg({ nombreEmpleado: 'Ana García', emailEmpleado: 'ana@x.com' })],
    history: [histE({ usuario: 'Ana García', tipo: 'Asignacion' })],
  }
  const v = getEmployeeView(base, { email: 'ana@x.com', nombre: 'Ana García' })
  assertEq(v.historyWithheld, false)
  assertEq(v.historyNameCollision, false)
  assertEq(v.historial.length, 1)
})

console.log('\n[Hooks pattern — pureza al cambiar de ficha]')
test('pureza: dos vistas sobre el mismo state son independientes', () => {
  const base = {
    activos: [
      activo({ idEtiqueta: 'A1', estado: 'Asignado', asignadoA: 'Juan', emailAsignadoA: 'juan@x.com' }),
      activo({ idEtiqueta: 'A2', estado: 'Asignado', asignadoA: 'Ana', emailAsignadoA: 'ana@x.com' }),
    ],
    assignments: [],
    history: [],
  }
  const v1 = getEmployeeView(base, { email: 'juan@x.com', nombre: 'Juan' })
  const v2 = getEmployeeView(base, { email: 'ana@x.com', nombre: 'Ana' })
  assertEq(v1.email, 'juan@x.com')
  assertEq(v2.email, 'ana@x.com')
  assertEq(v1.equipos.length, 1)
  assertEq(v2.equipos.length, 1)
  assert(v1.equipos[0].idEtiqueta !== v2.equipos[0].idEtiqueta, 'cada vista tiene su equipo, sin arrastre')
})
test('abrir la ficha con ficha=null no debería ocurrir, pero email vacío devuelve vista vacía limpia', () => {
  const v = getEmployeeView(
    { activos: [activo({ estado: 'Asignado', emailAsignadoA: 'juan@x.com' })], assignments: [], history: [] },
    { email: '', nombre: '' }
  )
  assertEq(v.email, '')
  assertEq(v.equipos.length, 0, 'sin equipos del otro empleado')
  assertEq(v.historial.length, 0)
  assertEq(v.historyWithheld, false)
})

console.log('\n──────────────────')
console.log('  ' + passed + ' passed, ' + failed + ' failed')
if (failed > 0) process.exit(1)
