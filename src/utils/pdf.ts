import { jsPDF } from 'jspdf'
import { safePdfText } from './format'
import { generateQRDataUrl } from './qr'
import type { Activo } from '../types/equipment'
import type { Assignment } from '../types/assignment'

export async function exportEtiquetaPDF(
  activos: Activo[],
  showToast: (msg: string, type?: string) => void,
  tryDymo?: (activo: Activo) => Promise<boolean>,
  markPrinted?: (activoId: string) => Promise<void>
): Promise<void> {
  try {
    // Try DYMO direct first for single labels
    if (activos.length === 1 && tryDymo) {
      try {
        const printed = await tryDymo(activos[0])
        if (printed) {
          showToast('Etiqueta enviada a DYMO LabelWriter 550', 'success')
          if (markPrinted) {
            try { await markPrinted(activos[0].id) } catch (_) { /* ignore */ }
          }
          return
        }
      } catch (_) {
        showToast('DYMO no disponible. Generando PDF...', 'warning')
      }
    }

    // PDF fallback
    const W = 54
    const H = 25
    const baseUrl = window.location.href.split('?')[0].split('#')[0]
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [H, W] })

    for (let idx = 0; idx < activos.length; idx++) {
      const activo = activos[idx]
      if (idx > 0) doc.addPage([H, W], 'landscape')
      doc.setFillColor(255, 255, 255)
      doc.rect(0, 0, W, H, 'F')

      const qrUrl = baseUrl + '?equipo=' + activo.idEtiqueta
      try {
        const qrDataUrl = await generateQRDataUrl(qrUrl)
        const QR_SIZE = 22
        const QR_X = 1.5
        const QR_Y = 1.5
        if (qrDataUrl) {
          doc.addImage(qrDataUrl, 'PNG', QR_X, QR_Y, QR_SIZE, QR_SIZE)
        } else {
          doc.setFillColor(245, 245, 245)
          doc.rect(QR_X, QR_Y, QR_SIZE, QR_SIZE, 'F')
          doc.setDrawColor(180, 180, 180)
          doc.rect(QR_X, QR_Y, QR_SIZE, QR_SIZE, 'S')
          doc.setFontSize(4)
          doc.setTextColor(120, 120, 120)
          doc.text('QR', QR_X + QR_SIZE / 2, QR_Y + QR_SIZE / 2, { align: 'center' })
        }
      } catch (e) {
        console.error('QR error:', e)
      }

      // Vertical separator
      doc.setDrawColor(200, 200, 200)
      doc.line(25, 2, 25, H - 2)

      // Text zone
      const xT = 26.5
      const maxW = 26
      doc.setFontSize(4.5)
      doc.setFont(undefined as any, 'normal')
      doc.setTextColor(150, 150, 150)
      doc.text('SANLUCAR FRUIT · IT', xT, 4.5)

      doc.setFontSize(7.5)
      doc.setFont(undefined as any, 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(safePdfText(activo.idEtiqueta), xT, 10, { maxWidth: maxW })

      doc.setFontSize(6)
      doc.setFont(undefined as any, 'bold')
      doc.setTextColor(40, 40, 40)
      doc.text(safePdfText(activo.tipo), xT, 15.5, { maxWidth: maxW })

      if (activo.modelo) {
        doc.setFontSize(5.5)
        doc.setFont(undefined as any, 'normal')
        doc.setTextColor(80, 80, 80)
        doc.text(safePdfText(activo.modelo), xT, 19.5, { maxWidth: maxW })
      }

      if (activo.numSerie) {
        doc.setFontSize(5)
        doc.setFont(undefined as any, 'normal')
        doc.setTextColor(120, 120, 120)
        doc.text('N/S: ' + safePdfText(activo.numSerie), xT, 23, { maxWidth: maxW })
      }
    }

    doc.autoPrint()
    const pdfBlob = doc.output('blob')
    const pdfUrl = URL.createObjectURL(pdfBlob)
    window.open(pdfUrl, '_blank')
    showToast(activos.length + ' etiqueta(s) lista(s) — Ctrl+P para imprimir', 'success')
  } catch (e: any) {
    console.error(e)
    showToast('Error generando etiquetas', 'error')
  }
}

