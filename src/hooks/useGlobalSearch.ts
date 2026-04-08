import { useMemo } from 'react'
import { useAppContext } from '../context/AppContext'
import { useTabNavigation } from './useTabNavigation'

export interface GlobalSearchResult {
  type: string
  icon: string
  label: string
  sub: string
  tab: string
}

export function useGlobalSearch() {
  const { state, dispatch } = useAppContext()
  const { goToTab } = useTabNavigation()

  const results = useMemo<GlobalSearchResult[]>(() => {
    if (state.globalSearch.length < 2) return []
    const q = state.globalSearch.toLowerCase()
    const r: GlobalSearchResult[] = []

    ;(state.inventory || []).forEach((i) => {
      if ((i.nombre || '').toLowerCase().includes(q) || (i.barcode || '').includes(q)) {
        r.push({ type: 'inventory', icon: '📦', label: i.nombre, sub: i.barcode, tab: 'inventario' })
      }
    })
    ;(state.activos || []).forEach((a) => {
      if (
        (a.idEtiqueta || '').toLowerCase().includes(q) ||
        (a.numSerie || '').toLowerCase().includes(q) ||
        (a.modelo || '').toLowerCase().includes(q)
      ) {
        r.push({ type: 'equipo', icon: '💻', label: a.tipo + ' · ' + a.modelo, sub: a.idEtiqueta, tab: 'equipos' })
      }
    })
    ;(state.assignments || [])
      .filter((a) => a.estado === 'Activo')
      .forEach((a) => {
        if ((a.nombreEmpleado || '').toLowerCase().includes(q) || (a.emailEmpleado || '').toLowerCase().includes(q)) {
          r.push({ type: 'asignacion', icon: '📋', label: a.nombreEmpleado, sub: a.emailEmpleado, tab: 'asignaciones' })
        }
      })

    return r.slice(0, 8)
  }, [state.globalSearch, state.inventory, state.activos, state.assignments])

  const setQuery = (value: string) => dispatch({ type: 'SET_GLOBAL_SEARCH', payload: value })
  const hideResults = () => dispatch({ type: 'SET_SHOW_GLOBAL_RESULTS', payload: false })
  const navigateToResult = (tab: string) => {
    dispatch({ type: 'SET_GLOBAL_SEARCH', payload: '' })
    goToTab(tab)
  }

  return {
    query: state.globalSearch,
    showResults: state.showGlobalResults,
    results,
    setQuery,
    hideResults,
    navigateToResult,
  }
}
