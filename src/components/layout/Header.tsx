import { useAuth } from '../../context/AuthContext'
import { useAppContext } from '../../context/AppContext'
import { useAppData } from '../../hooks/useAppData'
import { useGlobalSearch } from '../../hooks/useGlobalSearch'
import { useTabNavigation } from '../../hooks/useTabNavigation'
import { T } from '../../i18n'
import { setLang } from '../../i18n'
import { CONFIG } from '../../config'
import { startBarcodeScanner } from '../../utils/scanner'

export default function Header() {
  const auth = useAuth()
  const { state, dispatch } = useAppContext()
  const { syncData } = useAppData()
  const { query, showResults, results, setQuery, hideResults, navigateToResult } = useGlobalSearch()
  const { goToTab } = useTabNavigation()
  const t = T()

  const stats = {
    totalProductos: state.inventory.length,
    totalUnidades: state.inventory.reduce((s, i) => s + i.stock, 0),
    stockBajo: state.inventory.filter((i) => i.stock > 0 && i.stock <= i.stockMinimo).length,
  }

  const getLastSyncText = () => {
    if (!state.lastSync) return ''
    const diff = Math.floor((Date.now() - state.lastSync.getTime()) / 1000)
    if (diff < 60) return 'Hace un momento'
    if (diff < 3600) return 'Hace ' + Math.floor(diff / 60) + ' min'
    return 'Hace ' + Math.floor(diff / 3600) + 'h'
  }

  const handleLangChange = (newLang: string) => {
    setLang(newLang)
    dispatch({ type: 'SET_LANG', payload: newLang })
  }

  const handleScanSearch = () => {
    startBarcodeScanner((code) => {
      setQuery(code)
    })
  }

  return (
    <header className="header">
      <div className="header-left">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="https://sanlucar.com/wp-content/uploads/2023/03/SanLucar_LOGO_final.svg"
            alt="Sanlúcar"
            title="Ir al Dashboard"
            style={{
              height: '32px',
              width: 'auto',
              objectFit: 'contain',
              filter: 'brightness(0) invert(1)',
              cursor: 'pointer',
              transition: 'opacity .2s, transform .2s',
            }}
            onClick={() => goToTab('dashboard')}
            onMouseEnter={(e) => {
              ;(e.target as HTMLElement).style.opacity = '0.75'
              ;(e.target as HTMLElement).style.transform = 'scale(1.08)'
            }}
            onMouseLeave={(e) => {
              ;(e.target as HTMLElement).style.opacity = '1'
              ;(e.target as HTMLElement).style.transform = ''
            }}
            onError={(e) => {
              ;(e.target as HTMLElement).style.display = 'none'
            }}
          />
          <h1
            style={{ cursor: 'pointer' }}
            onClick={() => goToTab('dashboard')}
            title="Ir al Dashboard"
          >
            {t.appTitle}
          </h1>
          <span
            style={{
              fontSize: '12px',
              padding: '4px 8px',
              background: 'rgba(88,166,255,.15)',
              color: 'var(--accent-blue)',
              borderRadius: '6px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: '600',
            }}
          >
            v{CONFIG.version}
          </span>
        </div>
        <div className="user-badges">
          <span className={'user-badge ' + (auth.isAdmin ? 'admin' : 'technician')}>
            {auth.isAdmin ? '🛡️ Admin' : '🔧 Técnico'}: {auth.user?.name}
          </span>
        </div>
      </div>

      {/* Global search */}
      <div style={{ flex: 1, maxWidth: '400px', position: 'relative', margin: '0 16px' }}>
        <input
          type="text"
          className="search-bar"
          placeholder={t.globalSearch}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={() => setTimeout(hideResults, 200)}
          style={{ width: '100%', paddingRight: '44px' }}
        />
        <button
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            color: 'var(--text-secondary)',
          }}
          onClick={handleScanSearch}
        >
          📷
        </button>
        {showResults && results.length > 0 && (
          <div className="user-search-dropdown" style={{ top: '100%', zIndex: 9999 }}>
            {results.map((r, idx) => (
              <div
                key={idx}
                className="user-search-item"
                onMouseDown={() => navigateToResult(r.tab)}
              >
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '16px' }}>{r.icon}</span>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{r.label}</div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}
                    >
                      {r.sub}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats + controls */}
      <div className="header-stats">
        <div className="stat-item">
          <div className="stat-label">{t.products}</div>
          <div className="stat-value blue">{stats.totalProductos}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">{t.units}</div>
          <div className="stat-value green">{stats.totalUnidades}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">{t.lowStock}</div>
          <div className="stat-value orange">{stats.stockBajo}</div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: 'var(--bg-tertiary)',
            borderRadius: '8px',
          }}
        >
          {state.lastSync && (
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{getLastSyncText()}</span>
          )}
          <button
            onClick={() => syncData(true)}
            disabled={state.syncing}
            style={{
              background: state.syncing ? 'var(--bg-secondary)' : 'var(--accent-blue)',
              border: 'none',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: state.syncing ? 'wait' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            {state.syncing ? t.syncing : t.sync}
          </button>
        </div>
        <select
          value={state.lang}
          onChange={(e) => handleLangChange(e.target.value)}
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            padding: '6px 10px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '700',
            fontFamily: "'IBM Plex Mono', monospace",
            outline: 'none',
          }}
        >
          <option value="es">ES</option>
          <option value="en">EN</option>
        </select>
        <button className="button button-secondary" onClick={auth.logout}>
          {t.logout}
        </button>
      </div>
    </header>
  )
}
