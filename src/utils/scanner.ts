import { Html5Qrcode } from 'html5-qrcode'

let html5QrcodeScanner: Html5Qrcode | null = null
let scannerCallback: ((code: string) => void) | null = null

export function startBarcodeScanner(callback: (code: string) => void): void {
  scannerCallback = callback
  const modal = document.createElement('div')
  modal.id = 'barcode-scanner-modal'
  modal.className = 'scanner-modal'
  modal.innerHTML =
    '<div class="scanner-container" onclick="event.stopPropagation()">' +
    '<div class="scanner-header">' +
    '<div class="scanner-title">Escaner</div>' +
    '<button class="modal-close" id="scanner-close-btn" type="button">×</button>' +
    '</div>' +
    '<div class="scanner-viewport" id="scanner-viewport"><div id="scanner-reader"></div></div>' +
    '<div class="scanner-info">' +
    '<div class="scanner-mode-toggle">' +
    '<button class="mode-button active" data-mode="barcode">Codigo de Barras</button>' +
    '<button class="mode-button" data-mode="qr">Codigo QR</button>' +
    '</div>' +
    '<div class="scanner-instruction" id="scanner-instruction">Enfoca el codigo en la camara</div>' +
    '<div id="scanner-status"></div>' +
    '</div></div>'
  document.body.appendChild(modal)

  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') stopBarcodeScanner()
  }
  document.addEventListener('keydown', escHandler)

  setTimeout(() => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) stopBarcodeScanner()
    })
  }, 100)

  setTimeout(() => {
    const closeBtn = document.getElementById('scanner-close-btn')
    if (closeBtn) {
      closeBtn.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        stopBarcodeScanner()
      }
    }
  }, 100)

  setTimeout(() => {
    document.querySelectorAll('.mode-button').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-button').forEach((b) => b.classList.remove('active'))
        btn.classList.add('active')
        const instr = document.getElementById('scanner-instruction')
        if (instr) {
          instr.textContent =
            (btn as HTMLElement).dataset.mode === 'qr'
              ? 'Enfoca el codigo QR en la camara'
              : 'Enfoca el codigo de barras en la camara'
        }
      })
    })
  }, 100)

  setTimeout(() => {
    const html5QrCode = new Html5Qrcode('scanner-reader')
    html5QrcodeScanner = html5QrCode
    html5QrCode
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText) => {
          const statusEl = document.getElementById('scanner-status')
          if (statusEl) statusEl.innerHTML = '<div class="scanner-result">✓ Detectado: ' + decodedText + '</div>'
          try {
            new Audio('data:audio/wav;base64,UklGRl9vT1dBVkVmbXQAEAAAAA==').play().catch(() => {})
          } catch (_) { /* ignore */ }
          if (navigator.vibrate) navigator.vibrate(200)
          setTimeout(() => {
            if (scannerCallback) scannerCallback(decodedText)
            stopBarcodeScanner()
          }, 500)
        },
        () => {}
      )
      .then(() => {
        const statusEl = document.getElementById('scanner-status')
        if (statusEl) statusEl.innerHTML = '<div class="scanner-instruction" style="color:var(--accent-green)">Camara lista</div>'
      })
      .catch((err) => {
        const statusEl = document.getElementById('scanner-status')
        if (statusEl) statusEl.innerHTML = '<div class="scanner-result scanner-error">Error: ' + err + '</div>'
      })
  }, 200)
}

export function stopBarcodeScanner(): void {
  if (html5QrcodeScanner) {
    html5QrcodeScanner
      .stop()
      .then(() => {
        html5QrcodeScanner!.clear()
        html5QrcodeScanner = null
      })
      .catch(() => {
        html5QrcodeScanner = null
      })
  }
  const modal = document.getElementById('barcode-scanner-modal')
  if (modal) modal.remove()
  scannerCallback = null
}
