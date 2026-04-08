import { useState } from 'react'
import { T } from '../../i18n'
import { CONFIG } from '../../config'
import { showToast } from '../../hooks/useToast'

interface LoginScreenProps {
  onLogin: () => Promise<void>
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [loading, setLoading] = useState(false)
  const t = T()

  const handleLogin = async () => {
    setLoading(true)
    try {
      await onLogin()
    } catch (_) {
      showToast('Error al iniciar sesion', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-box">
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
          <img
            src="https://sanlucar.com/wp-content/uploads/2023/03/SanLucar_LOGO_final.svg"
            alt="Sanlúcar Fruit"
            style={{ height: '64px', width: 'auto', objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
        <h1>{t.appTitle}</h1>
        <p style={{ fontSize: '14px', color: 'var(--accent-purple)', fontWeight: '600', marginBottom: '12px' }}>
          Sanlucar Fruit · IT
        </p>
        <p>{t.loginDesc}</p>
        <button
          className="button button-primary"
          onClick={handleLogin}
          disabled={loading}
          style={{ width: '100%', marginTop: '16px' }}
        >
          {loading && <span className="loading-spinner" />}
          {loading ? ' ' + t.loginIng : ' ' + t.login}
        </button>
        <p style={{ fontSize: '12px', marginTop: '24px' }}>{t.loginNote} (v{CONFIG.version})</p>
      </div>
    </div>
  )
}
