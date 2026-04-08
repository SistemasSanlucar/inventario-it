import { safePdfText } from './format'
import { generateQRDataUrl } from './qr'
import { DYMO_PRINTER, DYMO_DLS_PRINT } from '../config/constants'
import type { Activo } from '../types/equipment'

async function buildDymoLabelXml(activo: Activo): Promise<string> {
  const labelName = localStorage.getItem('dymo_label_name') || '2112283'
  const qrUrl = window.location.href.split('?')[0].split('#')[0] + '?equipo=' + activo.idEtiqueta
  const id = safePdfText(activo.idEtiqueta)
  const modelo = activo.modelo ? safePdfText(activo.modelo) : ''
  const ns = activo.numSerie ? 'N/S: ' + safePdfText(activo.numSerie) : ''

  let qrBase64 = ''
  try {
    const qrDataUrl = await generateQRDataUrl(qrUrl)
    if (qrDataUrl && qrDataUrl.indexOf('base64,') !== -1) {
      qrBase64 = qrDataUrl.split('base64,')[1]
    }
  } catch (e: any) {
    console.warn('[DYMO] QR error:', e.message)
  }

  const brushes =
    '<Brushes>' +
    '<BackgroundBrush><SolidColorBrush><Color A="0" R="1" G="1" B="1"/></SolidColorBrush></BackgroundBrush>' +
    '<BorderBrush><SolidColorBrush><Color A="1" R="0" G="0" B="0"/></SolidColorBrush></BorderBrush>' +
    '<StrokeBrush><SolidColorBrush><Color A="1" R="0" G="0" B="0"/></SolidColorBrush></StrokeBrush>' +
    '<FillBrush><SolidColorBrush><Color A="0" R="1" G="1" B="1"/></SolidColorBrush></FillBrush>' +
    '</Brushes>'
  const commonProps =
    '<Rotation>Rotation0</Rotation>' +
    '<OutlineThickness>1</OutlineThickness>' +
    '<IsOutlined>False</IsOutlined>' +
    '<BorderStyle>SolidLine</BorderStyle>' +
    '<Margin><DYMOThickness Left="0" Top="0" Right="0" Bottom="0"/></Margin>'

  const fontInfo = (size: number, bold: string, r: string, g: string, b: string) =>
    '<FontInfo><FontName>Segoe UI</FontName><FontSize>' + size + '</FontSize>' +
    '<IsBold>' + bold + '</IsBold><IsItalic>False</IsItalic><IsUnderline>False</IsUnderline>' +
    '<FontBrush><SolidColorBrush><Color A="1" R="' + r + '" G="' + g + '" B="' + b + '"/></SolidColorBrush></FontBrush>' +
    '</FontInfo>'

  const txt = (name: string, text: string, x: string, y: string, w: string, h: string, size: number, bold: string, r: string, g: string, b: string) => {
    if (!text) return ''
    const nameTag = '<Name>' + name + '</Name>'
    return (
      '<TextObject>' + nameTag + brushes + commonProps +
      '<HorizontalAlignment>Left</HorizontalAlignment><VerticalAlignment>Middle</VerticalAlignment>' +
      '<FitMode>AlwaysFit</FitMode><IsVertical>False</IsVertical>' +
      '<FormattedText><FitMode>AlwaysFit</FitMode><HorizontalAlignment>Left</HorizontalAlignment>' +
      '<VerticalAlignment>Middle</VerticalAlignment><IsVertical>False</IsVertical>' +
      '<LineTextSpan><TextSpan><Text>' + text + '</Text>' + fontInfo(size, bold, r, g, b) + '</TextSpan></LineTextSpan>' +
      '</FormattedText>' +
      '<ObjectLayout><DYMOPoint><X>' + x + '</X><Y>' + y + '</Y></DYMOPoint>' +
      '<Size><Width>' + w + '</Width><Height>' + h + '</Height></Size></ObjectLayout>' +
      '</TextObject>'
    )
  }

  const imgNameTag = '<Name>QR1</Name>'
  const imageObj = qrBase64
    ? '<ImageObject>' + imgNameTag + brushes + commonProps +
      '<Data>' + qrBase64 + '</Data>' +
      '<ScaleMode>Uniform</ScaleMode>' +
      '<HorizontalAlignment>Center</HorizontalAlignment>' +
      '<VerticalAlignment>Middle</VerticalAlignment>' +
      '<ObjectLayout><DYMOPoint><X>0.06</X><Y>0.04</Y></DYMOPoint>' +
      '<Size><Width>0.78</Width><Height>0.78</Height></Size></ObjectLayout>' +
      '</ImageObject>'
    : ''

  const tX = '0.84'
  const tW = '1.18'
  const labelObjects =
    imageObj +
    txt('ID', id, tX, '0.04', tW, '0.22', 7, 'True', '0', '0', '0') +
    txt('MODELO', modelo, tX, '0.30', tW, '0.22', 7, 'True', '0', '0', '0') +
    txt('NS', ns, tX, '0.56', tW, '0.22', 7, 'True', '0', '0', '0')

  return (
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<DesktopLabel Version="1"><DYMOLabel Version="3">' +
    '<Description>Etiqueta IT Sanlucar</Description><Orientation>Landscape</Orientation>' +
    '<LabelName>' + labelName + '</LabelName><InitialLength>0</InitialLength>' +
    '<BorderStyle>SolidLine</BorderStyle>' +
    '<DYMORect><DYMOPoint><X>0.06</X><Y>0.06</Y></DYMOPoint>' +
    '<Size><Width>2.06</Width><Height>0.86</Height></Size></DYMORect>' +
    '<BorderColor><SolidColorBrush><Color A="1" R="0" G="0" B="0"/></SolidColorBrush></BorderColor>' +
    '<BorderThickness>1</BorderThickness><Show_Border>False</Show_Border>' +
    '<DynamicLayoutManager><RotationBehavior>ClearObjects</RotationBehavior>' +
    '<LabelObjects>' + labelObjects + '</LabelObjects>' +
    '</DynamicLayoutManager></DYMOLabel>' +
    '<LabelApplication>Blank</LabelApplication>' +
    '<DataTable><Columns/><Rows/></DataTable></DesktopLabel>'
  )
}

export async function printDymoLabel(activo: Activo): Promise<boolean> {
  const labelXml = await buildDymoLabelXml(activo)
  const printParams =
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<LabelWriterPrintParams><Copies>1</Copies>' +
    '<PrinterName>' + DYMO_PRINTER + '</PrinterName></LabelWriterPrintParams>'
  const body =
    'printerName=' + encodeURIComponent(DYMO_PRINTER) +
    '&printParamsXml=' + encodeURIComponent(printParams) +
    '&labelXml=' + encodeURIComponent(labelXml) +
    '&labelSetXml=' + encodeURIComponent('<LabelSet><LabelRecord></LabelRecord></LabelSet>')

  const resp = await fetch(DYMO_DLS_PRINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const text = await resp.text()
  console.log('[DYMO] DLS response:', resp.status, text.slice(0, 200))
  if (!resp.ok) throw new Error('DYMO DLS error ' + resp.status + ': ' + text.slice(0, 200))
  return true
}