export function exportAssignmentToPDF(
  assignment: Assignment,
  showToast: (msg: string, type?: string) => void
): void {
  try {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    let y = 20

    // Header
    doc.setFontSize(18)
    doc.setFont(undefined as any, 'bold')
    doc.text('SANLUCAR FRUIT', pageWidth / 2, y, { align: 'center' })
    y += 8
    doc.setFontSize(12)
    doc.text(
      assignment.esPrestamo ? 'ACTA DE PRESTAMO DE MATERIAL IT' : 'ACTA DE ASIGNACION DE MATERIAL IT',
      pageWidth / 2,
      y,
      { align: 'center' }
    )
    y += 15

    // Employee data
    doc.setFontSize(11)
    doc.setFont(undefined as any, 'bold')
    doc.text('DATOS DEL EMPLEADO', margin, y)
    y += 8
    doc.setFont(undefined as any, 'normal')
    doc.setFontSize(10)
    doc.text('Nombre: ' + safePdfText(assignment.nombreEmpleado), margin, y)
    y += 6
    doc.text('Email: ' + safePdfText(assignment.emailEmpleado), margin, y)
    y += 6
    doc.text('Departamento: ' + safePdfText(assignment.departamento), margin, y)
    y += 6
    doc.text('Puesto: ' + safePdfText(assignment.puesto), margin, y)
    y += 6
    if (assignment.fechaIncorporacion) {
      doc.text('Fecha Alta: ' + new Date(assignment.fechaIncorporacion).toLocaleDateString('es-ES'), margin, y)
      y += 6
    }
    y += 6

    // Material
    doc.setFont(undefined as any, 'bold')
    doc.setFontSize(11)
    doc.text('MATERIAL ' + (assignment.esPrestamo ? 'EN PRESTAMO' : 'ASIGNADO'), margin, y)
    y += 8
    doc.setFont(undefined as any, 'normal')
    doc.setFontSize(10)

    let prods = assignment.productosAsignados || []
    if (typeof prods === 'string') {
      try { prods = JSON.parse(prods as any) } catch (_) { /* ignore */ }
    }
    prods.forEach((prod, idx) => {
      const tierText = prod.tier ? ' [' + prod.tier + ']' : ''
      const line =
        idx + 1 + '. ' + safePdfText(prod.nombre) + tierText +
        (prod.idEtiqueta ? ' [' + prod.idEtiqueta + ']' : prod.barcode ? ' (Cod: ' + prod.barcode + ')' : '')
      doc.text(line, margin, y)
      y += 6
      if (y > 270) { doc.addPage(); y = 20 }
    })
    y += 10

    // Conditions
    doc.setFont(undefined as any, 'bold')
    doc.setFontSize(11)
    doc.text('CONDICIONES DE USO', margin, y)
    y += 8
    doc.setFont(undefined as any, 'normal')
    doc.setFontSize(9)

    const tieneObsRelevantes = assignment.observaciones && assignment.observaciones.trim().length > 0
    const conditions = [
      tieneObsRelevantes
        ? 'El empleado declara conocer el estado del material recibido, detallado en las observaciones.'
        : 'El empleado declara haber recibido el material en perfecto estado.',
      'Se compromete a hacer un uso adecuado del mismo.',
      'Mantendra el material en buen estado de conservacion.',
      'Lo devolvera cuando finalice su relacion laboral o cuando se solicite.',
    ]
    conditions.forEach((cond) => {
      doc.text('- ' + cond, margin, y)
      y += 5
    })

    if (tieneObsRelevantes) {
      y += 5
      doc.setFont(undefined as any, 'bold')
      doc.setFillColor(255, 243, 205)
      doc.rect(margin - 2, y - 4, pageWidth - margin * 2 + 4, 6 + Math.ceil(assignment.observaciones.length / 90) * 5, 'F')
      doc.text('OBSERVACIONES / ESTADO DEL MATERIAL:', margin, y)
      y += 6
      doc.setFont(undefined as any, 'normal')
      const obsLines = doc.splitTextToSize(safePdfText(assignment.observaciones), pageWidth - margin * 2)
      doc.text(obsLines, margin, y)
      y += obsLines.length * 5 + 5
    }

    // Signature
    if (assignment.firmaEmpleado) {
      y += 10
      doc.setFont(undefined as any, 'bold')
      doc.setFontSize(10)
      doc.text('FIRMA DEL EMPLEADO:', margin, y)
      y += 6
      try { doc.addImage(assignment.firmaEmpleado, 'PNG', margin, y, 70, 25); y += 30 } catch (_) { /* ignore */ }
    }

    y += 10
    if (y > 240) { doc.addPage(); y = 20 }
    doc.setFontSize(10)
    doc.setFont(undefined as any, 'normal')
    doc.text('Empleado: ' + safePdfText(assignment.nombreEmpleado), margin, y)
    doc.text('Tecnico IT: ' + safePdfText(assignment.tecnicoResponsable || ''), pageWidth / 2 + 10, y)
    y += 20

    // QR
    const qrUrl = window.location.href.split('?')[0] + '?asignacion=' + (assignment.id || '')
    generateQRDataUrl(qrUrl)
      .then((qrDataUrl) => {
        if (qrDataUrl) {
          doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 28, y - 38, 28, 28)
          doc.setFontSize(7)
          doc.setTextColor(150, 150, 150)
          doc.text('Escanear para ver', pageWidth - margin - 28, y - 8, { maxWidth: 28 })
          doc.setTextColor(0, 0, 0)
        }
        doc.setFontSize(8)
        doc.text(
          'Fecha: ' + new Date(assignment.fechaAsignacion).toLocaleString('es-ES') + ' | Sanlucar Fruit IT',
          pageWidth / 2, y, { align: 'center' }
        )
        doc.save(
          'Asignacion_' +
            safePdfText(assignment.nombreEmpleado).replace(/\s+/g, '_') +
            '_' +
            new Date().toISOString().split('T')[0] +
            '.pdf'
        )
        showToast('PDF generado correctamente', 'success')
      })
      .catch(() => {
        doc.setFontSize(8)
        doc.text(
          'Fecha: ' + new Date(assignment.fechaAsignacion).toLocaleString('es-ES') + ' | Sanlucar Fruit IT',
          pageWidth / 2, y, { align: 'center' }
        )
        doc.save(
          'Asignacion_' +
            safePdfText(assignment.nombreEmpleado).replace(/\s+/g, '_') +
            '_' +
            new Date().toISOString().split('T')[0] +
            '.pdf'
        )
        showToast('PDF generado correctamente', 'success')
      })
  } catch (e: any) {
    console.error('Error generando PDF:', e)
    showToast('Error generando PDF: ' + (e.message || 'desconocido'), 'error')
  }
}

