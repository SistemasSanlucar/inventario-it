import { useRef, useState, useEffect, useCallback } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { T } from '../../i18n'

const TABS = [
  { key: 'dashboard', path: '/' },
  { key: 'inventario', path: '/inventario' },
  { key: 'equipos', path: '/equipos' },
  { key: 'asignaciones', path: '/asignaciones' },
  { key: 'historial', path: '/historial' },
  { key: 'lineas', path: '/lineas' },
] as const

export default function NavTabs() {
  const { state } = useAppContext()
  const t = T()
  const location = useLocation()
  const navRef = useRef<HTMLElement>(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  const labels: Record<string, string> = {
    dashboard: t.dashboard,
    inventario: t.inventory,
    equipos: t.equipment,
    asignaciones: t.assignments,
    historial: t.history,
    lineas: t.phoneLines,
  }

  const pendientesCount = (state.activos || []).filter((a) => a.estado === 'Pendiente').length

  const updateIndicator = useCallback(() => {
    if (!navRef.current) return
    const active = navRef.current.querySelector('.tab-button.active') as HTMLElement | null
    if (active) {
      setIndicator({ left: active.offsetLeft, width: active.offsetWidth })
    }
  }, [])

  useEffect(() => {
    // Small delay to let NavLink update its active class
    const id = requestAnimationFrame(updateIndicator)
    return () => cancelAnimationFrame(id)
  }, [location.pathname, updateIndicator])

  return (
    <nav className="nav-tabs" ref={navRef}>
      {TABS.map((tab) => (
        <NavLink
          key={tab.key}
          to={tab.path}
          end={tab.key === 'dashboard'}
          className={({ isActive }) => 'tab-button ' + (isActive ? 'active' : '')}
        >
          {labels[tab.key]}
          {tab.key === 'equipos' && pendientesCount > 0 && (
            <span
              style={{
                background: 'var(--accent-orange)',
                color: 'white',
                borderRadius: '10px',
                padding: '1px 7px',
                fontSize: '11px',
                fontWeight: '700',
                marginLeft: '4px',
              }}
            >
              {pendientesCount}
            </span>
          )}
        </NavLink>
      ))}
      <NavLink
        to="/admin"
        className={({ isActive }) => 'tab-button ' + (isActive ? 'active' : '')}
        style={({ isActive }) => ({
          background: isActive ? 'var(--accent-purple)' : '',
          borderColor: 'var(--accent-purple)',
          borderWidth: '1px',
          borderStyle: 'solid',
        })}
      >
        {t.admin}
      </NavLink>
      <NavLink
        to="/about"
        className={({ isActive }) => 'tab-button ' + (isActive ? 'active' : '')}
        style={({ isActive }) => ({
          background: isActive ? 'var(--bg-tertiary)' : '',
          borderColor: 'var(--border)',
          borderWidth: '1px',
          borderStyle: 'solid',
          fontSize: '13px',
        })}
      >
        {t.about}
      </NavLink>
      <div className="nav-indicator" style={{ left: indicator.left, width: indicator.width }} />
    </nav>
  )
}
