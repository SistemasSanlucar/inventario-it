import { useMemo } from 'react'
import { useAppContext } from '../context/AppContext'
import { useTabNavigation } from './useTabNavigation'
import { buildEmployeeIndex, searchEmployees } from '../utils/employeeView'

export interface GlobalSearchResult {
  type: 'empleado' | 'inventory' | 'equipo' | 'asignacion'
  icon: string
  label: string
  sub: string
  // Para 'empleado': email del empleado (clave de la ficha 360°)
  // Para los demás: tab destino para navegar
  tab?: string
  email?: string
  nombre?: string
  // Contadores informativos solo para 'empleado'
  counts?: { equipos: number; asignaciones: number; prestamos: number }
}

export function useGlobalSearch() {
  const { state, dispatch } = useAppContext()
  const { goToTab } = useTabNavigation()

  const results = useMemo<GlobalSearchResult[]>(() => {
    if (state.globalSearch.length < 2) return []
    const q = state.globalSearch.toLowerCase()
    const r: GlobalSearchResult[] = []

    // 1) Empleados (prioridad máxima, hasta 10). Agrupados por email único.
    const empIndex = buildEmployeeIndex({ activos: state.activos || [], assignments: state.assignments || [] })
    const empMatches = searchEmployees(empIndex, state.globalSearch, 10)
    for (const emp of empMatches) {
      const parts: string[] = []
      if (emp.equiposActivos > 0) parts.push(`${emp.equiposActivos} equipo(s)`)
      if (emp.asignacionesActivas > 0) parts.push(`${emp.asignacionesActivas} asignación(es)`)
      if (emp.prestamosActivos > 0) parts.push(`${emp.prestamosActivos} préstamo(s)`)
      r.push({
        type: 'empleado',
        icon: '👤',
        label: emp.nombre || emp.email,
        sub: emp.email + (parts.length ? ' · ' + parts.join(' · ') : ''),
        email: emp.email,
        nombre: emp.nombre,
        counts: { equipos: emp.equiposActivos, asignaciones: emp.asignacionesActivas, prestamos: emp.prestamosActivos },
      })
    }

    // 2) Resto de tipos — cap conjunto de 8
    const otherResults: GlobalSearchResult[] = []
    ;(state.inventory || []).forEach((i) => {
      if ((i.nombre || '').toLowerCase().includes(q) || (i.barcode || '').includes(q)) {
        otherResults.push({ type: 'inventory', icon: '📦', label: i.nombre, sub: i.barcode, tab: 'inventario' })
      }
    })
    ;(state.activos || []).forEach((a) => {
      if (
        (a.idEtiqueta || '').toLowerCase().includes(q) ||
        (a.numSerie || '').toLowerCase().includes(q) ||
        (a.modelo || '').toLowerCase().includes(q)
      ) {
        otherResults.push({ type: 'equipo', icon: '💻', label: a.tipo + ' · ' + a.modelo, sub: a.idEtiqueta, tab: 'equipos' })
      }
    })
    // Nota: NO duplicamos resultados de 'asignacion' — un empleado matcheado
    // ya aparece como 'empleado'. Solo añadimos asignación cuando el match
    // es sobre un dato no incluido en la ficha 360° (p.ej. observaciones).
    ;(state.assignments || []).forEach((a) => {
      const nameLower = (a.nombreEmpleado || '').toLowerCase()
      const emailLower = (a.emailEmpleado || '').toLowerCase()
      // Si ya hay un empleado match con este email, no añadas asignación
      const alreadyAsEmployee = empMatches.some((e) => e.email === emailLower)
      if (alreadyAsEmployee) return
      // Solo añadir si matchea por nombre/email (en cuyo caso llegaríamos aquí
      // únicamente si el empleado está pero no en los primeros 10 — fallback)
      if (nameLower.includes(q) || emailLower.includes(q)) {
        const estadoBadge = a.estado === 'Activo' ? '' : ' (' + a.estado + ')'
        otherResults.push({
          type: 'asignacion',
          icon: '📋',
          label: a.nombreEmpleado + estadoBadge,
          sub: a.emailEmpleado,
          tab: 'asignaciones',
        })
      }
    })

    return r.concat(otherResults.slice(0, 8))
  }, [state.globalSearch, state.inventory, state.activos, state.assignments])

  const setQuery = (value: string) => dispatch({ type: 'SET_GLOBAL_SEARCH', payload: value })
  const hideResults = () => dispatch({ type: 'SET_SHOW_GLOBAL_RESULTS', payload: false })

  /** Para resultados con tab definido (inventory, equipo, asignacion) */
  const navigateToResult = (tab: string) => {
    dispatch({ type: 'SET_GLOBAL_SEARCH', payload: '' })
    goToTab(tab)
  }

  /** Para resultado tipo 'empleado' — abre la ficha 360° */
  const openEmployeeFicha = (email: string, nombre: string) => {
    dispatch({ type: 'SET_GLOBAL_SEARCH', payload: '' })
    dispatch({ type: 'SET_SHOW_GLOBAL_RESULTS', payload: false })
    dispatch({ type: 'SET_FICHA_EMPLEADO', payload: { email, nombre } })
  }

  return {
    query: state.globalSearch,
    showResults: state.showGlobalResults,
    results,
    setQuery,
    hideResults,
    navigateToResult,
    openEmployeeFicha,
  }
}
