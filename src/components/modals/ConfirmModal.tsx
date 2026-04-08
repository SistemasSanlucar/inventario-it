interface ConfirmModalProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export default function ConfirmModal({ message, onConfirm, onCancel, loading }: ConfirmModalProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h3 style={{ marginBottom: '12px' }}>{message}</h3>
          <div style={{ background: 'rgba(239,68,68,.1)', padding: '12px', borderRadius: '8px', fontSize: '14px', color: 'var(--accent-red)', textAlign: 'center', marginBottom: '24px' }}>
            Esta accion es permanente y no se puede deshacer
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="button button-secondary" onClick={onCancel} disabled={loading}>
              Cancelar
            </button>
            <button
              className="button button-danger"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? 'Procesando...' : '🗑️ Eliminar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
