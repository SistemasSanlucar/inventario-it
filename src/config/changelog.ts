export type ChangeType = 'feature' | 'improvement' | 'bug'

export interface ChangelogEntry {
  type: ChangeType
  text: string
}

export interface ChangelogVersion {
  version: string
  date: string
  changes: ChangelogEntry[]
}

const ICON: Record<ChangeType, string> = {
  feature: '\u2728',
  improvement: '\uD83D\uDD27',
  bug: '\uD83D\uDC1B',
}

export function entryIcon(type: ChangeType): string {
  return ICON[type] || '\uD83D\uDD27'
}

export const CHANGELOG: ChangelogVersion[] = [
  {
    version: '3.5.0',
    date: '2026-04-10',
    changes: [
      { type: 'feature', text: 'Pagina Acerca de con manual de usuario y changelog completo' },
      { type: 'feature', text: 'Modal de novedades al actualizar la version' },
      { type: 'feature', text: 'Modulo de Lineas Moviles Movistar' },
      { type: 'feature', text: 'Importacion masiva desde Excel con plantilla pre-rellenada' },
      { type: 'improvement', text: 'Plantilla Excel pre-rellenada con todos los productos del catalogo' },
      { type: 'improvement', text: 'Tabs de navegacion con animacion suave' },
      { type: 'improvement', text: 'Busqueda global incluye todas las asignaciones' },
      { type: 'improvement', text: 'Alerta en Dashboard para equipos con N/S sin etiqueta impresa' },
      { type: 'improvement', text: 'PDF del acta incluye el Tier del material asignado' },
      { type: 'improvement', text: 'Acceso directo al historial por empleado desde asignaciones' },
    ],
  },
  {
    version: '3.3.3',
    date: '2026-04-09',
    changes: [
      { type: 'bug', text: 'Cabeceras del historial desalineadas' },
      { type: 'bug', text: 'Catalogo incompleto en recepcion de lote' },
      { type: 'feature', text: 'Tier Estandar/Premium en inventario' },
      { type: 'feature', text: 'Indicador de etiqueta impresa en equipos' },
      { type: 'feature', text: 'N/S en lote: auto-avance y pegar lista' },
      { type: 'feature', text: 'Filtro por sociedad en equipos' },
    ],
  },
  {
    version: '3.3.2',
    date: '2026-04-08',
    changes: [
      { type: 'bug', text: 'Token de Graph API no se refrescaba tras 1 hora' },
      { type: 'improvement', text: 'Refresh selectivo por lista en lugar de recargar todo' },
      { type: 'bug', text: 'Firma guardada en historial inflando SharePoint' },
      { type: 'bug', text: 'Devolucion parcial no actualizaba ProductosAsignados' },
      { type: 'improvement', text: 'Vencimiento de prestamo respeta fecha personalizada' },
      { type: 'improvement', text: 'Logo y titulo clickables navegan al Dashboard' },
    ],
  },
  {
    version: '3.3.1',
    date: '2026-04-07',
    changes: [
      { type: 'feature', text: 'Firma obligatoria en asignaciones y prestamos' },
      { type: 'feature', text: 'Log de errores tecnicos en panel Admin' },
      { type: 'improvement', text: 'DYMO: mensaje claro cuando falta aceptar certificado' },
      { type: 'improvement', text: 'PDF de etiqueta adaptado a tamano 54x25mm' },
    ],
  },
  {
    version: '3.3.0',
    date: '2026-04-06',
    changes: [
      { type: 'bug', text: 'PDF mostraba material en perfecto estado aunque hubiera danos' },
      { type: 'feature', text: 'Campo libre al seleccionar Otro/Varios en catalogo' },
      { type: 'feature', text: 'Anadir producto al vuelo desde asignaciones' },
      { type: 'feature', text: 'Fecha de devolucion personalizada en prestamos' },
    ],
  },
]
