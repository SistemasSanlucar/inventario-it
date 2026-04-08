import { T } from '../../i18n'

interface AccessDeniedProps {
  email: string
  onLogout: () => void
}

export default function AccessDenied({ email, onLogout }: AccessDeniedProps) {
  const t = T()

  return (
    <div className="login-screen">
      <div className="login-box" style={{ borderColor: 'var(--accent-red)' }}>
        <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px' }}>🚫</span>
        <h1 style={{ color: 'var(--accent-red)', marginBottom: '16px' }}>{t.accessDenied}</h1>
        <p style={{ marginBottom: '8px' }}>{t.accessDeniedMsg}</p>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '32px' }}>
          {t.accessDeniedSub}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>{email}</p>
        <button className="button button-secondary" onClick={onLogout} style={{ width: '100%' }}>
          {t.tryOtherAccount}
        </button>
      </div>
    </div>
  )
}
