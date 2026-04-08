/**
 * Normalizes text for jsPDF output (strips diacritics, replaces non-ASCII).
 * Helvetica doesn't support extended Latin characters.
 */
export function safePdfText(str: string | null | undefined): string {
  if (!str) return ''
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[Ññ]/g, (c) => (c === 'ñ' ? 'n' : 'N'))
    .replace(/[^\x00-\x7E]/g, '?')
}

export function generateBarcode(code: string): string {
  const canvas = document.createElement('canvas')
  // @ts-expect-error JsBarcode is loaded as a global
  JsBarcode(canvas, code, { format: 'CODE128', width: 2, height: 100, displayValue: true })
  return canvas.toDataURL('image/png')
}
