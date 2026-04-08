export type ToastType = 'success' | 'error' | 'warning'

export function showToast(message: string, type: ToastType = 'success'): void {
  const container = document.getElementById('toast-container')
  if (!container) return
  const toast = document.createElement('div')
  toast.className = 'toast ' + type
  const icons: Record<string, string> = { success: '✓', error: '✕', warning: '⚠' }
  toast.innerHTML =
    '<span class="icon">' + (icons[type] || '•') + '</span><span class="text">' + message + '</span>'
  container.appendChild(toast)
  setTimeout(() => {
    toast.style.animation = 'slideIn .3s ease reverse'
    setTimeout(() => toast.remove(), 300)
  }, 4000)
}
