import { showToast } from '../../components/feedback/toast';

    function exportToCSV(data, filename) {
        if (!data || data.length === 0) { showToast('No hay datos para exportar', 'warning'); return; }
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        data.forEach(row => { const values = headers.map(field => { let value = row[field] || ''; if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) value = '"' + value.replace(/"/g, '""') + '"'; return value; }); csvRows.push(values.join(',')); });
        const blob = new Blob(['\ufeff' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename + '_' + new Date().toISOString().split('T')[0] + '.csv';
        link.click();
        showToast('Archivo exportado correctamente', 'success');
    }

    function exportAuditoria(state, opts) {
        if (typeof XLSX === 'undefined') { showToast('Librería Excel no disponible', 'error'); return; }
        const { sociedad, desde, hasta } = opts || {};
        const wb = XLSX.utils.book_new();
        const fechaHoy = new Date().toISOString().split('T')[0];
        const filtroSoc = function(v) { return !sociedad || !v || v === sociedad; };
        const filtroFecha = function(f) {
            if (!f) return true;
            const d = new Date(f);
            if (desde && d < new Date(desde)) return false;
            if (hasta && d > new Date(hasta + 'T23:59:59')) return false;
            return true;
        };

        // ── Hoja 1: Equipos etiquetados ───────────────────────────────────────
        const equiposRows = (state.activos || [])
            .filter(function(a) { return filtroSoc(a.sociedad); })
            .map(function(a) { return {
                'ID Etiqueta':    a.idEtiqueta || '',
                'Tipo':           a.tipo || '',
                'Modelo':         a.modelo || '',
                'Nº Serie':       a.numSerie || '',
                'Estado':         a.estado || '',
                'Ubicación':      a.ubicacion || '',
                'Sociedad':       a.sociedad || '',
                'Asignado A':     a.asignadoA || '',
                'Email Asignado': a.emailAsignadoA || '',
                'Fecha Asignación': a.fechaAsignacion ? new Date(a.fechaAsignacion).toLocaleDateString('es-ES') : '',
                'Proveedor':      a.proveedor || '',
                'Nº Albarán':     a.numAlbaran || '',
                'Fecha Compra':   a.fechaCompra ? new Date(a.fechaCompra).toLocaleDateString('es-ES') : '',
                'Garantía hasta': a.fechaGarantia ? new Date(a.fechaGarantia).toLocaleDateString('es-ES') : '',
                'Notas':          a.notas || '',
            }; });
        const wsEquipos = XLSX.utils.json_to_sheet(equiposRows.length ? equiposRows : [{ 'Sin datos': 'No hay equipos con estos filtros' }]);
        // Ancho de columnas
        wsEquipos['!cols'] = [14,14,18,16,12,16,10,20,26,16,16,14,13,14,30].map(function(w) { return { wch: w }; });
        XLSX.utils.book_append_sheet(wb, wsEquipos, 'Equipos');

        // ── Hoja 2: Inventario fungible ───────────────────────────────────────
        const invRows = (state.inventory || []).map(function(i) { return {
            'Nombre':       i.nombre || '',
            'Categoría':    i.categoria || '',
            'Cód. Barras':  i.barcode || '',
            'Stock':        i.stock || 0,
            'Stock Mínimo': i.stockMinimo || 0,
            'Estado':       i.stock === 0 ? 'SIN STOCK' : i.stock <= i.stockMinimo ? 'BAJO' : 'OK',
            'Ubicación':    i.ubicacion || '',
        }; });
        const wsInv = XLSX.utils.json_to_sheet(invRows.length ? invRows : [{ 'Sin datos': '' }]);
        wsInv['!cols'] = [30,16,14,8,12,10,16].map(function(w) { return { wch: w }; });
        XLSX.utils.book_append_sheet(wb, wsInv, 'Inventario');

        // ── Hoja 3: Historial de movimientos ──────────────────────────────────
        const histRows = (state.history || [])
            .filter(function(h) { return filtroFecha(h.fecha); })
            .sort(function(a, b) { return new Date(b.fecha) - new Date(a.fecha); })
            .map(function(h) { return {
                'Fecha':     h.fecha ? new Date(h.fecha).toLocaleDateString('es-ES') : '',
                'Hora':      h.fecha ? new Date(h.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '',
                'Tipo':      h.tipo || '',
                'Producto':  h.producto || '',
                'Cantidad':  h.cantidad || '',
                'Técnico':   h.tecnico || '',
                'Usuario':   h.usuario || '',
                'Ticket':    h.ticket || '',
                'ID Equipo': h.idEtiqueta || '',
            }; });
        const wsHist = XLSX.utils.json_to_sheet(histRows.length ? histRows : [{ 'Sin datos': 'No hay movimientos en este período' }]);
        wsHist['!cols'] = [11,7,12,28,8,20,20,12,16].map(function(w) { return { wch: w }; });
        XLSX.utils.book_append_sheet(wb, wsHist, 'Historial');

        // ── Hoja 4: Asignaciones activas ──────────────────────────────────────
        const asigRows = (state.assignments || [])
            .filter(function(a) { return a.estado === 'Activo'; })
            .map(function(a) { return {
                'Empleado':     a.nombreEmpleado || '',
                'Email':        a.emailEmpleado || '',
                'Departamento': a.departamento || '',
                'Puesto':       a.puesto || '',
                'Tipo':         a.esPrestamo ? 'Préstamo' : 'Asignación',
                'Estado':       a.estado || '',
                'Fecha':        a.fechaAsignacion ? new Date(a.fechaAsignacion).toLocaleDateString('es-ES') : '',
                'Técnico':      a.tecnicoResponsable || '',
                'Material':     a.detalleProductos || '',
                'Observaciones': a.observaciones || '',
            }; });
        const wsAsig = XLSX.utils.json_to_sheet(asigRows.length ? asigRows : [{ 'Sin datos': 'No hay asignaciones activas' }]);
        wsAsig['!cols'] = [24,28,18,18,10,10,12,20,40,24].map(function(w) { return { wch: w }; });
        XLSX.utils.book_append_sheet(wb, wsAsig, 'Asignaciones');

        // ── Hoja 5: Resumen ejecutivo ─────────────────────────────────────────
        const totalEquipos = equiposRows.length;
        const asignados = equiposRows.filter(function(r) { return r['Estado'] === 'Asignado'; }).length;
        const almacen   = equiposRows.filter(function(r) { return r['Estado'] === 'Almacen'; }).length;
        const resumenData = [
            { 'Concepto': 'RESUMEN EJECUTIVO IT', 'Valor': '', 'Detalle': 'Generado: ' + fechaHoy },
            { 'Concepto': '', 'Valor': '', 'Detalle': '' },
            { 'Concepto': '── EQUIPOS ──', 'Valor': '', 'Detalle': '' },
            { 'Concepto': 'Total equipos etiquetados', 'Valor': totalEquipos, 'Detalle': '' },
            { 'Concepto': 'Asignados a empleados', 'Valor': asignados, 'Detalle': Math.round(asignados / (totalEquipos || 1) * 100) + '%' },
            { 'Concepto': 'En almacén', 'Valor': almacen, 'Detalle': '' },
            { 'Concepto': 'Extraviados / Robados', 'Valor': equiposRows.filter(function(r) { return r['Estado'] === 'Extraviado' || r['Estado'] === 'Robado'; }).length, 'Detalle': '' },
            { 'Concepto': '', 'Valor': '', 'Detalle': '' },
            { 'Concepto': '── INVENTARIO ──', 'Valor': '', 'Detalle': '' },
            { 'Concepto': 'Referencias de material', 'Valor': invRows.length, 'Detalle': '' },
            { 'Concepto': 'Total unidades en stock', 'Valor': invRows.reduce(function(s, i) { return s + (i['Stock'] || 0); }, 0), 'Detalle': '' },
            { 'Concepto': 'Productos sin stock', 'Valor': invRows.filter(function(i) { return i['Estado'] === 'SIN STOCK'; }).length, 'Detalle': '' },
            { 'Concepto': 'Productos con stock bajo', 'Valor': invRows.filter(function(i) { return i['Estado'] === 'BAJO'; }).length, 'Detalle': '' },
            { 'Concepto': '', 'Valor': '', 'Detalle': '' },
            { 'Concepto': '── ACTIVIDAD ──', 'Valor': '', 'Detalle': '' },
            { 'Concepto': 'Movimientos en período', 'Valor': histRows.length, 'Detalle': (desde || 'inicio') + ' → ' + (hasta || 'hoy') },
            { 'Concepto': 'Asignaciones activas', 'Valor': asigRows.length, 'Detalle': '' },
            { 'Concepto': 'Técnicos activos', 'Valor': (state.technicians || []).filter(function(t) { return t.activo; }).length, 'Detalle': '' },
        ];
        const wsResumen = XLSX.utils.json_to_sheet(resumenData);
        wsResumen['!cols'] = [{ wch: 32 }, { wch: 10 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

        // ── Descargar ─────────────────────────────────────────────────────────
        const filename = 'Auditoria_IT_' + (sociedad ? sociedad + '_' : '') + fechaHoy + '.xlsx';
        XLSX.writeFile(wb, filename);
        showToast('✅ Auditoría exportada — ' + filename, 'success');
    }
    // jsPDF usa Helvetica que no soporta caracteres latinos extendidos.
    // Esta función normaliza el texto para evitar caracteres corruptos en los PDFs.
    function safePdfText(str) {
        if (!str) return '';
        return String(str)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // elimina diacríticos: á→a, é→e, etc.
            .replace(/[Ññ]/g, function(c) { return c === 'ñ' ? 'n' : 'N'; })
            .replace(/[^\x00-\x7E]/g, '?'); // reemplaza cualquier otro no-ASCII
    }
    function generateBarcode(code) {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, code, { format: 'CODE128', width: 2, height: 100, displayValue: true });
        return canvas.toDataURL('image/png');
    }
    function printTechnicianCard(tech) {
        const printWindow = window.open('', '_blank');
        const barcodeImage = generateBarcode(tech.codigo);
        printWindow.document.write('<!DOCTYPE html><html><head><title>Tecnico - ' + tech.nombre + '</title><style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f0f0f0}.card{background:white;padding:40px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.1);text-align:center;max-width:400px}h1{color:#333;margin-bottom:10px;font-size:24px}.codigo{color:#666;font-size:18px;font-weight:bold;margin-bottom:20px}.email{color:#999;font-size:14px;margin-bottom:30px}img{max-width:100%;height:auto}.footer{margin-top:30px;padding-top:20px;border-top:2px solid #eee;color:#999;font-size:12px}@media print{body{background:white}.card{box-shadow:none}}</style></head><body><div class="card"><h1>' + tech.nombre + '</h1><div class="codigo">Codigo: ' + tech.codigo + '</div><div class="email">' + tech.email + '</div><img src="' + barcodeImage + '" alt="Codigo de barras"><div class="footer">Sistema de Inventario IT<br>Escanea este codigo para identificarte</div></div></body></html>');
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 250);
    }
    // ── DYMO Direct Print ───────────────────────────────────────────────────────
    const DYMO_URL = 'https://127.0.0.1:41951';
    const DYMO_PRINTER = 'DYMO LabelWriter 550';

    // Mapeo SKU → PaperName conocidos para DYMO LabelWriter 550
    const DYMO_SKU_MAP = {
        'S0722560': '11356 Name Badge',   // 89x41mm — el nuestro
        'S0722400': '99012 Address',      // 89x36mm
        'S0722370': '99010 Address',      // 89x28mm
        'S0720030': '30256 Shipping',     // 59x102mm
        'S0722520': '11352 Return Address',
        'S0722550': '11355 Multi-Purpose',
        'S0722530': '11353 Multi-Purpose',
        'S0722390': '99015 Lever Arch',
    };

    // PaperNames a probar en orden si no podemos detectarlo por SKU
    const DYMO_PAPER_FALLBACKS = [
        '11356 Name Badge',
        'S0722560',
        '11356',
        'Small Name Badge',
        'Name Badge 89 x 41',
    ];

    // Detecta el PaperName correcto consultando la impresora
    // Detecta el LabelName correcto consultando la impresora (formato DCD v1.6)
    async function detectDymoLabelName() {
        const cached = localStorage.getItem('dymo_label_name');
        if (cached) { console.log('[DYMO] Usando LabelName guardado:', cached); return cached; }
        try {
            const resp = await fetch(DYMO_URL + '/dcd/api/get-default-label/LabelWriter');
            if (resp.ok) {
                const data = await resp.json();
                const rv = data.responseValue || data;
                const ln = rv && rv.label && rv.label.name;
                if (ln) { console.log('[DYMO] LabelName desde get-default-label:', ln); return ln; }
            }
        } catch(e) { console.warn('[DYMO] get-default-label falló:', e.message); }
        return null;
    }

    // Construye XML en formato DesktopLabel (DYMO Connect 1.6.x) — unidades en pulgadas
    function buildDymoLabelXml(activo, labelName) {
        labelName = labelName || localStorage.getItem('dymo_label_name') || 'NameBadge11356';
        // 89mm x 41mm en pulgadas landscape: W=3.504", H=1.614"
        const W = 3.504, H = 1.614;
        const qrUrl = window.location.href.split('?')[0].split('#')[0] + '?equipo=' + activo.idEtiqueta;
        const id     = safePdfText(activo.idEtiqueta);
        const tipo   = safePdfText(activo.tipo);
        const modelo = activo.modelo   ? safePdfText(activo.modelo)   : '';
        const ns     = activo.numSerie ? 'N/S: ' + safePdfText(activo.numSerie) : '';
        const soc    = activo.sociedad ? safePdfText(activo.sociedad) : '';

        const txt = function(name, text, x, y, w, h, fontSize, isBold, r, g, b) {
            if (!text) return '';
            return '<TextObject><Name>' + name + '</Name><Brushes><BackgroundBrush><SolidColorBrush><Color A="0" R="1" G="1" B="1"/></SolidColorBrush></BackgroundBrush><BorderBrush><SolidColorBrush><Color A="1" R="0" G="0" B="0"/></SolidColorBrush></BorderBrush><StrokeBrush><SolidColorBrush><Color A="1" R="0" G="0" B="0"/></SolidColorBrush></StrokeBrush><FillBrush><SolidColorBrush><Color A="0" R="1" G="1" B="1"/></SolidColorBrush></FillBrush></Brushes><Rotation>Rotation0</Rotation><OutlineThickness>1</OutlineThickness><IsOutlined>False</IsOutlined><BorderStyle>SolidLine</BorderStyle><Margin><DYMOThickness Left="0" Top="0" Right="0" Bottom="0"/></Margin><HorizontalAlignment>Left</HorizontalAlignment><VerticalAlignment>Middle</VerticalAlignment><FitMode>AlwaysFit</FitMode><IsVertical>False</IsVertical><FormattedText><FitMode>AlwaysFit</FitMode><HorizontalAlignment>Left</HorizontalAlignment><VerticalAlignment>Middle</VerticalAlignment><IsVertical>False</IsVertical><LineTextSpan><TextSpan><Text>' + text + '</Text><FontInfo><FontName>Segoe UI</FontName><FontSize>' + fontSize + '</FontSize><IsBold>' + isBold + '</IsBold><IsItalic>False</IsItalic><IsUnderline>False</IsUnderline><FontBrush><SolidColorBrush><Color A="1" R="' + r + '" G="' + g + '" B="' + b + '"/></SolidColorBrush></FontBrush></FontInfo></TextSpan></LineTextSpan></FormattedText><ObjectLayout><DYMOPoint><X>' + x + '</X><Y>' + y + '</Y></DYMOPoint><Size><Width>' + w + '</Width><Height>' + h + '</Height></Size></ObjectLayout></TextObject>';
        };

        const tX = 1.62, tW = 1.82;
        return '<?xml version="1.0" encoding="utf-8"?>' +
'<DesktopLabel Version="1">' +
'<DYMOLabel Version="3">' +
'<Description>Etiqueta IT Sanlucar</Description>' +
'<Orientation>Landscape</Orientation>' +
'<LabelName>' + labelName + '</LabelName>' +
'<InitialLength>0</InitialLength>' +
'<BorderStyle>SolidLine</BorderStyle>' +
'<DYMORect><DYMOPoint><X>0.06</X><Y>0.06</Y></DYMOPoint><Size><Width>' + (W-0.12).toFixed(3) + '</Width><Height>' + (H-0.12).toFixed(3) + '</Height></Size></DYMORect>' +
'<BorderColor><SolidColorBrush><Color A="1" R="0" G="0" B="0"/></SolidColorBrush></BorderColor>' +
'<BorderThickness>1</BorderThickness><Show_Border>False</Show_Border>' +
'<DynamicLayoutManager><RotationBehavior>ClearObjects</RotationBehavior><LabelObjects>' +
'<BarcodeObject>' +'<Name>QR1</Name>' +'<Brushes>' +'<BackgroundBrush><SolidColorBrush><Color A="0" R="1" G="1" B="1"/></SolidColorBrush></BackgroundBrush>' +'<BorderBrush><SolidColorBrush><Color A="1" R="0" G="0" B="0"/></SolidColorBrush></BorderBrush>' +'<StrokeBrush><SolidColorBrush><Color A="1" R="0" G="0" B="0"/></SolidColorBrush></StrokeBrush>' +'<FillBrush><SolidColorBrush><Color A="0" R="1" G="1" B="1"/></SolidColorBrush></FillBrush>' +'</Brushes>' +'<Rotation>Rotation0</Rotation>' +'<OutlineThickness>1</OutlineThickness>' +'<IsOutlined>False</IsOutlined>' +'<BorderStyle>SolidLine</BorderStyle>' +'<Margin><DYMOThickness Left="0" Top="0" Right="0" Bottom="0"/></Margin>' +'<HorizontalAlignment>Center</HorizontalAlignment>' +'<VerticalAlignment>Middle</VerticalAlignment>' +'<FitMode>AlwaysFit</FitMode>' +'<IsVertical>False</IsVertical>' +'<BarcodeFormat>QRCode</BarcodeFormat>' +'<Data><DataString>' + qrUrl + '</DataString></Data>' +'<Size>Large</Size>' +'<TextPosition>None</TextPosition>' +'<ObjectLayout>' +'<DYMOPoint><X>0.06</X><Y>0.06</Y></DYMOPoint>' +'<Size><Width>1.44</Width><Height>1.44</Height></Size>' +'</ObjectLayout>' +'</BarcodeObject>' +
txt('TXT_EMPRESA', 'SANLUCAR FRUIT · IT', tX, 0.06, tW, 0.18, 7,    'False', '0.51', '0.51', '0.51') +
txt('TXT_ID',      id,                       tX, 0.27, tW, 0.32, 11,   'True',  '0',    '0',    '0'   ) +
txt('TXT_TIPO',    tipo,                      tX, 0.63, tW, 0.26, 9,    'True',  '0.12', '0.12', '0.12') +
txt('TXT_MODELO',  modelo,                    tX, 0.93, tW, 0.22, 7.5,  'False', '0.27', '0.27', '0.27') +
txt('TXT_NS',      ns,                        tX, 1.18, tW, 0.20, 6.5,  'False', '0.39', '0.39', '0.39') +
txt('TXT_SOC',     soc,                       tX, 1.41, tW, 0.16, 6,    'False', '0.59', '0.59', '0.59') +
'</LabelObjects></DynamicLayoutManager></DYMOLabel>' +
'<LabelApplication>Blank</LabelApplication>' +
'<DataTable><Columns/><Rows/></DataTable>' +
'</DesktopLabel>';
    }

    // Envía XML a la API REST de DYMO Connect 1.6
    async function sendDymoPrint(labelXml) {
        const body = JSON.stringify({ printerName: DYMO_PRINTER, labelXml, copies: 1 });
        const resp = await fetch(DYMO_URL + '/dcd/api/print-label', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body
        });
        const text = await resp.text();
        let data; try { data = JSON.parse(text); } catch(e) { data = { status: resp.ok }; }
        if (!resp.ok || data.status === false) {
            throw new Error(data.error || text.slice(0, 300));
        }
        return true;
    }

    // LabelNames a probar en orden
    const DYMO_LABEL_FALLBACKS = ['Address30251'];

    async function printDymoLabel(activo) {
        const detectedName = await detectDymoLabelName();
        const namesToTry = detectedName
            ? [detectedName, ...DYMO_LABEL_FALLBACKS.filter(function(n) { return n !== detectedName; })]
            : DYMO_LABEL_FALLBACKS;
        var lastError = null;
        for (var i = 0; i < namesToTry.length; i++) {
            var labelName = namesToTry[i];
            try {
                console.log('[DYMO] Intentando LabelName:', labelName);
                var labelXml = buildDymoLabelXml(activo, labelName);
                await sendDymoPrint(labelXml);
                console.log('[DYMO] ✅ OK con LabelName:', labelName);
                try { localStorage.setItem('dymo_label_name', labelName); } catch(e) {}
                return true;
            } catch(e) {
                console.warn('[DYMO] ❌ Falló "' + labelName + '":', e.message.slice(0, 150));
                lastError = e;
                var msg = e.message || '';
                if (!msg.includes('not declared') && !msg.includes('Invalid label') &&
                    !msg.includes('LabelName') && !msg.includes('not found') &&
                    !msg.includes('DesktopLabel') && !msg.includes('DYMOLabel')) break;
            }
        }
        throw new Error('No se pudo imprimir. Último error: ' + (lastError ? lastError.message.slice(0, 200) : 'desconocido'));
    }

    // Genera QR como data URL — usa librería embebida, sin CDN
    function generateQRDataUrl(text) {
        return new Promise(function(resolve) {
            try {
                const QRLib = window.QRCode;
                if (QRLib && QRLib.toDataURL) {
                    QRLib.toDataURL(text, { margin: 1, width: 256, color: { dark: '#000000', light: '#FFFFFF' } }, function(err, url) {
                        if (err) { console.error('QR error:', err); resolve(null); }
                        else resolve(url);
                    });
                } else {
                    console.warn('QRCode lib not available');
                    resolve(null);
                }
            } catch(e) {
                console.error('QR exception:', e);
                resolve(null);
            }
        });
    }

    let _dymoprinting = false;
    async function exportEtiquetaPDF(activos) {
        if (_dymoprinting) return;
        _dymoprinting = true;
        try {
            // Intenta DYMO directo primero; si falla, fallback a PDF
            if (activos.length === 1) {
                try {
                    await printDymoLabel(activos[0]);
                    showToast('✓ Etiqueta enviada a DYMO LabelWriter 550', 'success');
                    return;
                } catch(e) {
                    console.error('DYMO directo falló:', e.message, e);
                    showToast('⚠️ DYMO no disponible. Generando PDF...', 'warning');
                }
            }
            // PDF fallback (también para lotes de >1)
            if (typeof jspdf === 'undefined' || !jspdf.jsPDF) { showToast('PDF no disponible', 'error'); return; }
            const W = 89, H = 41;
            const baseUrl = window.location.href.split('?')[0].split('#')[0];
            const doc = new jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: [H, W] });
            for (let idx = 0; idx < activos.length; idx++) {
                const activo = activos[idx];
                if (idx > 0) doc.addPage([H, W], 'landscape');
                doc.setFillColor(255, 255, 255);
                doc.rect(0, 0, W, H, 'F');
                const qrUrl = baseUrl + '?equipo=' + activo.idEtiqueta;
                try {
                    // Generar QR en canvas — librería embebida, sin CDN
                    const qrDataUrl = await generateQRDataUrl(qrUrl);
                    if (qrDataUrl) {
                        doc.addImage(qrDataUrl, 'PNG', 1, 1, 38, 38);
                    } else {
                        doc.setFillColor(245,245,245); doc.rect(1, 1, 38, 38, 'F');
                        doc.setDrawColor(180,180,180); doc.rect(1, 1, 38, 38, 'S');
                        doc.setFontSize(4.5); doc.setTextColor(100,100,100);
                        doc.text('ESCANEAR EN APP', 20, 16, { align:'center' });
                        doc.setFontSize(5.5); doc.setTextColor(50,50,50);
                        doc.text(activo.idEtiqueta, 20, 24, { align:'center' });
                    }
                } catch(e) { console.error('QR error:', e); }
                doc.setDrawColor(220, 220, 220);
                doc.line(41, 3, 41, H - 3);
                const xT = 44;
                doc.setFontSize(6); doc.setFont(undefined, 'bold'); doc.setTextColor(120, 120, 120);
                doc.text('SANLUCAR FRUIT  ·  IT DEPT', xT, 7);
                doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(0, 0, 0);
                doc.text(safePdfText(activo.idEtiqueta), xT, 15);
                doc.setFontSize(7.5); doc.setFont(undefined, 'bold'); doc.setTextColor(30, 30, 30);
                doc.text(safePdfText(activo.tipo), xT, 22);
                if (activo.modelo) { doc.setFontSize(6.5); doc.setFont(undefined, 'normal'); doc.setTextColor(70, 70, 70); doc.text(safePdfText(activo.modelo), xT, 27.5); }
                if (activo.numSerie) { doc.setFontSize(5.5); doc.setFont(undefined, 'normal'); doc.setTextColor(110, 110, 110); doc.text('N/S: ' + safePdfText(activo.numSerie), xT, 33); }
                if (activo.sociedad) { doc.setFontSize(5); doc.setTextColor(160, 160, 160); doc.text(safePdfText(activo.sociedad), xT, 38.5); }
            }
            doc.autoPrint();
            const pdfBlob = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            window.open(pdfUrl, '_blank');
            showToast(activos.length + ' etiqueta(s) lista(s) — Ctrl+P para imprimir', 'success');
        } catch(e) { console.error(e); showToast('Error generando etiquetas', 'error'); }
        finally { _dymoprinting = false; }
    }
    function exportAssignmentToPDF(assignment) {
        if (typeof jspdf === 'undefined' || !jspdf.jsPDF) { showToast('PDF no disponible', 'error'); return; }
        try {
            const doc = new jspdf.jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 20;
            let y = 20;
            // Header
            doc.setFontSize(18); doc.setFont(undefined, 'bold');
            doc.text('SANLUCAR FRUIT', pageWidth / 2, y, { align: 'center' }); y += 8;
            doc.setFontSize(12);
            doc.text(assignment.esPrestamo ? 'ACTA DE PRESTAMO DE MATERIAL IT' : 'ACTA DE ASIGNACION DE MATERIAL IT', pageWidth / 2, y, { align: 'center' }); y += 15;
            doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text('DATOS DEL EMPLEADO', margin, y); y += 8;
            doc.setFont(undefined, 'normal'); doc.setFontSize(10);
            doc.text('Nombre: ' + safePdfText(assignment.nombreEmpleado), margin, y); y += 6;
            doc.text('Email: ' + safePdfText(assignment.emailEmpleado), margin, y); y += 6;
            doc.text('Departamento: ' + safePdfText(assignment.departamento), margin, y); y += 6;
            doc.text('Puesto: ' + safePdfText(assignment.puesto), margin, y); y += 6;
            if (assignment.fechaIncorporacion) { doc.text('Fecha Alta: ' + new Date(assignment.fechaIncorporacion).toLocaleDateString('es-ES'), margin, y); y += 6; }
            y += 6;
            doc.setFont(undefined, 'bold'); doc.setFontSize(11); doc.text('MATERIAL ' + (assignment.esPrestamo ? 'EN PRESTAMO' : 'ASIGNADO'), margin, y); y += 8;
            doc.setFont(undefined, 'normal'); doc.setFontSize(10);
            var prods = assignment.productosAsignados || [];
            try { if (typeof prods === 'string') prods = JSON.parse(prods); } catch(e) {}
            prods.forEach((prod, idx) => {
                const line = (idx + 1) + '. ' + safePdfText(prod.nombre) + (prod.idEtiqueta ? ' [' + prod.idEtiqueta + ']' : prod.barcode ? ' (Cod: ' + prod.barcode + ')' : '');
                doc.text(line, margin, y); y += 6;
                if (y > 270) { doc.addPage(); y = 20; }
            });
            y += 10;
            doc.setFont(undefined, 'bold'); doc.setFontSize(11); doc.text('CONDICIONES DE USO', margin, y); y += 8;
            doc.setFont(undefined, 'normal'); doc.setFontSize(9);
            const conditions = ['El empleado declara haber recibido el material en perfecto estado.', 'Se compromete a hacer un uso adecuado del mismo.', 'Mantendra el material en buen estado de conservacion.', 'Lo devolvera cuando finalice su relacion laboral o cuando se solicite.'];
            conditions.forEach(cond => { doc.text('- ' + cond, margin, y); y += 5; });
            if (assignment.observaciones) { y += 5; doc.setFont(undefined, 'bold'); doc.text('OBSERVACIONES:', margin, y); y += 6; doc.setFont(undefined, 'normal'); doc.text(safePdfText(assignment.observaciones), margin, y); y += 10; }
            // Firma si existe
            if (assignment.firmaEmpleado) {
                y += 10;
                doc.setFont(undefined, 'bold'); doc.setFontSize(10); doc.text('FIRMA DEL EMPLEADO:', margin, y); y += 6;
                try { doc.addImage(assignment.firmaEmpleado, 'PNG', margin, y, 70, 25); y += 30; } catch(e) {}
            }
            y += 10;
            if (y > 240) { doc.addPage(); y = 20; }
            doc.setFontSize(10); doc.setFont(undefined, 'normal');
            doc.text('Empleado: ' + safePdfText(assignment.nombreEmpleado), margin, y);
            doc.text('Tecnico IT: ' + safePdfText(assignment.tecnicoResponsable || ''), pageWidth / 2 + 10, y);
            y += 20;
            // QR con enlace a la app
            const qrUrl = window.location.href.split('?')[0] + '?asignacion=' + (assignment.id || '');
            generateQRDataUrl(qrUrl).then(function(qrDataUrl) {
                if (qrDataUrl) {
                    doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 28, y - 38, 28, 28);
                    doc.setFontSize(7); doc.setTextColor(150,150,150);
                    doc.text('Escanear para ver', pageWidth - margin - 28, y - 8, { maxWidth: 28 });
                    doc.setTextColor(0,0,0);
                }
                doc.setFontSize(8);
                doc.text('Fecha: ' + new Date(assignment.fechaAsignacion).toLocaleString('es-ES') + ' | Sanlucar Fruit IT', pageWidth / 2, y, { align: 'center' });
                doc.save('Asignacion_' + safePdfText(assignment.nombreEmpleado).replace(/\s+/g, '_') + '_' + new Date().toISOString().split('T')[0] + '.pdf');
                showToast('PDF generado correctamente', 'success');
            }).catch(function() {
                doc.setFontSize(8);
                doc.text('Fecha: ' + new Date(assignment.fechaAsignacion).toLocaleString('es-ES') + ' | Sanlucar Fruit IT', pageWidth / 2, y, { align: 'center' });
                doc.save('Asignacion_' + safePdfText(assignment.nombreEmpleado).replace(/\s+/g, '_') + '_' + new Date().toISOString().split('T')[0] + '.pdf');
                showToast('PDF generado correctamente', 'success');
            });
        } catch(e) { console.error('Error generando PDF:', e); showToast('Error generando PDF: ' + (e.message || 'desconocido'), 'error'); }
    }

export { exportToCSV, exportAuditoria, safePdfText, generateBarcode, printTechnicianCard, buildDymoLabelXml, generateQRDataUrl, exportAssignmentToPDF };