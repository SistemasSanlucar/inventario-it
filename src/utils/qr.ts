import QRCode from 'qrcode'

export function generateQRDataUrl(text: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      QRCode.toDataURL(
        text,
        { margin: 1, width: 256, color: { dark: '#000000', light: '#FFFFFF' } },
        (err: Error | null | undefined, url: string) => {
          if (err) {
            console.error('QR error:', err)
            resolve(null)
          } else {
            resolve(url)
          }
        }
      )
    } catch (e) {
      console.error('QR exception:', e)
      resolve(null)
    }
  })
}
