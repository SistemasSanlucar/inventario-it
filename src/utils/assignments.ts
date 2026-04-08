import type { Assignment } from '../types'

export function getFechaVencimientoPrestamo(asignacion: Assignment): Date | null {
  if (!asignacion.esPrestamo) return null
  const obs = asignacion.observaciones || ''
  const match = obs.match(/\[Dev\. prevista:\s*(\d{1,2}\/\d{1,2}\/\d{4})\]/)
  if (match) {
    const parts = match[1].split('/')
    const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
    d.setHours(23, 59, 59, 0)
    return d
  }
  // No date → expires at end of assignment day
  const fa = new Date(asignacion.fechaAsignacion)
  fa.setHours(23, 59, 59, 0)
  return fa
}
