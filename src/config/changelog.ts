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
    version: '3.7.0',
    date: '2026-10-21',
    changes: [
      { type: 'feature', text: 'Auditoría automática de inventario en el panel Admin — solo lectura, no modifica nada' },
      { type: 'feature', text: 'Detecta 4 tipos de anomalías: empleado con varios portátiles/móviles/monitores; equipo en "Almacén" dentro de asignación vigente; equipo "Asignado" sin asignación vigente; equipo en varios empleados a la vez' },
      { type: 'improvement', text: 'Identificación de empleados por email normalizado — nunca agrupa por nombre si falta el email' },
      { type: 'improvement', text: 'Vista muestra qué tipos del catálogo real se clasifican como portátil/móvil/monitor para que el admin pueda validar en vivo' },
      { type: 'improvement', text: 'Cada anomalía incluye evidencia expandible y acceso directo a la ficha del equipo o al historial del empleado' },
    ],
  },
  {
    version: '3.6.3',
    date: '2026-10-19',
    changes: [
      { type: 'bug', text: 'Modal "Alargar préstamo": confirmación visual con la fecha en formato español (DD/MM/YYYY) y día de la semana, para evitar confusión con el formato del selector nativo del navegador' },
    ],
  },
  {
    version: '3.6.2',
    date: '2026-10-19',
    changes: [
      { type: 'feature', text: 'Botón "📅 Alargar préstamo" en cards y tabla de asignaciones — ya no hace falta cerrar el préstamo y crear uno nuevo para extender la fecha de devolución' },
      { type: 'improvement', text: 'Modal con fecha actual precargada y aviso visual si el préstamo ya está vencido' },
      { type: 'improvement', text: 'Cada prórroga queda registrada en el historial con la nueva fecha de devolución' },
    ],
  },
  {
    version: '3.6.1',
    date: '2026-10-19',
    changes: [
      { type: 'bug', text: 'Etiqueta DYMO: texto en negro puro + negrita para que la térmica imprima legible' },
      { type: 'improvement', text: 'Cabecera "SANLUCAR FRUIT · IT" con banda negra invertida para que destaque' },
      { type: 'improvement', text: 'ID Etiqueta más grande (9pt) y separador horizontal bajo él' },
    ],
  },
  {
    version: '3.6.0',
    date: '2026-04-10',
    changes: [
      { type: 'feature', text: 'Manual de usuario completo accesible desde Acerca de' },
      { type: 'feature', text: 'Casos de uso paso a paso para tareas habituales (recepcion, asignacion, importacion, etc.)' },
      { type: 'improvement', text: 'Validacion de importacion no ignora filas con stock=0' },
      { type: 'bug', text: 'Corregido typo en titulo de la app (SSSistema → Sistema)' },
    ],
  },
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
