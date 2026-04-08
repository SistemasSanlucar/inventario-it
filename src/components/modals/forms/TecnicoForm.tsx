import { FormField } from '../shared/FormHelpers'

interface TecnicoFormProps {
  formData: any
  onUpdate: (field: string, value: any) => void
}

export default function TecnicoForm({ formData, onUpdate }: TecnicoFormProps) {
  return (
    <div>
      <div className="form-row">
        <FormField label="Nombre completo" required>
          <input
            type="text"
            className="form-input"
            value={formData.nombreTecnico}
            placeholder="Ej: Juan Garcia"
            onChange={(e) => onUpdate('nombreTecnico', e.target.value)}
          />
        </FormField>
        <FormField label="Email corporativo" required>
          <input
            type="email"
            className="form-input"
            value={formData.emailTecnico}
            placeholder="juan.garcia@sanlucar.com"
            onChange={(e) => onUpdate('emailTecnico', e.target.value)}
          />
        </FormField>
      </div>
      <div className="info-banner blue">ℹ️ El código se generará automáticamente.</div>
    </div>
  )
}
