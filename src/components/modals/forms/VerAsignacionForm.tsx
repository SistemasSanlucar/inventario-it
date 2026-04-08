import type { Assignment } from '../../../types'

interface VerAsignacionFormProps {
  selectedItem: Assignment
}

export default function VerAsignacionForm({ selectedItem }: VerAsignacionFormProps) {
  const productos = selectedItem.productosAsignados || []

  return (
    <div>
      <div style={{ background: 'var(--bg-tertiary)', padding: '24px', borderRadius: '12px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '700' }}>{selectedItem.nombreEmpleado}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{selectedItem.emailEmpleado}</div>
          </div>
          <span
            style={{
              background: selectedItem.esPrestamo ? 'var(--accent-orange)' : 'var(--accent-blue)',
              color: 'white',
              padding: '6px 14px',
              borderRadius: '6px',
              fontWeight: '700',
              fontSize: '13px',
            }}
          >
            {selectedItem.esPrestamo ? '⏱️ PRESTAMO' : '📋 ASIGNACION'}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            { label: 'Departamento', value: selectedItem.departamento },
            { label: 'Puesto', value: selectedItem.puesto },
            { label: 'Técnico IT', value: selectedItem.tecnicoResponsable },
            { label: 'Fecha', value: new Date(selectedItem.fechaAsignacion).toLocaleDateString('es-ES') },
            { label: 'Estado', value: selectedItem.estado },
          ].map((info, idx) => (
            <div key={idx}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>{info.label}</div>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>{info.value || '-'}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontWeight: '700', marginBottom: '12px', textTransform: 'uppercase', fontSize: '12px', color: 'var(--text-secondary)' }}>
          Material ({productos.length} productos)
        </div>
        {productos.map((prod: any, idx: number) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--bg-tertiary)', borderRadius: '6px', marginBottom: '6px' }}>
            <span style={{ fontWeight: '500' }}>{idx + 1}. {prod.nombre}</span>
            <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: '12px', color: 'var(--accent-blue)' }}>{prod.barcode}</span>
          </div>
        ))}
      </div>

      {selectedItem.observaciones && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Observaciones</div>
          <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', fontSize: '14px' }}>{selectedItem.observaciones}</div>
        </div>
      )}

      {selectedItem.firmaEmpleado && (
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Firma del empleado</div>
          <img
            src={selectedItem.firmaEmpleado}
            style={{ maxWidth: '300px', height: '80px', objectFit: 'contain', background: 'var(--bg-primary)', borderRadius: '8px', padding: '8px', border: '1px solid var(--border)' }}
            alt="Firma"
          />
        </div>
      )}
    </div>
  )
}
