import { NavLink } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { T } from '../../i18n'

const TABS = [
  { key: 'dashboard', path: '/' },
  { key: 'inventario', path: '/inventario' },
  { key: 'equipos', path: '/equipos' },
  { key: 'asignaciones', path: '/asignaciones' },
  { key: 'historial', path: '/historial' },
] as const

export default function NavTabs() {
  const { state } = useAppContext()
  const t = T()

  const labels: Record<string, string> = {
    dashboard: t.dashboard,
    inventario: t.inventory,
    equipos: t.equipment,
    asignaciones: t.assignments,
    historial: t.history,
  }

  const pendientesCount = (state.activos || []).filter((a) => a.estado === 'Pendiente').length

  return (
    <nav className="nav-tabs">
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
    </nav>
  )
}
