import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'

const TAB_ROUTES: Record<string, string> = {
  dashboard: '/',
  inventario: '/inventario',
  equipos: '/equipos',
  asignaciones: '/asignaciones',
  historial: '/historial',
  lineas: '/lineas',
  admin: '/admin',
  about: '/about',
}

const ROUTE_TABS: Record<string, string> = {
  '/': 'dashboard',
  '/inventario': 'inventario',
  '/equipos': 'equipos',
  '/asignaciones': 'asignaciones',
  '/historial': 'historial',
  '/lineas': 'lineas',
  '/admin': 'admin',
  '/about': 'about',
}

export function tabFromPath(pathname: string): string {
  if (pathname === '/') return 'dashboard'
  const base = '/' + pathname.split('/')[1]
  return ROUTE_TABS[base] || 'dashboard'
}

export function useTabNavigation() {
  const navigate = useNavigate()
  const { dispatch } = useAppContext()

  const goToTab = useCallback((tab: string, filter?: any) => {
    const route = TAB_ROUTES[tab] || '/'
    if (filter) {
      dispatch({ type: 'SET_TAB_FILTER', payload: { tab, filter } })
    } else {
      dispatch({ type: 'SET_TAB', payload: tab })
    }
    navigate(route)
  }, [navigate, dispatch])

  const goToEquipo = useCallback((activo: any) => {
    dispatch({ type: 'SET_DEEP_LINK', payload: activo })
    navigate('/equipos')
  }, [navigate, dispatch])

  return { goToTab, goToEquipo }
}
