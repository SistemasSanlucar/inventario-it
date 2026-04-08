export interface ErrorLogEntry {
  id: number
  ts: string
  level: 'error' | 'warn' | 'info'
  context: string
  message: string
  detail: string
}

const MAX = 200
const entries: ErrorLogEntry[] = []
const listeners: Array<() => void> = []

function notify() {
  listeners.forEach((fn) => {
    try { fn() } catch (_) { /* ignore */ }
  })
}

export const ErrorLog = {
  add(level: ErrorLogEntry['level'], context: string, message: string, detail?: string) {
    entries.unshift({
      id: Date.now() + Math.random(),
      ts: new Date().toISOString(),
      level,
      context,
      message,
      detail: detail || '',
    })
    if (entries.length > MAX) entries.length = MAX
    notify()
    if (level === 'error') console.error('[' + context + ']', message, detail || '')
    else if (level === 'warn') console.warn('[' + context + ']', message)
  },
  error(ctx: string, msg: string, detail?: string) { ErrorLog.add('error', ctx, msg, detail) },
  warn(ctx: string, msg: string, detail?: string) { ErrorLog.add('warn', ctx, msg, detail) },
  info(ctx: string, msg: string, detail?: string) { ErrorLog.add('info', ctx, msg, detail) },
  getAll(): ErrorLogEntry[] { return entries.slice() },
  clear() { entries.length = 0; notify() },
  onChange(fn: () => void) { listeners.push(fn) },
  count(level?: string) {
    return level ? entries.filter((e) => e.level === level).length : entries.length
  },
}
