import React, { useEffect, useRef, useState } from 'react';
import { T } from '../../lib/i18n';
import { showToast } from '../../components/feedback/toast';
import { stopBarcodeScanner } from '../../services/scanner/scannerService';
import { getDataManager } from '../../services/runtime';
import ScannerRapido from './ScannerRapido';
import MapaUbicaciones from './MapaUbicaciones';

const e = React.createElement;

        function EquiposView({ state, onRefresh, initialFilter, deepLinkEquipo, onClearDeepLink }) {
            const dataManager = getDataManager();
            const [view, setView] = useState('lista'); // 'lista' | 'pendientes' | 'recepcion' | 'scanner'
            const [search, setSearch] = useState('');
            const [filterTipo, setFilterTipo] = useState('all');
            const [filterEstado, setFilterEstado] = useState('all');
            const [fichaEquipo, setFichaEquipo] = useState(null); // equipo seleccionado para ver ficha
            // Recepción en lote
            const [sublotes, setSublotes] = useState([{ id: 1, tipo: '', modelo: '', ubicacion: '', cantidad: 1, sociedad: '' }]);
            const [creatingProgress, setCreatingProgress] = useState(null);
            // Inline N/S editing
            const [inlineNS, setInlineNS] = useState({});
            const [savingNS, setSavingNS] = useState({});
            // Escáner continuo
            const [scanLog, setScanLog] = useState([]);
            const [scanCount, setScanCount] = useState(0);
            const [scanLastId, setScanLastId] = useState('');
            const [scanFlash, setScanFlash] = React.useState(false);
            // Cambiar estado
            const [cambioEstado, setCambioEstado] = useState(null); // { equipo, nuevoEstado }
            const [cambioMotivo, setCambioMotivo] = useState('');
            const [cambioDestino, setCambioDestino] = useState('');
            const [savingEstado, setSavingEstado] = useState(false);
            // Confirm delete
            const [confirmDeleteId, setConfirmDeleteId] = useState(null);
            const nsInputRefs = useRef({});

            useEffect(function() {
                if (!initialFilter) return;
                if (initialFilter.estado) setFilterEstado(initialFilter.estado);
                if (initialFilter.estado === 'Pendiente') setView('pendientes');
            }, []);

            useEffect(function() {
                if (deepLinkEquipo) {
                    setFichaEquipo(deepLinkEquipo);
                    if (onClearDeepLink) onClearDeepLink();
                }
            }, [deepLinkEquipo]);

            const pendientes = (state.activos || []).filter(function(a) { return a.estado === 'Pendiente'; });
            const tiposConEtiqueta = Object.keys(state.catalogoTipos || {}).filter(function(t) { return (state.catalogoTipos[t] || {}).llevaEtiqueta; });
            const tiposUnicos = [...new Set((state.activos || []).map(function(a) { return a.tipo; }))].filter(Boolean);

            const filtered = (state.activos || []).filter(function(a) {
                const matchSearch = !search ||
                    a.idEtiqueta.toLowerCase().includes(search.toLowerCase()) ||
                    a.modelo.toLowerCase().includes(search.toLowerCase()) ||
                    a.tipo.toLowerCase().includes(search.toLowerCase()) ||
                    (a.numSerie || '').toLowerCase().includes(search.toLowerCase());
                const matchTipo = filterTipo === 'all' || a.tipo === filterTipo;
                const matchEstado = filterEstado === 'all' || a.estado === filterEstado;
                return matchSearch && matchTipo && matchEstado;
            });

            const estadoColor = { 'Pendiente': 'var(--accent-orange)', 'Almacen': 'var(--accent-green)', 'Asignado': 'var(--accent-blue)', 'Baja': 'var(--accent-red)' };
            const estadoBg = { 'Pendiente': 'rgba(249,115,22,.15)', 'Almacen': 'rgba(63,185,80,.15)', 'Asignado': 'rgba(88,166,255,.15)', 'Baja': 'rgba(239,68,68,.15)' };
            const estadoLabel = { 'Pendiente': '⚠️ Pendiente N/S', 'Almacen': 'En Almacén', 'Asignado': 'Asignado', 'Baja': 'Baja' };

            // ---- Sublote helpers ----
            const addSublote = function() { setSublotes(function(prev) { return prev.concat([{ id: Date.now(), tipo: '', modelo: '', ubicacion: '', cantidad: 1, sociedad: '' }]); }); };
            const removeSublote = function(id) { setSublotes(function(prev) { return prev.filter(function(s) { return s.id !== id; }); }); };
            const updateSublote = function(id, field, value) {
                setSublotes(function(prev) {
                    return prev.map(function(s) {
                        if (s.id !== id) return s;
                        var updated = Object.assign({}, s, { [field]: value });
                        if (field === 'tipo') updated.modelo = '';
                        return updated;
                    });
                });
            };
            const totalUnidades = sublotes.reduce(function(sum, s) { return sum + (parseInt(s.cantidad) || 0); }, 0);
            const sublotesValidos = sublotes.length > 0 && sublotes.every(function(s) { return s.tipo && s.modelo && s.ubicacion && s.sociedad && parseInt(s.cantidad) >= 1; });

            // ---- Cambiar estado ----
            const handleCambiarEstado = async function() {
                if (!cambioEstado) return;
                const { equipo, nuevoEstado } = cambioEstado;
                const motivosRequeridos = ['Baja', 'Extraviado', 'Robado', 'Reparacion', 'Transito'];
                if (motivosRequeridos.includes(nuevoEstado) && !cambioMotivo.trim()) { showToast('El motivo es obligatorio para este estado', 'error'); return; }
                if (nuevoEstado === 'Transito' && !cambioDestino.trim()) { showToast('El destino es obligatorio para Tránsito', 'error'); return; }
                setSavingEstado(true);
                try {
                    const extra = { motivoIncidencia: cambioMotivo };
                    if (nuevoEstado === 'Transito') { extra.transitoDestino = cambioDestino; extra.fechaTransito = new Date().toISOString(); }
                    await dataManager.cambiarEstadoActivo(equipo.id, nuevoEstado, extra);
                    await dataManager.addToHistory({ tipo: 'CambioEstado', producto: equipo.tipo + ' - ' + equipo.modelo, cantidad: 1, usuario: '', tecnico: state.user.name, idEtiqueta: equipo.idEtiqueta, motivo: nuevoEstado + (cambioMotivo ? ': ' + cambioMotivo : '') });
                    showToast('Estado actualizado: ' + nuevoEstado, 'success');
                    setCambioEstado(null); setCambioMotivo(''); setCambioDestino('');
                    await onRefresh();
                } catch(err) { showToast('Error: ' + err.message, 'error'); }
                finally { setSavingEstado(false); }
            };

            // ---- Crear lote ----
            const handleCrearLote = async function() {
                if (!sublotesValidos) { showToast('Completa todos los campos de cada sublote', 'error'); return; }
                let total = totalUnidades, current = 0;
                setCreatingProgress({ current: 0, total });
                try {
                    for (var si = 0; si < sublotes.length; si++) {
                        const sublote = sublotes[si];
                        const cant = parseInt(sublote.cantidad) || 1;
                        for (var i = 0; i < cant; i++) {
                            const idEtiqueta = await dataManager.getNextEtiquetaId(sublote.sociedad);
                            await dataManager.createActivo({ idEtiqueta, tipo: sublote.tipo, modelo: sublote.modelo, ubicacion: sublote.ubicacion, numSerie: '', notas: '', estado: 'Pendiente', sociedad: sublote.sociedad });
                            current++;
                            setCreatingProgress({ current, total });
                        }
                    }
                    showToast(total + ' equipo(s) registrados. Ahora añade los N/S para completarlos.', 'success');
                    setSublotes([{ id: Date.now(), tipo: '', modelo: '', ubicacion: '', cantidad: 1, sociedad: '' }]);
                    setView('pendientes');
                    await onRefresh();
                } catch(err) { showToast('Error: ' + err.message, 'error'); }
                finally { setCreatingProgress(null); }
            };

            // ---- Guardar N/S inline ----
            const saveNS = async function(activo) {
                const ns = (inlineNS[activo.id] !== undefined ? inlineNS[activo.id] : '').trim().toUpperCase();
                if (!ns || ns.length < 4) { showToast('El N/S debe tener al menos 4 caracteres', 'error'); return; }
                if (ns.length > 40) { showToast('El N/S no puede superar 40 caracteres', 'error'); return; }
                setSavingNS(function(prev) { return Object.assign({}, prev, { [activo.id]: true }); });
                try {
                    await dataManager.updateActivoNS(activo.id, ns);
                    setInlineNS(function(prev) { var n = Object.assign({}, prev); delete n[activo.id]; return n; });
                    await onRefresh();
                    showToast('✓ N/S guardado · Equipo listo para etiquetar', 'success');
                } catch(err) { showToast('Error guardando N/S', 'error'); }
                finally { setSavingNS(function(prev) { var n = Object.assign({}, prev); delete n[activo.id]; return n; }); }
            };

            // ---- Render: Mapa de Ubicaciones ----
            const renderMapaUbicaciones = function() {
                return e(MapaUbicaciones, { state, setSearch, setView });
            };

            // ---- Render: Escáner Rápido ----
            const renderScannerRapido = function() {
                return e(ScannerRapido, { state, scanLog, setScanLog, scanCount, setScanCount, scanLastId, setScanLastId, scanFlash, setScanFlash });
            };

            // ---- Render: Recepción en lote ----
            const renderRecepcion = function() {
                return e('div', { style: { background: 'var(--bg-tertiary)', padding: '24px', borderRadius: '12px', border: '2px solid var(--accent-blue)' } },
                    e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } },
                        e('div', null,
                            e('div', { style: { fontWeight: '700', fontSize: '20px', marginBottom: '4px' } }, '📦 Recepción de lote'),
                            e('div', { style: { fontSize: '13px', color: 'var(--text-secondary)' } }, 'Registra uno o varios modelos de equipo. Los N/S se añaden en el siguiente paso.')
                        ),
                        e('button', { className: 'button button-secondary', onClick: function() { setView('lista'); } }, '✕ Cancelar')
                    ),
                    sublotes.map(function(sublote, idx) {
                        const modelosDisponibles = sublote.tipo ? (state.catalogo[sublote.tipo] || []) : [];
                        return e('div', { key: sublote.id, style: { background: 'var(--bg-primary)', borderRadius: '10px', padding: '16px', marginBottom: '12px', border: '1px solid var(--border)' } },
                            e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' } },
                                e('span', { style: { fontWeight: '700', fontSize: '14px', color: 'var(--accent-blue)' } }, 'Sublote ' + (idx + 1)),
                                sublotes.length > 1 ? e('button', { onClick: function() { removeSublote(sublote.id); }, style: { background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '22px', padding: '0 4px', lineHeight: 1 } }, '×') : null
                            ),
                            e('div', { className: 'form-row' },
                                e('div', { className: 'form-group' },
                                    e('label', { className: 'form-label' }, 'Sociedad *'),
                                    e('select', { className: 'form-select', value: sublote.sociedad, onChange: function(ev) { updateSublote(sublote.id, 'sociedad', ev.target.value); } },
                                        e('option', { value: '' }, '-- Sociedad --'),
                                        (state.sociedades || []).filter(function(s) { return s.activo; }).map(function(s) { return e('option', { key: s.id, value: s.codigo }, s.codigo + ' · ' + s.nombre); })
                                    )
                                ),
                                e('div', { className: 'form-group' },
                                    e('label', { className: 'form-label' }, 'Tipo *'),
                                    e('select', { className: 'form-select', value: sublote.tipo, onChange: function(ev) { updateSublote(sublote.id, 'tipo', ev.target.value); } },
                                        e('option', { value: '' }, '-- Tipo --'),
                                        tiposConEtiqueta.map(function(t) { return e('option', { key: t, value: t }, t); })
                                    )
                                ),
                                e('div', { className: 'form-group' },
                                    e('label', { className: 'form-label' }, 'Modelo *'),
                                    e('select', { className: 'form-select', value: sublote.modelo, onChange: function(ev) { updateSublote(sublote.id, 'modelo', ev.target.value); }, disabled: !sublote.tipo },
                                        e('option', { value: '' }, '-- Modelo --'),
                                        modelosDisponibles.map(function(m) { return e('option', { key: m, value: m }, m); })
                                    )
                                ),
                                e('div', { className: 'form-group' },
                                    e('label', { className: 'form-label' }, 'Ubicación inicial *'),
                                    e('select', { className: 'form-select', value: sublote.ubicacion, onChange: function(ev) { updateSublote(sublote.id, 'ubicacion', ev.target.value); } },
                                        e('option', { value: '' }, '-- Ubicación --'),
                                        (state.ubicaciones || []).map(function(u) { return e('option', { key: u.id, value: u.nombre }, u.nombre); })
                                    )
                                ),
                                e('div', { className: 'form-group', style: { maxWidth: '130px' } },
                                    e('label', { className: 'form-label' }, 'Cantidad *'),
                                    e('input', { type: 'number', min: '1', max: '200', className: 'form-input', value: sublote.cantidad, onChange: function(ev) { updateSublote(sublote.id, 'cantidad', ev.target.value); } })
                                )
                            )
                        );
                    }),
                    e('button', { className: 'button button-secondary', onClick: addSublote, style: { marginBottom: '20px' } }, '+ Añadir otro modelo'),
                    // Barra de progreso
                    creatingProgress ? e('div', { style: { marginBottom: '16px' } },
                        e('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' } },
                            e('span', null, 'Creando equipos en SharePoint...'),
                            e('span', { style: { fontFamily: 'IBM Plex Mono,monospace', fontWeight: '700', color: 'var(--accent-blue)' } }, creatingProgress.current + ' / ' + creatingProgress.total)
                        ),
                        e('div', { style: { background: 'var(--bg-primary)', borderRadius: '8px', height: '10px', overflow: 'hidden' } },
                            e('div', { style: { background: 'var(--accent-blue)', height: '100%', width: Math.round(creatingProgress.current / creatingProgress.total * 100) + '%', transition: 'width .3s ease', borderRadius: '8px' } })
                        )
                    ) : null,
                    e('div', { style: { display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginTop: '8px' } },
                        totalUnidades > 0 ? e('div', { style: { padding: '10px 16px', background: 'rgba(88,166,255,.1)', border: '1px solid var(--accent-blue)', borderRadius: '8px', fontSize: '14px' } },
                            'Se crearán ', e('strong', { style: { color: 'var(--accent-blue)' } }, totalUnidades), ' equipo(s) en estado ', e('strong', null, '⚠️ Pendiente N/S')
                        ) : null,
                        e('button', { className: 'button button-primary', onClick: handleCrearLote, disabled: !sublotesValidos || !!creatingProgress, style: { marginLeft: 'auto', minWidth: '180px' } },
                            creatingProgress ? e('span', { className: 'loading-spinner' }) : null,
                            ' ', creatingProgress ? 'Creando...' : '✓ Crear ' + (totalUnidades > 0 ? totalUnidades + ' equipos' : '')
                        )
                    )
                );
            };

            // ---- Render: Pendientes (inline N/S) ----
            const renderPendientes = function() {
                if (pendientes.length === 0) return e('div', { className: 'empty-state' },
                    e('div', { className: 'empty-state-icon' }, '✅'),
                    e('div', { className: 'empty-state-title' }, 'Sin equipos pendientes'),
                    e('div', { className: 'empty-state-text' }, 'Todos los equipos tienen N/S asignado')
                );
                return e('div', null,
                    e('div', { className: 'info-banner orange', style: { marginBottom: '16px' } },
                        '⚠️ ', e('strong', null, pendientes.length + ' equipo(s)'), ' pendientes de N/S. Rellena el campo y pulsa Enter o "✓". Sin N/S no se puede imprimir etiqueta ni asignar el equipo.'
                    ),
                    e('table', { className: 'history-table' },
                        e('thead', null, e('tr', null,
                            e('th', { style: { width: '180px' } }, 'ID Interno'),
                            e('th', null, 'Tipo'),
                            e('th', null, 'Modelo'),
                            e('th', null, 'Ubicación'),
                            e('th', null, 'Número de Serie del fabricante *'),
                            e('th', { style: { width: '110px' } }, '')
                        )),
                        e('tbody', null, pendientes.map(function(activo) {
                            const nsVal = inlineNS[activo.id] !== undefined ? inlineNS[activo.id] : '';
                            const isSaving = !!savingNS[activo.id];
                            return e('tr', { key: activo.id },
                                e('td', null, e('span', { style: { fontFamily: 'IBM Plex Mono,monospace', fontSize: '11px', fontWeight: '700', color: 'var(--accent-orange)' } }, activo.idEtiqueta)),
                                e('td', { style: { fontWeight: '500' } }, activo.tipo),
                                e('td', null, activo.modelo),
                                e('td', { style: { fontSize: '13px' } }, activo.ubicacion || '-'),
                                e('td', null,
                                    e('input', {
                                        type: 'text',
                                        className: 'form-input',
                                        placeholder: 'Escribe o escanea con cámara...',
                                        value: nsVal,
                                        autoComplete: 'off',
                                        style: { padding: '8px 12px', fontSize: '14px', fontFamily: 'IBM Plex Mono,monospace' },
                                        ref: function(el) { if (el) nsInputRefs.current[activo.id] = el; },
                                        onChange: function(ev) { setInlineNS(function(prev) { return Object.assign({}, prev, { [activo.id]: ev.target.value }); }); },
                                        onKeyDown: function(ev) {
                                            if (ev.key === 'Enter') { ev.preventDefault(); saveNS(activo); }
                                            if (ev.key === 'Tab') { /* dejar comportamiento por defecto para navegar */ }
                                        }
                                    })
                                ),
                                e('td', null, e('button', {
                                    className: 'button button-success',
                                    onClick: function() { saveNS(activo); },
                                    disabled: isSaving || !nsVal.trim(),
                                    style: { padding: '8px 14px', fontSize: '13px', width: '100%' }
                                }, isSaving ? e('span', { className: 'loading-spinner' }) : '✓ Guardar'))
                            );
                        }))
                    )
                );
            };

            // ---- Render principal ----
            return e('div', null,
                // Toolbar
                e('div', { className: 'toolbar' },
                    e('div', { className: 'toolbar-left' },
                        view === 'lista' && e('input', { type: 'text', className: 'search-bar', placeholder: 'Buscar por ID, tipo, modelo, N/S...', value: search, onChange: function(ev) { setSearch(ev.target.value); } }),
                        view === 'lista' && e('select', { className: 'filter-select', value: filterTipo, onChange: function(ev) { setFilterTipo(ev.target.value); } },
                            e('option', { value: 'all' }, 'Todos los tipos'),
                            tiposUnicos.map(function(t) { return e('option', { key: t, value: t }, t); })
                        ),
                        view === 'lista' && e('select', { className: 'filter-select', value: filterEstado, onChange: function(ev) { setFilterEstado(ev.target.value); } },
                            e('option', { value: 'all' }, 'Todos los estados'),
                            e('option', { value: 'Pendiente' }, '⚠️ Pendiente N/S'),
                            e('option', { value: 'Almacen' }, 'En Almacén'),
                            e('option', { value: 'Asignado' }, 'Asignado'),
                            e('option', { value: 'Baja' }, 'Baja')
                        ),
                        view === 'lista' && e('span', { className: 'results-count' }, e('strong', null, filtered.length), ' equipos')
                    ),
                    e('div', { className: 'toolbar-right' },
                        pendientes.length > 0 && view === 'lista' && e('button', {
                            className: 'button button-warning',
                            onClick: function() { setView('pendientes'); }
                        }, '⚠️ Pendientes N/S (' + pendientes.length + ')'),
                        view === 'pendientes' && e('button', { className: 'button button-secondary', onClick: function() { setView('lista'); } }, T().backToList),
                        view === 'recepcion' && e('button', { className: 'button button-secondary', onClick: function() { setView('lista'); } }, T().backToList),
                        view === 'scanner' && e('button', { className: 'button button-secondary', onClick: function() { stopBarcodeScanner(); setView('lista'); } }, T().exitScanner),
                        view === 'mapa' && e('button', { className: 'button button-secondary', onClick: function() { setView('lista'); } }, T().backToList),
                        view === 'lista' && e('button', { className: 'button button-secondary', style: { background: 'rgba(88,166,255,.1)', border: '1px solid #58a6ff44', color: '#58a6ff' }, onClick: function() { setView('mapa'); } }, T().mapView),
                        view === 'lista' && e('button', { className: 'button button-purple', onClick: function() { setScanLog([]); setScanCount(0); setScanLastId(''); setView('scanner'); } }, T().scannerMode),
                        view === 'lista' && e('button', { className: 'button button-primary', onClick: function() { setView('recepcion'); } }, T().receiveBatch)
                    )
                ),
                // Contenido según vista
                view === 'recepcion' ? renderRecepcion() :
                view === 'pendientes' ? renderPendientes() :
                view === 'scanner' ? renderScannerRapido() :
                view === 'mapa' ? renderMapaUbicaciones() :
                filtered.length > 0 ? e('table', { className: 'history-table' },
                    e('thead', null, e('tr', null,
                        e('th', { style: { width: '165px' } }, 'ID Interno'),
                        e('th', null, 'Tipo'),
                        e('th', null, 'Modelo'),
                        e('th', { style: { width: '70px' } }, 'Soc.'),
                        e('th', null, 'N/S Fabricante'),
                        e('th', { style: { width: '130px' } }, 'Estado'),
                        e('th', null, 'Ubicación'),
                        e('th', { style: { width: '140px' } }, 'Acciones')
                    )),
                    e('tbody', null, filtered.map(function(activo) {
                        const tieneNS = !!activo.numSerie;
                        const isPendiente = activo.estado === 'Pendiente';
                        const esTerminal = activo.estado === 'Robado' || activo.estado === 'Baja';
                        return e('tr', { key: activo.id, style: isPendiente ? { background: 'rgba(249,115,22,.04)' } : {} },
                            e('td', null, e('span', {
                                style: { fontFamily: 'IBM Plex Mono,monospace', fontSize: '11px', fontWeight: '700', color: isPendiente ? 'var(--accent-orange)' : 'var(--accent-blue)', cursor: 'pointer', textDecoration: 'underline' },
                                onClick: function() { setFichaEquipo(activo); }, title: 'Ver ficha completa'
                            }, activo.idEtiqueta)),
                            e('td', { style: { fontWeight: '500' } }, activo.tipo),
                            e('td', null, activo.modelo),
                            e('td', null, activo.sociedad ? e('span', { style: { fontFamily: 'IBM Plex Mono,monospace', fontSize: '11px', color: 'var(--accent-purple)', fontWeight: '700' } }, activo.sociedad) : '-'),
                            e('td', null, tieneNS ? e('span', { style: { fontFamily: 'IBM Plex Mono,monospace', fontSize: '12px', color: 'var(--text-secondary)' } }, activo.numSerie) : e('span', { style: { color: 'var(--accent-orange)', fontSize: '12px', fontWeight: '600' } }, '⚠️ Sin N/S')),
                            e('td', null, e('span', { style: { background: estadoBg[activo.estado] || 'var(--bg-tertiary)', color: estadoColor[activo.estado] || 'var(--text-primary)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' } }, estadoLabel[activo.estado] || activo.estado)),
                            e('td', { style: { fontSize: '13px' } }, activo.ubicacion || '-'),
                            e('td', null, e('div', { style: { display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' } },
                                e('div', { className: 'action-icon tooltip', 'data-tooltip': 'Ver ficha', onClick: function() { setFichaEquipo(activo); } }, '📄'),
                                e('div', { className: 'action-icon tooltip', 'data-tooltip': tieneNS ? 'Imprimir QR' : 'Requiere N/S', onClick: tieneNS ? function() { exportEtiquetaPDF([activo]); } : null, style: tieneNS ? {} : { opacity: 0.3, cursor: 'not-allowed' } }, '🖨️'),
                                !esTerminal && !isPendiente && e('div', { className: 'action-icon tooltip', 'data-tooltip': 'Cambiar estado', onClick: function() { setCambioEstado({ equipo: activo, nuevoEstado: '' }); setCambioMotivo(''); setCambioDestino(''); } }, '🔄'),
                                isPendiente && e('div', { className: 'action-icon tooltip', 'data-tooltip': 'Añadir N/S', onClick: function() { setView('pendientes'); }, style: { color: 'var(--accent-orange)' } }, '✏️'),
                                confirmDeleteId === activo.id
                                    ? e('div', { style: { display: 'flex', gap: '4px' } },
                                        e('button', { className: 'button button-danger', onClick: async function() { await dataManager.deleteActivo(activo.id); setConfirmDeleteId(null); await onRefresh(); showToast('Equipo eliminado', 'success'); }, style: { padding: '6px 10px', fontSize: '12px' } }, '✓'),
                                        e('button', { className: 'button button-secondary', onClick: function() { setConfirmDeleteId(null); }, style: { padding: '6px 10px', fontSize: '12px' } }, '✕'))
                                    : e('div', { className: 'action-icon danger tooltip', 'data-tooltip': 'Eliminar', onClick: function() { setConfirmDeleteId(activo.id); } }, '🗑️')
                            ))
                        );
                    }))
                ) : e('div', { className: 'empty-state' },
                    e('div', { className: 'empty-state-icon' }, '💻'),
                    e('div', { className: 'empty-state-title' }, search || filterTipo !== 'all' || filterEstado !== 'all' ? 'Sin resultados' : 'No hay equipos registrados'),
                    e('div', { className: 'empty-state-text' }, search || filterTipo !== 'all' || filterEstado !== 'all' ? 'Prueba otros filtros' : 'Usa "Recepción de lote" para registrar equipos con etiqueta')
                ),

                // Modal: Ficha de equipo
                fichaEquipo && e('div', { className: 'modal-overlay', onClick: function(ev) { if (ev.target === ev.currentTarget) setFichaEquipo(null); } },
                    e('div', { className: 'modal', style: { maxWidth: '750px' }, onClick: function(ev) { ev.stopPropagation(); } },
                        e('div', { className: 'modal-header' },
                            e('h2', { className: 'modal-title' }, T().equipmentFile),
                            e('button', { className: 'modal-close', onClick: function() { setFichaEquipo(null); } }, '×')
                        ),
                        e('div', { className: 'modal-body' },
                            e('div', { style: { background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '20px', marginBottom: '20px' } },
                                e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' } },
                                    e('div', null,
                                        e('div', { style: { fontSize: '20px', fontWeight: '700', marginBottom: '4px' } }, fichaEquipo.tipo + ' · ' + fichaEquipo.modelo),
                                        e('div', { style: { fontFamily: 'IBM Plex Mono,monospace', fontSize: '14px', color: 'var(--accent-blue)', fontWeight: '700' } }, fichaEquipo.idEtiqueta)
                                    ),
                                    e('span', { style: { background: estadoBg[fichaEquipo.estado] || 'var(--bg-primary)', color: estadoColor[fichaEquipo.estado] || 'var(--text-primary)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700' } }, estadoLabel[fichaEquipo.estado] || fichaEquipo.estado)
                                ),
                                e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' } },
                                    [
                                        { label: 'N/S Fabricante', value: fichaEquipo.numSerie || '⚠️ Sin N/S' },
                                        { label: 'Sociedad', value: fichaEquipo.sociedad || '-' },
                                        { label: 'Ubicación', value: fichaEquipo.ubicacion || '-' },
                                        fichaEquipo.asignadoA ? { label: 'Asignado a', value: fichaEquipo.asignadoA } : null,
                                        fichaEquipo.transitoDestino ? { label: 'Destino tránsito', value: fichaEquipo.transitoDestino } : null,
                                        fichaEquipo.proveedor ? { label: 'Proveedor', value: fichaEquipo.proveedor } : null,
                                        fichaEquipo.numAlbaran ? { label: 'Nº Albarán', value: fichaEquipo.numAlbaran } : null,
                                        fichaEquipo.fechaCompra ? { label: 'Fecha Compra', value: new Date(fichaEquipo.fechaCompra).toLocaleDateString('es-ES') } : null,
                                        fichaEquipo.fechaGarantia ? { label: 'Garantía hasta', value: new Date(fichaEquipo.fechaGarantia).toLocaleDateString('es-ES'), warn: new Date(fichaEquipo.fechaGarantia) < new Date(Date.now() + 30*24*60*60*1000) } : null
                                    ].filter(Boolean).map(function(info, idx) {
                                        return e('div', { key: idx },
                                            e('div', { style: { fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' } }, info.label),
                                            e('div', { style: { fontWeight: '600', fontSize: '14px', color: info.warn ? 'var(--accent-orange)' : 'inherit' } }, info.warn ? '⚠️ ' + info.value : info.value)
                                        );
                                    })
                                )
                            ),
                            // Accesorios
                            e('div', { style: { marginBottom: '20px' } },
                                e('div', { style: { fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '.5px' } }, T().accessories),
                                e('textarea', {
                                    className: 'form-textarea',
                                    placeholder: 'Ej: Cargador USB-C 65W\nFunda protectora\nCable HDMI',
                                    value: fichaEquipo.accesorios || '',
                                    onChange: function(ev) { setFichaEquipo(function(p) { return Object.assign({}, p, { accesorios: ev.target.value }); }); },
                                    style: { minHeight: '80px', fontSize: '14px' }
                                }),
                                e('div', { style: { fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' } }, 'Un accesorio por línea. Se guarda al cerrar con "Guardar cambios".')
                            ),
                            // ── Timeline del equipo ──────────────────────────────────────
                            e('div', { style: { fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '16px', letterSpacing: '.5px' } }, T().timeline),
                            (function() {
                                const hEq = state.history.filter(function(h) { return h.idEtiqueta === fichaEquipo.idEtiqueta; }).sort(function(a,b) { return new Date(b.fecha) - new Date(a.fecha); });
                                if (hEq.length === 0) return e('div', { style: { color: 'var(--text-secondary)', fontSize: '14px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '10px', textAlign: 'center' } }, '📭 Sin movimientos registrados aún');
                                const tipoConfig = {
                                    'CambioEstado': { icon: '🔄', color: '#a855f7', label: 'Cambio de estado' },
                                    'Asignacion':   { icon: '→',  color: '#58a6ff', label: 'Asignado' },
                                    'Devolucion':   { icon: '←',  color: '#3fb950', label: 'Devuelto' },
                                    'Entrada':      { icon: '↑',  color: '#3fb950', label: 'Entrada' },
                                    'Salida':       { icon: '↓',  color: '#ef4444', label: 'Salida' },
                                    'Prestamo':     { icon: '⏱',  color: '#fbbf24', label: 'Préstamo' },
                                };
                                return e('div', { style: { position: 'relative' } },
                                    // Línea vertical
                                    e('div', { style: { position: 'absolute', left: '19px', top: '24px', bottom: '24px', width: '2px', background: 'var(--border)', zIndex: 0 } }),
                                    e('div', { style: { display: 'flex', flexDirection: 'column', gap: '0' } },
                                        hEq.map(function(h, i) {
                                            const cfg = tipoConfig[h.tipo] || { icon: '•', color: '#6b7280', label: h.tipo };
                                            const fecha = new Date(h.fecha);
                                            const esHoy = fecha.toDateString() === new Date().toDateString();
                                            return e('div', { key: h.id || i, style: { display: 'flex', gap: '14px', alignItems: 'flex-start', paddingBottom: '16px', position: 'relative', zIndex: 1 } },
                                                // Dot
                                                e('div', { style: { width: '40px', height: '40px', borderRadius: '50%', background: cfg.color + '20', border: '2px solid ' + cfg.color + '66', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0, background: 'var(--bg-secondary)' } }, cfg.icon),
                                                // Contenido
                                                e('div', { style: { flex: 1, background: 'var(--bg-tertiary)', borderRadius: '10px', padding: '10px 14px', border: '1px solid ' + cfg.color + '33' } },
                                                    e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '6px' } },
                                                        e('span', { style: { fontSize: '13px', fontWeight: '700', color: cfg.color } }, cfg.label),
                                                        e('span', { style: { fontSize: '11px', color: esHoy ? cfg.color : 'var(--text-secondary)', fontFamily: 'IBM Plex Mono,monospace', fontWeight: esHoy ? '700' : '400' } },
                                                            esHoy ? 'Hoy ' : '', fecha.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                                                        )
                                                    ),
                                                    (h.motivo || h.usuario) && e('div', { style: { fontSize: '12px', color: 'var(--text-primary)', marginBottom: '3px' } }, h.motivo || h.usuario),
                                                    h.tecnico && e('div', { style: { fontSize: '11px', color: 'var(--text-secondary)' } }, '🔧 ' + h.tecnico)
                                                )
                                            );
                                        })
                                    )
                                );
                            })()
                        ),
                        e('div', { className: 'modal-footer' },
                            fichaEquipo.numSerie && e('button', { className: 'button button-success', onClick: function() { exportEtiquetaPDF([fichaEquipo]); } }, T().printLabel),
                            !['Robado','Baja','Pendiente'].includes(fichaEquipo.estado) && e('button', { className: 'button button-secondary', onClick: function() { setCambioEstado({ equipo: fichaEquipo, nuevoEstado: '' }); setCambioMotivo(''); setCambioDestino(''); setFichaEquipo(null); } }, T().changeStatus),
                            e('button', { className: 'button button-primary', onClick: async function() {
                                // Guardar accesorios si han cambiado
                                const original = (state.activos || []).find(function(a) { return a.id === fichaEquipo.id; });
                                if (original && original.accesorios !== fichaEquipo.accesorios) {
                                    try { await dataManager.updateActivoAccesorios(fichaEquipo.id, fichaEquipo.accesorios || ''); await onRefresh(); showToast('Accesorios guardados', 'success'); } catch(err) { showToast('Error guardando accesorios', 'error'); }
                                }
                                setFichaEquipo(null);
                            } }, T().saveChanges),
                            e('button', { className: 'button button-secondary', onClick: function() { setFichaEquipo(null); } }, 'Cerrar')
                        )
                    )
                ),

                // Modal: Cambiar estado
                cambioEstado && e('div', { className: 'modal-overlay', onClick: function(ev) { if (ev.target === ev.currentTarget) setCambioEstado(null); } },
                    e('div', { className: 'modal', style: { maxWidth: '480px' }, onClick: function(ev) { ev.stopPropagation(); } },
                        e('div', { className: 'modal-header' },
                            e('h2', { className: 'modal-title' }, '🔄 Cambiar Estado'),
                            e('button', { className: 'modal-close', onClick: function() { setCambioEstado(null); } }, '×')
                        ),
                        e('div', { className: 'modal-body' },
                            e('div', { style: { background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' } },
                                e('div', { style: { fontWeight: '700' } }, cambioEstado.equipo.tipo + ' · ' + cambioEstado.equipo.modelo),
                                e('div', { style: { fontFamily: 'IBM Plex Mono,monospace', fontSize: '12px', color: 'var(--accent-blue)' } }, cambioEstado.equipo.idEtiqueta),
                                e('div', { style: { marginTop: '4px', fontSize: '13px', color: 'var(--text-secondary)' } }, 'Estado actual: ', e('strong', { style: { color: estadoColor[cambioEstado.equipo.estado] } }, estadoLabel[cambioEstado.equipo.estado] || cambioEstado.equipo.estado))
                            ),
                            e('div', { className: 'form-group' },
                                e('label', { className: 'form-label' }, 'Nuevo estado *'),
                                e('select', { className: 'form-select', value: cambioEstado.nuevoEstado, onChange: function(ev) { setCambioEstado(function(p) { return Object.assign({}, p, { nuevoEstado: ev.target.value }); }); setCambioMotivo(''); setCambioDestino(''); } },
                                    e('option', { value: '' }, '-- Selecciona --'),
                                    (function() {
                                        const trans = { 'Almacen': ['Reparacion','Transito','Baja'], 'Asignado': ['Reparacion','Extraviado','Robado'], 'Reparacion': ['Almacen'], 'Transito': ['Almacen'], 'Extraviado': ['Almacen'] };
                                        return (trans[cambioEstado.equipo.estado] || []).map(function(est) { return e('option', { key: est, value: est }, estadoLabel[est] || est); });
                                    })()
                                )
                            ),
                            cambioEstado.nuevoEstado === 'Transito' && e('div', { className: 'form-group' },
                                e('label', { className: 'form-label' }, 'Destino *'),
                                e('input', { type: 'text', className: 'form-input', placeholder: 'Ej: SLN · Países Bajos  o  SAT HP Madrid', value: cambioDestino, onChange: function(ev) { setCambioDestino(ev.target.value); } })
                            ),
                            ['Baja','Extraviado','Robado','Reparacion'].includes(cambioEstado.nuevoEstado) && e('div', { className: 'form-group' },
                                e('label', { className: 'form-label' }, cambioEstado.nuevoEstado === 'Reparacion' ? 'Descripción del problema *' : 'Motivo *'),
                                e('input', { type: 'text', className: 'form-input', placeholder: cambioEstado.nuevoEstado === 'Reparacion' ? 'Ej: Pantalla parpadeante, enviado a SAT HP' : cambioEstado.nuevoEstado === 'Robado' ? 'Ej: Robo en oficina, denuncia nº...' : cambioEstado.nuevoEstado === 'Extraviado' ? 'Ej: No aparece tras traslado' : 'Ej: Pantalla rota irreparable', value: cambioMotivo, onChange: function(ev) { setCambioMotivo(ev.target.value); } })
                            ),
                            cambioEstado.nuevoEstado === 'Almacen' && e('div', { className: 'info-banner green' }, '✓ El equipo volverá a estar disponible en el almacén.')
                        ),
                        e('div', { className: 'modal-footer' },
                            e('button', { className: 'button button-secondary', onClick: function() { setCambioEstado(null); } }, 'Cancelar'),
                            e('button', { className: 'button button-primary', onClick: handleCambiarEstado, disabled: savingEstado || !cambioEstado.nuevoEstado },
                                savingEstado ? e('span', { className: 'loading-spinner' }) : null,
                                ' ', savingEstado ? 'Guardando...' : 'Confirmar cambio'
                            )
                        )
                    )
                )
            );
        }



        // ADMIN PANEL - v2.3.0

export default EquiposView;
