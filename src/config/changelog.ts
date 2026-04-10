export interface ChangelogEntry {
  type: 'feature' | 'mejora' | 'bug'
  text: string
}

export interface ChangelogVersion {
  version: string
  date: string
  entries: ChangelogEntry[]
}

const ICON: Record<ChangelogEntry['type'], string> = {
  feature: '\u2728',
  mejora: '\uD83D\uDD27',
  bug: '\uD83D\uDC1B',
}

export function entryIcon(type: ChangelogEntry['type']): string {
  return ICON[type]
}

export const CHANGELOG: ChangelogVersion[] = [
  {
    version: '3.3.4',
    date: '2026-04-10',
    entries: [
      { type: 'feature', text: 'Sistema de Changelog con modal de novedades al actualizar' },
      { type: 'feature', text: 'Importacion masiva desde Excel con plantilla descargable y validacion' },
      { type: 'mejora', text: 'Animacion deslizante en las tabs de navegacion' },
      { type: 'mejora', text: 'Busqueda global incluye todas las asignaciones (no solo activas)' },
      { type: 'mejora', text: 'Alerta en Dashboard para equipos con N/S sin etiqueta impresa' },
      { type: 'mejora', text: 'PDF del acta incluye el Tier del material asignado' },
      { type: 'mejora', text: 'Boton de acceso directo al historial filtrado por empleado desde asignaciones' },
    ],
  },
  {
    version: '3.3.3',
    date: '2026-04-08',
    entries: [
      { type: 'mejora', text: 'Titulo de la aplicacion actualizado' },
      { type: 'bug', text: 'Correccion en creacion de administradores (campo Activo como booleano)' },
    ],
  },
  {
    version: '3.3.0',
    date: '2026-04-01',
    entries: [
      { type: 'feature', text: 'Migracion completa a React con estructura de carpetas' },
      { type: 'feature', text: 'Sistema de autenticacion MSAL con Azure AD' },
      { type: 'feature', text: 'Gestion de equipos con etiquetas y codigos QR' },
      { type: 'feature', text: 'Sistema de asignaciones y prestamos con firma digital' },
    ],
  },
]
