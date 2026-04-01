import React, { useEffect, useRef, useState } from 'react';
import { T } from '../../lib/i18n';
import { showToast } from '../../components/feedback/toast';
import { startBarcodeScanner } from '../../services/scanner/scannerService';

const e = React.createElement;

        function MobileView({ state, onRefresh, onOpenModal }) {
            const [screen, setScreen] = useState('home'); // 'home'|'scan'|'equipo'|'asignaciones'|'inventario'
            const [scannedEquipo, setScannedEquipo] = useState(null);
            const [scanResult, setScanResult] = useState(null); // 'ok'|'notfound'
            const [mobileSearch, setMobileSearch] = useState('');
            const [scanning, setScanning] = useState(false);
            const [sigFullscreen, setSigFullscreen] = useState(false);
            const [sigData, setSigData] = useState(null);
            const sigCanvasRef = React.useRef(null);
            const sigDrawing = React.useRef(false);
            const sigLast = React.useRef(null);

            // Firma fullscreen — lanza modo apaisado
            const openSignature = function() {
                setSigData(null);
                setSigFullscreen(true);
                try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(function() {}); } catch(e) {}
                // Limpiar canvas al abrir
                setTimeout(function() {
                    const c = sigCanvasRef.current;
                    if (c) { c.width = c.offsetWidth; c.height = c.offsetHeight; c.getContext('2d').clearRect(0,0,c.width,c.height); }
                }, 100);
            };
            const closeSignature = function(save) {
                if (save && sigCanvasRef.current) setSigData(sigCanvasRef.current.toDataURL());
                setSigFullscreen(false);
                try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); } catch(e) {}
            };
            const sigPos = function(ev, canvas) {
                const rect = canvas.getBoundingClientRect();
                const t = ev.touches ? ev.touches[0] : ev;
                return { x: (t.clientX - rect.left) * (canvas.width / rect.width), y: (t.clientY - rect.top) * (canvas.height / rect.height) };
            };

            const hoy = new Date().toLocaleDateString('es-ES');

            // ── Overlay firma fullscreen ──────────────────────────────────────
            const renderSigFullscreen = function() {
                return e('div', { style: { position: 'fixed', inset: 0, background: '#fff', zIndex: 99999, display: 'flex', flexDirection: 'column' } },
                    // Header
                    e('div', { style: { background: '#1a1f2e', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 } },
                        e('div', { style: { color: 'white', fontWeight: '700', fontSize: '14px' } }, '✍️ Firma del empleado'),
                        e('div', { style: { display: 'flex', gap: '8px' } },
                            e('button', { onClick: function() {
                                const c = sigCanvasRef.current;
                                if (c) c.getContext('2d').clearRect(0,0,c.width,c.height);
                            }, style: { padding: '8px 14px', background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '13px' } }, '🗑️ Limpiar'),
                            e('button', { onClick: function() { closeSignature(false); }, style: { padding: '8px 14px', background: 'rgba(239,68,68,.3)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '13px' } }, 'Cancelar'),
                            e('button', { onClick: function() { closeSignature(true); showToast('✅ Firma guardada', 'success'); }, style: { padding: '8px 14px', background: '#3fb950', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '700' } }, '✅ Confirmar')
                        )
                    ),
                    // Línea guía
                    e('div', { style: { background: '#f0f0f0', padding: '6px 16px', fontSize: '12px', color: '#666', flexShrink: 0, textAlign: 'center' } }, 'Firma en el espacio de abajo con el dedo'),
                    // Canvas
                    e('canvas', {
                        ref: sigCanvasRef,
                        style: { flex: 1, width: '100%', cursor: 'crosshair', touchAction: 'none', background: 'white' },
                        onMouseDown: function(ev) { sigDrawing.current = true; sigLast.current = sigPos(ev.nativeEvent || ev, ev.target); },
                        onMouseMove: function(ev) {
                            if (!sigDrawing.current || !sigLast.current) return;
                            const c = ev.target; const ctx = c.getContext('2d');
                            const p = sigPos(ev.nativeEvent || ev, c);
                            ctx.beginPath(); ctx.moveTo(sigLast.current.x, sigLast.current.y); ctx.lineTo(p.x, p.y);
                            ctx.strokeStyle = '#1a1f2e'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
                            sigLast.current = p;
                        },
                        onMouseUp: function() { sigDrawing.current = false; sigLast.current = null; },
                        onTouchStart: function(ev) { ev.preventDefault(); sigDrawing.current = true; sigLast.current = sigPos(ev.nativeEvent || ev, ev.target); },
                        onTouchMove: function(ev) {
                            ev.preventDefault();
                            if (!sigDrawing.current || !sigLast.current) return;
                            const c = ev.target; const ctx = c.getContext('2d');
                            const p = sigPos(ev.nativeEvent || ev, c);
                            ctx.beginPath(); ctx.moveTo(sigLast.current.x, sigLast.current.y); ctx.lineTo(p.x, p.y);
                            ctx.strokeStyle = '#1a1f2e'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
                            sigLast.current = p;
                        },
                        onTouchEnd: function(ev) { ev.preventDefault(); sigDrawing.current = false; sigLast.current = null; }
                    })
                );
            };
            const movHoy = (state.history || []).filter(h => new Date(h.fecha).toDateString() === new Date().toDateString()).length;
            const misAsig = (state.assignments || []).filter(a => a.estado === 'Activo').length;
            const pendientes = (state.activos || []).filter(a => a.estado === 'Pendiente').length;
            const alertas = (state.inventory || []).filter(i => i.stock === 0 || i.stock <= i.stockMinimo).length;

            // Lanzar escáner QR
            const launchScanner = function() {
                setScanning(true);
                startBarcodeScanner(function(code) {
                    setScanning(false);
                    var id = code.trim().toUpperCase();
                    var urlMatch = id.match(/[?&]EQUIPO=([^&]+)/i);
                    if (urlMatch) id = urlMatch[1];
                    var activo = (state.activos || []).find(function(a) { return a.idEtiqueta === id; });
                    if (activo) {
                        setScannedEquipo(activo);
                        setScanResult('ok');
                        setScreen('equipo');
                    } else {
                        setScanResult('notfound');
                        setScannedEquipo(null);
                        setScreen('scan');
                        showToast('Equipo no encontrado: ' + id, 'warning');
                    }
                });
            };

            // Buscar equipo manualmente
            const searchEquipo = function(q) {
                var ql = q.trim().toUpperCase();
                if (!ql) return;
                var activo = (state.activos || []).find(function(a) {
                    return a.idEtiqueta === ql || (a.numSerie||'').toUpperCase() === ql || (a.idEtiqueta||'').includes(ql);
                });
                if (activo) { setScannedEquipo(activo); setScreen('equipo'); }
                else showToast('No encontrado: ' + q, 'warning');
            };

            const btn = function(label, icon, color, onClick, sub) {
                return e('button', { onClick, style: {
                    background: 'var(--bg-secondary)', border: '2px solid ' + color + '44',
                    borderRadius: '20px', padding: '20px 16px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '10px', cursor: 'pointer', transition: 'all .2s',
                    WebkitTapHighlightColor: 'transparent', minHeight: '120px', justifyContent: 'center'
                },
                    onTouchStart: ev => { ev.currentTarget.style.transform = 'scale(0.96)'; ev.currentTarget.style.background = color + '18'; },
                    onTouchEnd: ev => { ev.currentTarget.style.transform = ''; ev.currentTarget.style.background = 'var(--bg-secondary)'; }
                },
                    e('div', { style: { fontSize: '36px', lineHeight: 1 } }, icon),
                    e('div', { style: { fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', textAlign: 'center' } }, label),
                    sub && e('div', { style: { fontSize: '12px', color: 'var(--text-secondary)' } }, sub)
                );
            };

            // Firma fullscreen — siempre tiene prioridad sobre cualquier pantalla
            if (sigFullscreen) return renderSigFullscreen();

            // ── Pantalla principal ────────────────────────────────────────────
            if (screen === 'home') return e('div', { style: { display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' } },
                // Header
                e('div', { style: { background: 'var(--bg-secondary)', padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                    e('div', null,
                        e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' } },
                            e('img', { src: 'https://sanlucar.com/wp-content/uploads/2023/03/SanLucar_LOGO_final.svg', alt: 'Sanlúcar', style: { height: '22px', width: 'auto', filter: 'brightness(0) invert(1)', objectFit: 'contain' }, onError: function(ev) { ev.target.style.display='none'; } }),
                            e('span', { style: { fontSize: '14px', fontWeight: '800', color: 'var(--text-secondary)' } }, 'IT')
                        ),
                        e('div', { style: { fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' } }, state.user?.name + ' · ' + hoy)
                    ),
                    e('button', { onClick: onRefresh, style: { background: 'none', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 14px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px' } }, '🔄')
                ),
                // KPIs
                e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--border)' } },
                    [
                        { icon: '⚡', label: 'Hoy', value: movHoy, color: '#58a6ff' },
                        { icon: '📋', label: 'Activas', value: misAsig, color: '#3fb950' },
                        { icon: '🔖', label: 'Pendientes', value: pendientes, color: '#f97316' },
                        { icon: '⚠️', label: 'Alertas', value: alertas, color: alertas > 0 ? '#ef4444' : '#6b7280' },
                    ].map(function(k, i) {
                        return e('div', { key: i, style: { background: 'var(--bg-secondary)', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' } },
                            e('div', { style: { fontSize: '24px' } }, k.icon),
                            e('div', null,
                                e('div', { style: { fontSize: '24px', fontWeight: '800', fontFamily: 'IBM Plex Mono,monospace', color: k.color, lineHeight: 1 } }, k.value),
                                e('div', { style: { fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' } }, k.label)
                            )
                        );
                    })
                ),
                // Acciones principales — botones grandes táctiles
                e('div', { style: { padding: '20px', flex: 1 } },
                    e('div', { style: { fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' } }, 'Acciones rápidas'),
                    e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' } },
                        btn('Escanear QR', '📷', '#58a6ff', launchScanner, 'Abrir cámara'),
                        btn('Asignaciones', '📋', '#3fb950', () => setScreen('asignaciones'), misAsig + ' activas'),
                        btn('Inventario', '📦', '#a855f7', () => setScreen('inventario'), state.inventory.length + ' productos'),
                        btn('Recepción', '📥', '#fbbf24', () => onOpenModal('entrada', null), 'Nuevo material')
                    ),
                    // Búsqueda rápida por ID
                    e('div', { style: { marginTop: '8px' } },
                        e('div', { style: { fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' } }, 'Buscar equipo por ID'),
                        e('div', { style: { display: 'flex', gap: '8px' } },
                            e('input', { type: 'text', value: mobileSearch, onChange: ev => setMobileSearch(ev.target.value.toUpperCase()),
                                onKeyDown: ev => { if (ev.key === 'Enter') searchEquipo(mobileSearch); },
                                placeholder: 'SLF-26-XXXXXXXX',
                                style: { flex: 1, padding: '14px 16px', background: 'var(--bg-secondary)', border: '2px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'IBM Plex Mono,monospace', outline: 'none' }
                            }),
                            e('button', { onClick: () => searchEquipo(mobileSearch), style: { padding: '14px 20px', background: '#58a6ff', border: 'none', borderRadius: '12px', color: 'white', fontSize: '18px', cursor: 'pointer' } }, '→')
                        )
                    ),
                    // Últimos movimientos
                    e('div', { style: { marginTop: '24px' } },
                        e('div', { style: { fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' } }, 'Últimos movimientos'),
                        (state.history || []).slice().sort((a,b) => new Date(b.fecha)-new Date(a.fecha)).slice(0,5).map(function(h, i) {
                            var col = { 'Entrada':'#3fb950','Salida':'#ef4444','Asignacion':'#58a6ff','Devolucion':'#a855f7','Prestamo':'#fbbf24' }[h.tipo]||'#6b7280';
                            return e('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' } },
                                e('div', { style: { width: '32px', height: '32px', borderRadius: '8px', background: col+'1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: col, fontWeight: '700', fontSize: '14px', flexShrink: 0 } },
                                    { 'Entrada':'↑','Salida':'↓','Asignacion':'→','Devolucion':'←','Prestamo':'⏱' }[h.tipo]||'•'
                                ),
                                e('div', { style: { flex: 1, minWidth: 0 } },
                                    e('div', { style: { fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, h.producto),
                                    e('div', { style: { fontSize: '11px', color: 'var(--text-secondary)' } }, h.tecnico || '—')
                                ),
                                e('div', { style: { fontSize: '11px', color: 'var(--text-secondary)', flexShrink: 0 } }, new Date(h.fecha).toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit' }))
                            );
                        })
                    )
                )
            );

            // ── Ficha de equipo escaneado ─────────────────────────────────────
            if (screen === 'equipo' && scannedEquipo) {
                const a = scannedEquipo;
                const estadoColor = { 'Almacen':'#3fb950','Asignado':'#58a6ff','Pendiente':'#f97316','Transito':'#fbbf24','Reparacion':'#a855f7','Extraviado':'#ef4444','Robado':'#dc2626','Baja':'#6b7280' }[a.estado]||'#6b7280';
                return e('div', { style: { display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' } },
                    // Nav
                    e('div', { style: { background: 'var(--bg-secondary)', padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' } },
                        e('button', { onClick: () => { setScreen('home'); setScannedEquipo(null); }, style: { background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '20px', cursor: 'pointer', padding: '4px' } }, '←'),
                        e('div', { style: { fontWeight: '700', fontSize: '16px' } }, 'Ficha de Equipo')
                    ),
                    e('div', { style: { padding: '20px', flex: 1 } },
                        // Header equipo
                        e('div', { style: { background: 'var(--bg-secondary)', borderRadius: '20px', padding: '24px', marginBottom: '16px', border: '2px solid ' + estadoColor + '33', textAlign: 'center' } },
                            e('div', { style: { fontSize: '48px', marginBottom: '12px' } }, '💻'),
                            e('div', { style: { fontSize: '20px', fontWeight: '800', marginBottom: '4px' } }, a.tipo),
                            a.modelo && e('div', { style: { fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '12px' } }, a.modelo),
                            e('div', { style: { fontFamily: 'IBM Plex Mono,monospace', fontSize: '14px', fontWeight: '700', color: '#58a6ff', background: 'rgba(88,166,255,.1)', padding: '8px 16px', borderRadius: '10px', display: 'inline-block', marginBottom: '12px' } }, a.idEtiqueta),
                            e('div', null, e('span', { style: { padding: '6px 14px', borderRadius: '20px', background: estadoColor+'22', color: estadoColor, fontWeight: '700', fontSize: '13px', border: '1px solid '+estadoColor+'44' } }, a.estado))
                        ),
                        // Detalles
                        e('div', { style: { background: 'var(--bg-secondary)', borderRadius: '16px', padding: '16px', marginBottom: '16px' } },
                            [
                                ['N/S', a.numSerie || '—'],
                                ['Ubicación', a.ubicacion || '—'],
                                ['Sociedad', a.sociedad || '—'],
                                ['Asignado a', a.asignadoA || '—'],
                                ['Proveedor', a.proveedor || '—'],
                            ].map(function(row, i) {
                                return e('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' } },
                                    e('span', { style: { fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' } }, row[0]),
                                    e('span', { style: { fontSize: '13px', fontWeight: '600', textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' } }, row[1])
                                );
                            })
                        ),
                        // Acciones según estado
                        e('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
                            e('button', { onClick: () => exportEtiquetaPDF([a]), style: { padding: '16px', background: 'var(--bg-secondary)', border: '2px solid var(--border)', borderRadius: '14px', color: 'var(--text-primary)', fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' } }, T().printLabel),
                            a.estado === 'Almacen' && e('button', { onClick: () => onOpenModal('nueva-asignacion', null), style: { padding: '16px', background: '#3fb950', border: 'none', borderRadius: '14px', color: 'white', fontSize: '15px', fontWeight: '700', cursor: 'pointer' } }, '✅ Asignar equipo'),
                            a.estado === 'Asignado' && e('button', { onClick: () => onOpenModal('devolver-material', null), style: { padding: '16px', background: '#f97316', border: 'none', borderRadius: '14px', color: 'white', fontSize: '15px', fontWeight: '700', cursor: 'pointer' } }, '↩️ Registrar devolución'),
                            // Firma fullscreen
                            e('button', { onClick: openSignature, style: { padding: '16px', background: sigData ? 'rgba(63,185,80,.15)' : 'rgba(88,166,255,.1)', border: '2px solid ' + (sigData ? '#3fb95044' : '#58a6ff44'), borderRadius: '14px', color: sigData ? '#3fb950' : '#58a6ff', fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' } },
                                sigData ? '✅ Firma capturada — repetir' : '✍️ Firmar aquí'
                            ),
                            sigData && e('img', { src: sigData, style: { width: '100%', height: '80px', objectFit: 'contain', background: 'white', borderRadius: '10px', border: '1px solid var(--border)' }, alt: 'Firma' })
                        ),
                        // Nuevo escaneo
                        e('button', { onClick: launchScanner, style: { marginTop: '12px', padding: '16px', background: 'rgba(88,166,255,.1)', border: '2px solid #58a6ff44', borderRadius: '14px', color: '#58a6ff', fontSize: '15px', fontWeight: '700', cursor: 'pointer', width: '100%' } }, '📷 Escanear otro equipo')
                    )
                );
            }

            // ── Lista asignaciones ────────────────────────────────────────────
            if (screen === 'asignaciones') {
                const activas = (state.assignments || []).filter(a => a.estado === 'Activo').sort((a,b) => new Date(b.fechaAsignacion)-new Date(a.fechaAsignacion));
                const avatarColors = ['#58a6ff','#3fb950','#a855f7','#fbbf24','#f97316','#ef4444'];
                const aColor = n => { var h=0; for(var i=0;i<n.length;i++) h=n.charCodeAt(i)+((h<<5)-h); return avatarColors[Math.abs(h)%avatarColors.length]; };
                const inits = n => n.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();
                return e('div', { style: { display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' } },
                    e('div', { style: { background: 'var(--bg-secondary)', padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 10 } },
                        e('button', { onClick: () => setScreen('home'), style: { background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '20px', cursor: 'pointer' } }, '←'),
                        e('div', { style: { fontWeight: '700', fontSize: '16px', flex: 1 } }, '📋 Asignaciones activas'),
                        e('span', { style: { fontSize: '13px', fontWeight: '700', color: '#3fb950' } }, activas.length)
                    ),
                    e('div', { style: { padding: '12px', flex: 1, overflowY: 'auto' } },
                        activas.length === 0 ? e('div', { style: { textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' } }, 'Sin asignaciones activas') :
                        activas.map(function(a, i) {
                            var col = aColor(a.nombreEmpleado);
                            var hoy = new Date(); hoy.setHours(0,0,0,0);
                            var vencido = a.esPrestamo && new Date(a.fechaAsignacion) < hoy;
                            return e('div', { key: i, style: { background: 'var(--bg-secondary)', borderRadius: '16px', padding: '16px', marginBottom: '10px', border: '2px solid '+(vencido?'#ef444444':col+'33'), borderLeft: '4px solid '+(vencido?'#ef4444':col) } },
                                e('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' } },
                                    e('div', { style: { width: '44px', height: '44px', borderRadius: '12px', background: col+'22', border: '2px solid '+col+'44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '800', color: col, flexShrink: 0 } }, inits(a.nombreEmpleado)),
                                    e('div', { style: { flex: 1, minWidth: 0 } },
                                        e('div', { style: { fontWeight: '700', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, a.nombreEmpleado),
                                        e('div', { style: { fontSize: '12px', color: 'var(--text-secondary)' } }, a.departamento || a.emailEmpleado)
                                    ),
                                    e('div', { style: { textAlign: 'right', flexShrink: 0 } },
                                        vencido && e('div', { style: { fontSize: '11px', fontWeight: '700', color: '#ef4444', background: 'rgba(239,68,68,.15)', padding: '2px 8px', borderRadius: '10px', marginBottom: '2px' } }, '⚠️ VENCIDO'),
                                        e('div', { style: { fontSize: '13px', fontWeight: '800', color: col, fontFamily: 'IBM Plex Mono,monospace' } }, a.cantidadProductos + ' art.')
                                    )
                                ),
                                e('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                                    e('span', { style: { fontSize: '11px', background: a.esPrestamo?'rgba(251,191,36,.15)':'rgba(88,166,255,.12)', color: a.esPrestamo?'#fbbf24':'#58a6ff', borderRadius: '10px', padding: '3px 8px', fontWeight: '700' } }, a.esPrestamo ? '⏱ Préstamo' : '📋 Asignación'),
                                    e('span', { style: { fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg-primary)', borderRadius: '10px', padding: '3px 8px' } }, new Date(a.fechaAsignacion).toLocaleDateString('es-ES'))
                                )
                            );
                        })
                    )
                );
            }

            // ── Inventario rápido ─────────────────────────────────────────────
            if (screen === 'inventario') {
                const stockItems = (state.inventory || []).filter(i => i.stock === 0 || i.stock <= i.stockMinimo).sort((a,b) => a.stock - b.stock);
                return e('div', { style: { display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' } },
                    e('div', { style: { background: 'var(--bg-secondary)', padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 10 } },
                        e('button', { onClick: () => setScreen('home'), style: { background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '20px', cursor: 'pointer' } }, '←'),
                        e('div', { style: { fontWeight: '700', fontSize: '16px', flex: 1 } }, '📦 Stock crítico'),
                        e('span', { style: { fontSize: '13px', fontWeight: '700', color: '#ef4444' } }, stockItems.length)
                    ),
                    e('div', { style: { padding: '12px', flex: 1 } },
                        stockItems.length === 0 ?
                            e('div', { style: { textAlign: 'center', padding: '60px 20px' } },
                                e('div', { style: { fontSize: '48px', marginBottom: '12px' } }, '✅'),
                                e('div', { style: { color: '#3fb950', fontWeight: '700', fontSize: '16px' } }, 'Todo el stock OK')
                            ) :
                            stockItems.map(function(item, i) {
                                var sinStock = item.stock === 0;
                                var col = sinStock ? '#ef4444' : '#f97316';
                                return e('div', { key: i, style: { background: 'var(--bg-secondary)', borderRadius: '14px', padding: '16px', marginBottom: '10px', border: '2px solid '+col+'33', borderLeft: '4px solid '+col } },
                                    e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
                                        e('div', { style: { flex: 1, minWidth: 0 } },
                                            e('div', { style: { fontWeight: '700', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, item.nombre),
                                            e('div', { style: { fontSize: '12px', color: 'var(--text-secondary)' } }, item.categoria + ' · ' + (item.ubicacion || 'Sin ubicación'))
                                        ),
                                        e('div', { style: { fontFamily: 'IBM Plex Mono,monospace', fontWeight: '800', fontSize: '18px', color: col, marginLeft: '12px' } }, item.stock)
                                    ),
                                    e('div', { style: { height: '6px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' } },
                                        e('div', { style: { height: '100%', width: Math.min(100, item.stockMinimo > 0 ? item.stock/item.stockMinimo*100 : 0) + '%', background: col, borderRadius: '3px' } })
                                    ),
                                    e('div', { style: { display: 'flex', gap: '8px' } },
                                        e('button', { onClick: () => onOpenModal('entrada', item), style: { flex: 1, padding: '10px', background: '#3fb950', border: 'none', borderRadius: '10px', color: 'white', fontWeight: '700', fontSize: '13px', cursor: 'pointer' } }, '📥 Entrada'),
                                        e('button', { onClick: () => onOpenModal('salida', item), disabled: item.stock === 0, style: { flex: 1, padding: '10px', background: item.stock===0?'var(--bg-tertiary)':'#58a6ff', border: 'none', borderRadius: '10px', color: 'white', fontWeight: '700', fontSize: '13px', cursor: item.stock===0?'not-allowed':'pointer', opacity: item.stock===0?0.5:1 } }, '📤 Salida')
                                    )
                                );
                            })
                    )
                );
            }

            // Fallback
            return e('div', null);
        }



export default MobileView;