export function printTechnicianCard(tech: { nombre: string; codigo: string; email: string }): void {
  const barcodeImage = generateBarcode(tech.codigo)
  const printWindow = window.open('', '_blank')
  if (!printWindow) return
  printWindow.document.write(
    '<!DOCTYPE html><html><head><title>Tecnico - ' + tech.nombre + '</title>' +
    '<style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f0f0f0}' +
    '.card{background:white;padding:40px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.1);text-align:center;max-width:400px}' +
    'h1{color:#333;margin-bottom:10px;font-size:24px}.codigo{color:#666;font-size:18px;font-weight:bold;margin-bottom:20px}' +
    '.email{color:#999;font-size:14px;margin-bottom:30px}img{max-width:100%;height:auto}' +
    '.footer{margin-top:30px;padding-top:20px;border-top:2px solid #eee;color:#999;font-size:12px}' +
    '@media print{body{background:white}.card{box-shadow:none}}</style></head>' +
    '<body><div class="card"><h1>' + tech.nombre + '</h1>' +
    '<div class="codigo">Codigo: ' + tech.codigo + '</div>' +
    '<div class="email">' + tech.email + '</div>' +
    '<img src="' + barcodeImage + '" alt="Codigo de barras">' +
    '<div class="footer">Sistema de Inventario IT<br>Escanea este codigo para identificarte</div>' +
    '</div></body></html>'
  )
  printWindow.document.close()
  setTimeout(() => printWindow.print(), 250)
}

function generateBarcode(code: string): string {
  const canvas = document.createElement('canvas')
  // @ts-expect-error JsBarcode loaded globally
  JsBarcode(canvas, code, { format: 'CODE128', width: 2, height: 100, displayValue: true })
  return canvas.toDataURL('image/png')
}
