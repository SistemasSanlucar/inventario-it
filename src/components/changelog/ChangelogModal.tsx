import { CHANGELOG, entryIcon } from '../../config/changelog'
import { CONFIG } from '../../config'
import { T } from '../../i18n'

interface Props {
  onClose: () => void
}

export default function ChangelogModal({ onClose }: Props) {
  const t = T()
  const current = CHANGELOG.find((v) => v.version === CONFIG.version) || CHANGELOG[0]
  if (!current) return null

  const handleClose = () => {
    localStorage.setItem('inv_last_version', CONFIG.version)
    onClose()
  }

  return (
    <div className="modal-overlay" onMouseDown={handleClose}>
      <div
        className="modal"
        style={{ maxWidth: '520px' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">{t.whatsNew} v{current.version}</h2>
          <button className="modal-close" onClick={handleClose}>&times;</button>
        </div>
        <div className="modal-body" style={{ padding: '24px 32px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>{current.date}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {current.changes.map((entry, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>{entryIcon(entry.type)}</span>
                <span style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{entry.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="button button-primary" onClick={handleClose}>{t.understood}</button>
        </div>
      </div>
    </div>
  )
}
