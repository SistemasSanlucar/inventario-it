import React, { useEffect, useRef, useState } from 'react';
import { startBarcodeScanner, stopBarcodeScanner } from '../../services/scanner/scannerService';
import { showToast } from '../../components/feedback/toast';

const e = React.createElement;

        function ScannerRapido({ state, scanLog, setScanLog, scanCount, setScanCount, scanLastId, setScanLastId, scanFlash, setScanFlash }) {
            useEffect(function() {
                var active = true;
                function launch() {
                    if (!active) return;
                    startBarcodeScanner(function(code) {
                        if (!active) return;
                        var id = code.trim().toUpperCase();
                        var urlMatch = id.match(/[?&]EQUIPO=([^&]+)/i);
                        if (urlMatch) id = urlMatch[1];
                        var activo = (state.activos || []).find(function(a) { return a.idEtiqueta === id; });
                        var ts = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        if (activo) {
                            setScanLog(function(prev) { return [{ id, tipo: activo.tipo, modelo: activo.modelo, estado: activo.estado, ts, ok: true }].concat(prev).slice(0, 50); });
                            setScanCount(function(n) { return n + 1; });
                            setScanLastId(id);
                            setScanFlash(true);
                            setTimeout(function() { setScanFlash(false); }, 600);
                        } else {
                            setScanLog(function(prev) { return [{ id, tipo: '—', modelo: 'No encontrado en inventario', estado: '', ts, ok: false }].concat(prev).slice(0, 50); });
                        }
                        setTimeout(function() { if (active) launch(); }, 800);
                    });
                }
                launch();
                return function() { active = false; stopBarcodeScanner(); };
            }, []);

            return e('div', null,
                e('div', { style: { background: scanFlash ? 'rgba(63,185,80,.15)' : 'var(--bg-secondary)', border: '2px solid ' + (scanFlash ? 'var(--accent-green)' : 'var(--accent-purple)'), borderRadius: '16px', padding: '28px 32px', marginBottom: '20px', transition: 'all .3s ease', textAlign: 'center' } },
                    e('div', { style: { fontSize: '13px', fontWeight: '700', color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' } }, '⚡ Modo Escáner Rápido — Activo'),
                    e('div', { style: { display: 'flex', justifyContent: 'center', gap: '48px', flexWrap: 'wrap' } },
                        e('div', { style: { textAlign: 'center' } },
                            e('div', { style: { fontSize: '56px', fontWeight: '800', fontFamily: 'IBM Plex Mono,monospace', color: 'var(--accent-green)', lineHeight: 1 } }, scanCount),
                            e('div', { style: { fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', marginTop: '6px' } }, 'Escaneados')
                        ),
                        scanLastId && e('div', { style: { textAlign: 'center' } },
                            e('div', { style: { fontSize: '22px', fontWeight: '800', fontFamily: 'IBM Plex Mono,monospace', color: 'var(--accent-blue)', lineHeight: 1 } }, scanLastId),
                            e('div', { style: { fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', marginTop: '6px' } }, 'Último escaneado')
                        )
                    ),
                    e('div', { style: { marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)' } }, '📷 Apunta la cámara al QR o código de barras — se registra automáticamente')
                ),
                scanLog.length > 0 && e('div', { style: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' } },
                    e('div', { style: { padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                        e('span', { style: { fontWeight: '700', fontSize: '14px' } }, '📋 Registro de sesión'),
                        e('button', { onClick: function() { setScanLog([]); setScanCount(0); setScanLastId(''); }, style: { background: 'none', border: 'none', color: 'var(--accent-red)', fontSize: '12px', fontWeight: '700', cursor: 'pointer' } }, 'Limpiar')
                    ),
                    e('div', { style: { maxHeight: '420px', overflowY: 'auto' } },
                        scanLog.map(function(entry, i) {
                            return e('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 20px', borderBottom: '1px solid var(--border)', background: i === 0 ? (entry.ok ? 'rgba(63,185,80,.05)' : 'rgba(239,68,68,.05)') : 'transparent' } },
                                e('div', { style: { width: '26px', height: '26px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', background: entry.ok ? 'rgba(63,185,80,.15)' : 'rgba(239,68,68,.15)', flexShrink: 0 } }, entry.ok ? '✅' : '❌'),
                                e('div', { style: { fontFamily: 'IBM Plex Mono,monospace', fontSize: '12px', fontWeight: '700', color: entry.ok ? 'var(--accent-green)' : 'var(--accent-red)', minWidth: '160px' } }, entry.id),
                                e('div', { style: { flex: 1 } },
                                    e('div', { style: { fontSize: '13px', fontWeight: '600' } }, entry.tipo + (entry.modelo ? ' · ' + entry.modelo : '')),
                                    entry.estado && e('div', { style: { fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' } }, 'Estado: ' + entry.estado)
                                ),
                                e('div', { style: { fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono,monospace', flexShrink: 0 } }, entry.ts)
                            );
                        })
                    )
                ),
                scanLog.length > 0 && e('div', { style: { marginTop: '12px', display: 'flex', gap: '12px', justifyContent: 'flex-end' } },
                    e('button', { className: 'button button-secondary', onClick: function() {
                        exportToCSV(scanLog.map(function(en) { return { 'ID': en.id, 'Tipo': en.tipo, 'Modelo': en.modelo, 'Estado': en.estado, 'Hora': en.ts, 'Resultado': en.ok ? 'OK' : 'No encontrado' }; }), 'scan_session');
                    } }, '⬇️ Exportar log CSV')
                )
            );
        }


export default ScannerRapido;