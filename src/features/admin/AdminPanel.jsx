import React, { useEffect, useRef, useState } from 'react';
import { T } from '../../lib/i18n';
import { showToast } from '../../components/feedback/toast';
import { printTechnicianCard, exportAuditoria } from '../../services/export/exportService';
import { PacksManager } from '../../services/storage/packsManager';
import { getDataManager } from '../../services/runtime';

const e = React.createElement;

        function AdminPanel({ state, onRefresh, onSetStockMinimo, isAdmin }) {
            const dataManager = getDataManager();
            const [activeSection, setActiveSection] = useState('ubicaciones');
            const [loading, setLoading] = useState(false);
            const [openGroups, setOpenGroups] = useState({ infraestructura: true, catalogo: false, usuarios: false, sistema: false });
            const toggleGroup = g => setOpenGroups(s => ({ ...s, [g]: !s[g] }));
            const [newUbicacion, setNewUbicacion] = useState('');
            const [catalogoRaw, setCatalogoRaw] = useState([]);
            const [catalogoLoaded, setCatalogoLoaded] = useState(false);
            const [newTipo, setNewTipo] = useState('');
            const [newModelo, setNewModelo] = useState('');
            const [newModeloTipo, setNewModeloTipo] = useState('');
            const [stockMinimoInput, setStockMinimoInput] = useState(String(state.stockMinimoDefault || 2));
            // Export state
            const [exportSoc, setExportSoc] = useState('');
            const [exportDesde, setExportDesde] = useState('');
            const [exportHasta, setExportHasta] = useState('');
            // Sociedades
            const [newSoc, setNewSoc] = useState({ nombre: '', codigo: '', pais: '' });
            const [editingSocId, setEditingSocId] = useState(null);
            const [editingSocData, setEditingSocData] = useState({});
            // Proveedores
            const [newProv, setNewProv] = useState({ nombre: '', contacto: '', email: '', telefono: '' });
            const [editingProvId, setEditingProvId] = useState(null);
            const [editingProvData, setEditingProvData] = useState({});
            // Packs
            const [packs, setPacks] = useState(() => PacksManager.getAll());
            const [newPack, setNewPack] = useState({ nombre: '', descripcion: '', equipos: [] });
            const [newPackEquipo, setNewPackEquipo] = useState({ tipo: '', modelo: '' });
            const refreshPacks = () => setPacks(PacksManager.getAll());
            // Búsqueda AD - técnicos
            const [tecnicoQuery, setTecnicoQuery] = useState('');
            const [tecnicoResults, setTecnicoResults] = useState([]);
            const [tecnicoSearching, setTecnicoSearching] = useState(false);
            const [selectedTecnico, setSelectedTecnico] = useState(null);
            const tecnicoSearchRef = useRef(null);
            // Búsqueda AD - admins
            const [adminQuery, setAdminQuery] = useState('');
            const [adminResults, setAdminResults] = useState([]);
            const [adminSearching, setAdminSearching] = useState(false);
            const [selectedAdmin, setSelectedAdmin] = useState(null);
            const adminSearchRef = useRef(null);

            const act = async (fn, successMsg) => {
                setLoading(true);
                try { await fn(); showToast(successMsg, 'success'); await onRefresh(); }
                catch(e) { showToast('Error: ' + e.message, 'error'); }
                finally { setLoading(false); }
            };

            const loadCatalogo = async () => {
                if (catalogoLoaded) return;
                setLoading(true);
                try { const items = await dataManager.getCatalogoRaw(); setCatalogoRaw(items); setCatalogoLoaded(true); }
                catch(e) { showToast('Error cargando catálogo', 'error'); }
                finally { setLoading(false); }
            };

            const searchAD = (query, setResults, setSearching, ref) => {
                if (ref.current) clearTimeout(ref.current);
                if (!query || query.length < 2) { setResults([]); return; }
                setSearching(true);
                ref.current = setTimeout(async () => {
                    try { const r = await dataManager.searchUsers(query); setResults(r); }
                    catch(e) { setResults([]); }
                    finally { setSearching(false); }
                }, 400);
            };

            useEffect(() => {
                if (activeSection === 'catalogo') loadCatalogo();
            }, [activeSection]);

            const sectionBtn = (key, label, icon) => e('button', {
                onClick: () => setActiveSection(key),
                style: {
                    padding: '12px 20px', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '14px',
                    background: activeSection === key ? 'var(--accent-purple)' : 'var(--bg-tertiary)',
                    color: activeSection === key ? 'white' : 'var(--text-secondary)',
                    transition: 'all .2s', minWidth: '160px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px'
                }
            }, icon, ' ', label);

            const card = (title, content) => e('div', { style: { background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' } },
                e('div', { style: { padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: '700', fontSize: '16px' } }, title),
                e('div', { style: { padding: '20px' } }, content)
            );

            const addRow = (placeholder, value, onChange, onAdd, disabled) => e('div', { style: { display: 'flex', gap: '8px', marginBottom: '16px' } },
                e('input', { type: 'text', className: 'form-input', placeholder, value, onChange: ev => onChange(ev.target.value), style: { flex: 1 }, onKeyDown: ev => { if (ev.key === 'Enter') onAdd(); } }),
                e('button', { className: 'button button-success', onClick: onAdd, disabled: disabled || loading || !value.trim(), style: { padding: '12px 20px' } }, loading ? e('span', { className: 'loading-spinner' }) : '+ Añadir')
            );

            const itemRow = (nombre, activo, onToggle, onDelete, extra) => e('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: activo ? 'var(--bg-primary)' : 'rgba(239,68,68,.05)', borderRadius: '8px', marginBottom: '6px', opacity: activo ? 1 : 0.6 } },
                e('span', { style: { flex: 1, fontSize: '14px', fontWeight: '500' } }, nombre),
                extra && e('span', { style: { fontSize: '12px', color: 'var(--text-secondary)' } }, extra),
                e('button', { className: 'button ' + (activo ? 'button-warning' : 'button-success'), onClick: onToggle, disabled: loading, style: { padding: '6px 12px', fontSize: '12px' } }, activo ? 'Desactivar' : 'Activar'),
                e('button', { className: 'button button-danger', onClick: onDelete, disabled: loading, style: { padding: '6px 10px', fontSize: '12px' } }, '🗑️')
            );

            // ---- SECCIONES ----

            const [editingUbicId, setEditingUbicId] = useState(null);
            const [editingUbicNombre, setEditingUbicNombre] = useState('');

            const renderUbicaciones = () => card('📍 Ubicaciones',
                e('div', null,
                    addRow('Nueva ubicación (ej: Madrid - Almacen)', newUbicacion, setNewUbicacion,
                        () => act(() => dataManager.createUbicacion(newUbicacion.trim()), 'Ubicación añadida').then(() => setNewUbicacion(''))),
                    state.ubicacionesAll.length === 0 ?
                        e('div', { style: { color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', padding: '20px' } }, 'No hay ubicaciones todavía') :
                        state.ubicacionesAll.map(u => {
                            const isEditing = editingUbicId === u.id;
                            return e('div', { key: u.id, style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: u.activo ? 'var(--bg-primary)' : 'rgba(239,68,68,.05)', borderRadius: '8px', marginBottom: '6px', opacity: u.activo ? 1 : 0.6 } },
                                isEditing
                                    ? e('input', { type: 'text', className: 'form-input', value: editingUbicNombre, onChange: ev => setEditingUbicNombre(ev.target.value), style: { flex: 1, padding: '6px 10px', fontSize: '14px' }, onKeyDown: ev => { if (ev.key === 'Enter') act(() => dataManager.updateUbicacion(u.id, editingUbicNombre.trim()), 'Ubicación actualizada').then(() => setEditingUbicId(null)); if (ev.key === 'Escape') setEditingUbicId(null); } })
                                    : e('span', { style: { flex: 1, fontSize: '14px', fontWeight: '500' } }, u.nombre),
                                isEditing
                                    ? e('button', { className: 'button button-success', onClick: () => act(() => dataManager.updateUbicacion(u.id, editingUbicNombre.trim()), 'Actualizada').then(() => setEditingUbicId(null)), disabled: loading, style: { padding: '6px 12px', fontSize: '12px' } }, '✓ Guardar')
                                    : e('button', { className: 'button button-secondary', onClick: () => { setEditingUbicId(u.id); setEditingUbicNombre(u.nombre); }, style: { padding: '6px 10px', fontSize: '12px' } }, '✏️'),
                                isEditing
                                    ? e('button', { className: 'button button-secondary', onClick: () => setEditingUbicId(null), style: { padding: '6px 10px', fontSize: '12px' } }, '✕')
                                    : e('button', { className: 'button ' + (u.activo ? 'button-warning' : 'button-success'), onClick: () => act(() => dataManager.toggleUbicacion(u.id, u.activo), u.activo ? 'Desactivada' : 'Activada'), disabled: loading, style: { padding: '6px 12px', fontSize: '12px' } }, u.activo ? 'Desactivar' : 'Activar'),
                                !isEditing && e('button', { className: 'button button-danger', onClick: () => act(() => dataManager.deleteUbicacion(u.id), 'Eliminada'), disabled: loading, style: { padding: '6px 10px', fontSize: '12px' } }, '🗑️')
                            );
                        })
                )
            );

            const renderCatalogo = () => card('📦 Catálogo de Material',
                e('div', null,
                    // Añadir tipo nuevo
                    e('div', { style: { marginBottom: '20px' } },
                        e('div', { className: 'form-label', style: { marginBottom: '8px' } }, 'Nuevo Tipo'),
                        addRow('Nombre del tipo (ej: Docking Stations)', newTipo, setNewTipo,
                            () => act(async () => { await dataManager.addToCatalog(newTipo.trim(), ''); setCatalogoLoaded(false); await onRefresh(); }, 'Tipo añadido').then(() => setNewTipo('')))
                    ),
                    // Añadir modelo a tipo existente
                    e('div', { style: { marginBottom: '20px' } },
                        e('div', { className: 'form-label', style: { marginBottom: '8px' } }, 'Nuevo Modelo'),
                        e('div', { style: { display: 'flex', gap: '8px', marginBottom: '8px' } },
                            e('select', { className: 'form-select', value: newModeloTipo, onChange: ev => setNewModeloTipo(ev.target.value), style: { flex: 1 } },
                                e('option', { value: '' }, '-- Selecciona tipo --'),
                                Object.keys(state.catalogoTipos || {}).map(t => e('option', { key: t, value: t }, t))
                            ),
                            e('input', { type: 'text', className: 'form-input', placeholder: 'Nombre del modelo', value: newModelo, onChange: ev => setNewModelo(ev.target.value), style: { flex: 2 }, onKeyDown: ev => { if (ev.key === 'Enter' && newModeloTipo && newModelo.trim()) act(async () => { await dataManager.addToCatalog(newModeloTipo, newModelo.trim()); setCatalogoLoaded(false); }, 'Modelo añadido').then(() => setNewModelo('')); } }),
                            e('button', { className: 'button button-success', onClick: () => act(async () => { await dataManager.addToCatalog(newModeloTipo, newModelo.trim()); setCatalogoLoaded(false); }, 'Modelo añadido').then(() => setNewModelo('')), disabled: loading || !newModeloTipo || !newModelo.trim(), style: { padding: '12px 20px' } }, '+ Añadir')
                        )
                    ),
                    // Lista de catálogo
                    loading && !catalogoLoaded ? e('div', { style: { textAlign: 'center', padding: '20px' } }, e('span', { className: 'loading-spinner' })) :
                    catalogoRaw.length === 0 ? e('div', { style: { color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' } }, 'El catálogo está vacío') :
                    Object.entries(
                        catalogoRaw.reduce((acc, item) => { if (!acc[item.tipo]) acc[item.tipo] = []; acc[item.tipo].push(item); return acc; }, {})
                    ).map(([tipo, modelos]) => {
                        const tieneEtiqueta = modelos.some(m => m.llevaEtiqueta);
                        const tipoItem = modelos[0]; // usamos el primer item para toggle
                        return e('div', { key: tipo, style: { marginBottom: '16px' } },
                            e('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: '6px' } },
                                e('div', { style: { fontWeight: '700', fontSize: '13px', color: 'var(--accent-blue)', textTransform: 'uppercase', flex: 1 } }, tipo),
                                e('label', { style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: tieneEtiqueta ? 'var(--accent-green)' : 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' } },
                                    e('input', { type: 'checkbox', checked: tieneEtiqueta, onChange: async () => {
                                        try {
                                            for (const m of modelos) {
                                                await dataManager.updateCatalogLlevaEtiqueta(m.id, !tieneEtiqueta);
                                            }
                                            setCatalogoLoaded(false);
                                            await onRefresh();
                                            showToast(tieneEtiqueta ? 'Etiqueta desactivada' : 'Etiqueta activada ✓', 'success');
                                        } catch(err) { showToast('Error: ' + err.message, 'error'); }
                                    }, style: { width: '16px', height: '16px', cursor: 'pointer' } }),
                                    tieneEtiqueta ? '🏷️ Lleva etiqueta' : 'Sin etiqueta'
                                )
                            ),
                            modelos.filter(m => m.modelo).map(m => e('div', { key: m.id, style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: m.activo ? 'var(--bg-primary)' : 'rgba(239,68,68,.05)', borderRadius: '6px', marginBottom: '4px', opacity: m.activo ? 1 : 0.6 } },
                                e('span', { style: { flex: 1, fontSize: '14px' } }, m.modelo),
                                e('button', { className: 'button button-danger', onClick: () => act(() => { setCatalogoLoaded(false); return dataManager.deleteCatalogItem(m.id); }, 'Modelo eliminado'), disabled: loading, style: { padding: '4px 10px', fontSize: '12px' } }, '🗑️')
                            ))
                        );
                    })
                )
            );

            const renderTecnicos = () => card('👤 Técnicos',
                e('div', null,
                    e('div', { style: { marginBottom: '16px' } },
                        e('div', { className: 'form-label', style: { marginBottom: '8px' } }, 'Nuevo Técnico — buscar en Active Directory'),
                        e('div', { style: { position: 'relative', marginBottom: '8px' } },
                            e('input', {
                                type: 'text', className: 'form-input',
                                placeholder: 'Buscar por nombre en Active Directory...',
                                value: selectedTecnico ? selectedTecnico.displayName : tecnicoQuery,
                                onChange: ev => {
                                    if (selectedTecnico) setSelectedTecnico(null);
                                    setTecnicoQuery(ev.target.value);
                                    searchAD(ev.target.value, setTecnicoResults, setTecnicoSearching, tecnicoSearchRef);
                                }
                            }),
                            selectedTecnico && e('div', { style: { marginTop: '6px', color: 'var(--accent-green)', fontSize: '13px' } }, '✓ ' + selectedTecnico.displayName + ' · ' + selectedTecnico.mail),
                            (tecnicoSearching || tecnicoResults.length > 0) && !selectedTecnico && e('div', { className: 'user-search-dropdown' },
                                tecnicoSearching && e('div', { style: { padding: '12px', color: 'var(--text-secondary)' } }, '⏳ Buscando...'),
                                tecnicoResults.map(u => e('div', { key: u.id, className: 'user-search-item', onClick: () => { setSelectedTecnico(u); setTecnicoQuery(''); setTecnicoResults([]); } },
                                    e('div', { style: { fontWeight: '600' } }, u.displayName),
                                    e('div', { style: { fontSize: '12px', color: 'var(--text-secondary)' } }, u.mail),
                                    (u.department || u.jobTitle) && e('div', { style: { fontSize: '12px', color: 'var(--accent-blue)' } }, [u.department, u.jobTitle].filter(Boolean).join(' · '))
                                ))
                            )
                        ),
                        e('button', {
                            className: 'button button-success',
                            onClick: () => act(async () => {
                                if (!selectedTecnico) throw new Error('Selecciona un usuario del AD');
                                const codigo = 'TEC' + Date.now().toString().slice(-6);
                                await dataManager.createTechnician({ nombre: selectedTecnico.displayName, codigo, email: selectedTecnico.mail });
                                setSelectedTecnico(null); setTecnicoQuery('');
                            }, 'Técnico creado'),
                            disabled: loading || !selectedTecnico,
                            style: { width: '100%' }
                        }, '+ Crear Técnico')
                    ),
                    state.technicians.length === 0 ? e('div', { style: { color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' } }, 'No hay técnicos') :
                    state.technicians.map(t => e('div', { key: t.id, style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: t.activo ? 'var(--bg-primary)' : 'rgba(239,68,68,.05)', borderRadius: '8px', marginBottom: '6px', opacity: t.activo ? 1 : 0.6 } },
                        e('div', { style: { flex: 1 } },
                            e('div', { style: { fontWeight: '600', fontSize: '14px' } }, t.nombre),
                            e('div', { style: { fontSize: '12px', color: 'var(--text-secondary)' } }, t.email),
                            e('div', { style: { fontSize: '11px', color: 'var(--accent-blue)', fontFamily: 'IBM Plex Mono,monospace' } }, t.codigo)
                        ),
                        e('button', { className: 'button button-primary', onClick: () => printTechnicianCard(t), style: { padding: '6px 12px', fontSize: '12px' } }, '🖨️'),
                        e('button', { className: 'button ' + (t.activo ? 'button-warning' : 'button-success'), onClick: () => act(() => dataManager.toggleTechnicianStatus(t.id, t.activo), t.activo ? 'Técnico desactivado' : 'Técnico activado'), disabled: loading, style: { padding: '6px 12px', fontSize: '12px' } }, t.activo ? 'Desactivar' : 'Activar')
                    ))
                )
            );

            const renderAdmins = () => card('🛡️ Administradores',
                e('div', null,
                    e('div', { style: { marginBottom: '16px' } },
                        e('div', { className: 'form-label', style: { marginBottom: '8px' } }, 'Nuevo Administrador — buscar en Active Directory'),
                        e('div', { style: { position: 'relative', marginBottom: '8px' } },
                            e('input', {
                                type: 'text', className: 'form-input',
                                placeholder: 'Buscar por nombre en Active Directory...',
                                value: selectedAdmin ? selectedAdmin.displayName : adminQuery,
                                onChange: ev => {
                                    if (selectedAdmin) setSelectedAdmin(null);
                                    setAdminQuery(ev.target.value);
                                    searchAD(ev.target.value, setAdminResults, setAdminSearching, adminSearchRef);
                                }
                            }),
                            selectedAdmin && e('div', { style: { marginTop: '6px', color: 'var(--accent-green)', fontSize: '13px' } }, '✓ ' + selectedAdmin.displayName + ' · ' + selectedAdmin.mail),
                            (adminSearching || adminResults.length > 0) && !selectedAdmin && e('div', { className: 'user-search-dropdown' },
                                adminSearching && e('div', { style: { padding: '12px', color: 'var(--text-secondary)' } }, '⏳ Buscando...'),
                                adminResults.map(u => e('div', { key: u.id, className: 'user-search-item', onClick: () => { setSelectedAdmin(u); setAdminQuery(''); setAdminResults([]); } },
                                    e('div', { style: { fontWeight: '600' } }, u.displayName),
                                    e('div', { style: { fontSize: '12px', color: 'var(--text-secondary)' } }, u.mail),
                                    (u.department || u.jobTitle) && e('div', { style: { fontSize: '12px', color: 'var(--accent-blue)' } }, [u.department, u.jobTitle].filter(Boolean).join(' · '))
                                ))
                            )
                        ),
                        e('button', {
                            className: 'button button-success',
                            onClick: () => act(async () => {
                                if (!selectedAdmin) throw new Error('Selecciona un usuario del AD');
                                await dataManager.createAdmin(selectedAdmin.mail);
                                setSelectedAdmin(null); setAdminQuery('');
                            }, 'Admin añadido'),
                            disabled: loading || !selectedAdmin,
                            style: { width: '100%' }
                        }, '+ Añadir Admin')
                    ),
                    e('div', { className: 'info-banner orange', style: { marginBottom: '16px' } }, '🔒 Los administradores no se pueden eliminar desde la app. Para revocar acceso, desactívalos.'),
                    state.adminsAll.length === 0 ?
                        e('div', { style: { color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' } }, 'No hay admins') :
                        state.adminsAll.map(a => e('div', { key: a.id, style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: a.activo ? 'var(--bg-primary)' : 'rgba(239,68,68,.05)', borderRadius: '8px', marginBottom: '6px', opacity: a.activo ? 1 : 0.6 } },
                            e('span', { style: { flex: 1, fontSize: '14px', fontWeight: '500' } }, a.email),
                            a.email.toLowerCase() === state.user?.email.toLowerCase() && e('span', { style: { fontSize: '11px', color: 'var(--accent-purple)', background: 'rgba(168,85,247,.1)', padding: '2px 8px', borderRadius: '4px' } }, 'Tú'),
                            e('button', { className: 'button ' + (a.activo ? 'button-warning' : 'button-success'), onClick: () => act(() => dataManager.toggleAdmin(a.id, a.activo), a.activo ? 'Admin desactivado' : 'Admin activado'), disabled: loading || a.email.toLowerCase() === state.user?.email.toLowerCase(), style: { padding: '6px 12px', fontSize: '12px' } }, a.activo ? 'Desactivar' : 'Activar')
                        ))
                )
            );

            const renderExportar = () => e('div', { style: { background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' } },
                e('div', { style: { padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: '700', fontSize: '16px' } }, '📊 Exportar para Auditoría'),
                e('div', { style: { padding: '24px' } },
                    e('div', { style: { background: 'rgba(88,166,255,.07)', border: '1px solid rgba(88,166,255,.2)', borderRadius: '10px', padding: '14px 16px', marginBottom: '24px', fontSize: '13px', color: 'var(--accent-blue)', lineHeight: '1.6' } },
                        '📁 Genera un archivo Excel con 5 pestañas: ', e('strong', null, 'Resumen ejecutivo'), ', ',
                        e('strong', null, 'Equipos'), ', ', e('strong', null, 'Inventario'), ', ',
                        e('strong', null, 'Historial'), ' y ', e('strong', null, 'Asignaciones activas'), '.'
                    ),
                    e('div', { className: 'form-row', style: { marginBottom: '16px' } },
                        e('div', { className: 'form-group', style: { margin: 0 } },
                            e('label', { className: 'form-label' }, 'Sociedad (opcional)'),
                            e('select', { className: 'form-select', value: exportSoc, onChange: function(ev) { setExportSoc(ev.target.value); } },
                                e('option', { value: '' }, 'Todas las sociedades'),
                                (state.sociedades || []).filter(function(s) { return s.activo; }).map(function(s) {
                                    return e('option', { key: s.id, value: s.nombre }, s.nombre);
                                })
                            )
                        ),
                        e('div', { className: 'form-group', style: { margin: 0 } },
                            e('label', { className: 'form-label' }, 'Historial desde'),
                            e('input', { type: 'date', className: 'form-input', value: exportDesde, onChange: function(ev) { setExportDesde(ev.target.value); } })
                        ),
                        e('div', { className: 'form-group', style: { margin: 0 } },
                            e('label', { className: 'form-label' }, 'Historial hasta'),
                            e('input', { type: 'date', className: 'form-input', value: exportHasta, onChange: function(ev) { setExportHasta(ev.target.value); } })
                        )
                    ),
                    // Preview stats
                    e('div', { style: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' } },
                        [
                            { label: 'Equipos', value: (state.activos || []).filter(function(a) { return !exportSoc || a.sociedad === exportSoc; }).length, color: '#58a6ff', icon: '💻' },
                            { label: 'Inventario', value: (state.inventory || []).length, color: '#3fb950', icon: '📦' },
                            { label: 'Movimientos', value: (state.history || []).filter(function(h) {
                                if (exportDesde && new Date(h.fecha) < new Date(exportDesde)) return false;
                                if (exportHasta && new Date(h.fecha) > new Date(exportHasta + 'T23:59:59')) return false;
                                return true;
                            }).length, color: '#a855f7', icon: '📜' },
                            { label: 'Asignaciones', value: (state.assignments || []).filter(function(a) { return a.estado === 'Activo'; }).length, color: '#fbbf24', icon: '📋' },
                        ].map(function(s, i) {
                            return e('div', { key: i, style: { flex: 1, minWidth: '100px', background: 'var(--bg-secondary)', border: '1px solid ' + s.color + '33', borderRadius: '10px', padding: '14px 16px', textAlign: 'center' } },
                                e('div', { style: { fontSize: '22px', marginBottom: '4px' } }, s.icon),
                                e('div', { style: { fontSize: '24px', fontWeight: '800', fontFamily: 'IBM Plex Mono,monospace', color: s.color, lineHeight: 1 } }, s.value),
                                e('div', { style: { fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', marginTop: '4px', textTransform: 'uppercase' } }, s.label)
                            );
                        })
                    ),
                    e('button', {
                        className: 'button button-success',
                        style: { width: '100%', fontSize: '16px', padding: '16px', gap: '10px' },
                        onClick: function() { exportAuditoria(state, { sociedad: exportSoc || null, desde: exportDesde || null, hasta: exportHasta || null }); }
                    }, '⬇️ Descargar Excel de Auditoría')
                )
            );

            const renderAjustes = () => card('⚙️ Ajustes Globales',
                e('div', null,
                    e('div', { className: 'form-group' },
                        e('label', { className: 'form-label' }, 'Stock Mínimo por Defecto'),
                        e('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                            e('input', { type: 'number', min: '0', className: 'form-input', value: stockMinimoInput, onChange: ev => setStockMinimoInput(ev.target.value), style: { maxWidth: '120px' } }),
                            e('button', { className: 'button button-success', onClick: () => { const val = parseInt(stockMinimoInput) || 2; localStorage.setItem('stockMinimoDefault', val); onSetStockMinimo(val); showToast('Stock mínimo por defecto: ' + val, 'success'); }, style: { padding: '12px 20px' } }, '✓ Guardar'),
                            e('span', { style: { fontSize: '13px', color: 'var(--text-secondary)' } }, 'Se aplica al crear nuevos productos')
                        )
                    ),
                    e('div', { className: 'form-group', style: { marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' } },
                        e('label', { className: 'form-label' }, '🖨️ DYMO Connect 1.6 — LabelName'),
                        e('div', { style: { fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' } },
                            'El LabelName identifica el tipo de etiqueta en DYMO Connect 1.6. Usa el botón 🔍 Detectar para obtenerlo automáticamente. ',
                            e('span', { style: { fontFamily: 'IBM Plex Mono,monospace', color: 'var(--accent-blue)', fontSize: '12px' } }, localStorage.getItem('dymo_label_name') ? '✅ Guardado: ' + localStorage.getItem('dymo_label_name') : '⚠️ No configurado — usa NameBadge11356 por defecto')
                        ),
                        e('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                            e('input', { type: 'text', className: 'form-input', id: 'dymo-paper-input',
                                placeholder: 'ej: 11356 Name Badge',
                                defaultValue: localStorage.getItem('dymo_label_name') || '',
                                style: { flex: 1, fontFamily: 'IBM Plex Mono,monospace' }
                            }),
                            e('button', { className: 'button button-success', style: { padding: '12px 16px' }, onClick: function() {
                                const val = document.getElementById('dymo-paper-input').value.trim();
                                if (val) { localStorage.setItem('dymo_label_name', val); showToast('LabelName guardado: ' + val, 'success'); }
                                else { localStorage.removeItem('dymo_label_name'); showToast('LabelName eliminado — se usará NameBadge11356', 'success'); }
                            } }, '✓ Guardar'),
                            e('button', { className: 'button button-secondary', style: { padding: '12px 16px' }, onClick: async function() {
                                showToast('Detectando PaperName...', 'success');
                                try {
                                    const resp = await fetch('https://127.0.0.1:41951/dcd/api/get-default-label/LabelWriter');
                                    const data = await resp.json();
                                    const rv = data.responseValue || data;
                                    const ln = rv && rv.label && rv.label.name;
                                    if (ln) { document.getElementById('dymo-paper-input').value = ln; showToast('LabelName detectado: ' + ln, 'success'); }
                                    else showToast('Respuesta: ' + JSON.stringify(rv).slice(0, 150), 'success');
                                } catch(e) {
                                    showToast('Error: ' + e.message, 'error');
                                }
                            } }, '🔍 Detectar')
                        ),
                        e('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' } },
                            ['NameBadge11356','11356 Name Badge','NameBadge','Address30251','Address30252'].map(function(pn) {
                                return e('button', { key: pn, onClick: function() {
                                    document.getElementById('dymo-paper-input').value = pn;
                                }, style: { background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'IBM Plex Mono,monospace' } }, pn);
                            })
                        )
                    )
                )
            );

            const renderSociedades = () => card('🏢 Sociedades',
                e('div', null,
                    e('div', { style: { marginBottom: '20px' } },
                        e('div', { className: 'form-label', style: { marginBottom: '8px' } }, 'Nueva Sociedad'),
                        e('div', { style: { display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', marginBottom: '8px' } },
                            e('input', { type: 'text', className: 'form-input', placeholder: 'Nombre completo', value: newSoc.nombre, onChange: ev => setNewSoc(s => ({ ...s, nombre: ev.target.value })) }),
                            e('input', { type: 'text', className: 'form-input', placeholder: 'Cód (3)', maxLength: 3, value: newSoc.codigo, onChange: ev => setNewSoc(s => ({ ...s, codigo: ev.target.value.toUpperCase() })), style: { width: '80px', fontFamily: 'IBM Plex Mono,monospace', fontWeight: '700' } }),
                            e('input', { type: 'text', className: 'form-input', placeholder: 'País', value: newSoc.pais, onChange: ev => setNewSoc(s => ({ ...s, pais: ev.target.value })), style: { width: '110px' } })
                        ),
                        newSoc.codigo.length === 3 && (state.sociedades || []).some(s => s.codigo === newSoc.codigo) ? e('div', { style: { color: 'var(--accent-red)', fontSize: '13px', marginBottom: '8px' } }, '⚠️ Código "' + newSoc.codigo + '" ya existe.') : null,
                        e('button', { className: 'button button-success', onClick: () => { if ((state.sociedades||[]).some(s=>s.codigo===newSoc.codigo)){showToast('Código duplicado','error');return;} act(()=>dataManager.createSociedad(newSoc),'Sociedad añadida').then(()=>setNewSoc({nombre:'',codigo:'',pais:''})); }, disabled: loading||!newSoc.nombre.trim()||newSoc.codigo.length!==3||!newSoc.pais.trim(), style:{width:'100%'} }, '+ Añadir Sociedad')
                    ),
                    state.sociedades.length === 0 ? e('div', {style:{color:'var(--text-secondary)',textAlign:'center',padding:'20px'}},'No hay sociedades') :
                    state.sociedades.map(s => {
                        const isEditing = editingSocId === s.id;
                        return e('div', { key: s.id, style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: s.activo ? 'var(--bg-primary)' : 'rgba(239,68,68,.05)', borderRadius: '8px', marginBottom: '6px', opacity: s.activo ? 1 : 0.6 } },
                            e('span', { style: { fontFamily: 'IBM Plex Mono,monospace', fontSize: '12px', fontWeight: '700', color: 'var(--accent-purple)', minWidth: '40px' } }, s.codigo),
                            isEditing ? e('div', { style: { flex: 1, display: 'flex', gap: '8px' } },
                                e('input', { type: 'text', className: 'form-input', value: editingSocData.nombre||'', onChange: ev=>setEditingSocData(d=>({...d,nombre:ev.target.value})), style:{flex:1,padding:'6px 10px',fontSize:'14px'} }),
                                e('input', { type: 'text', className: 'form-input', maxLength:3, value: editingSocData.codigo||'', onChange: ev=>setEditingSocData(d=>({...d,codigo:ev.target.value.toUpperCase()})), style:{width:'70px',fontFamily:'IBM Plex Mono,monospace',fontWeight:'700',padding:'6px 10px',fontSize:'14px'} }),
                                e('input', { type: 'text', className: 'form-input', value: editingSocData.pais||'', onChange: ev=>setEditingSocData(d=>({...d,pais:ev.target.value})), style:{width:'100px',padding:'6px 10px',fontSize:'14px'} })
                            ) : e('div', { style: { flex: 1 } }, e('div', { style: { fontWeight: '600', fontSize: '14px' } }, s.nombre), e('div', { style: { fontSize: '12px', color: 'var(--text-secondary)' } }, s.pais)),
                            isEditing ? e('button', { className: 'button button-success', onClick: () => { const dup=editingSocData.codigo!==s.codigo&&(state.sociedades||[]).some(x=>x.codigo===editingSocData.codigo); if(dup){showToast('Código duplicado','error');return;} act(()=>dataManager.updateSociedad(s.id,editingSocData),'Actualizada').then(()=>setEditingSocId(null)); }, style:{padding:'6px 12px',fontSize:'12px'} }, '✓') :
                                e('button', { className: 'button button-secondary', onClick: ()=>{setEditingSocId(s.id);setEditingSocData({nombre:s.nombre,codigo:s.codigo,pais:s.pais});}, style:{padding:'6px 10px',fontSize:'12px'} }, '✏️'),
                            isEditing ? e('button', { className: 'button button-secondary', onClick: ()=>setEditingSocId(null), style:{padding:'6px 10px',fontSize:'12px'} }, '✕') :
                                e('button', { className: 'button '+(s.activo?'button-warning':'button-success'), onClick: ()=>act(()=>dataManager.toggleSociedad(s.id,s.activo),s.activo?'Desactivada':'Activada'), disabled:loading, style:{padding:'6px 10px',fontSize:'12px'} }, s.activo?'Desactivar':'Activar'),
                            !isEditing && e('button', { className: 'button button-danger', onClick: ()=>act(()=>dataManager.deleteSociedad(s.id),'Eliminada'), disabled:loading, style:{padding:'6px 10px',fontSize:'12px'} }, '🗑️')
                        );
                    })
                )
            );

            const renderProveedores = () => card('🚚 Proveedores',
                e('div', null,
                    e('div', { style: { marginBottom: '20px' } },
                        e('div', { className: 'form-label', style: { marginBottom: '8px' } }, 'Nuevo Proveedor'),
                        e('div', { className: 'form-row' },
                            e('div', { className: 'form-group' }, e('label', { className: 'form-label' }, 'Nombre *'), e('input', { type: 'text', className: 'form-input', placeholder: 'Ej: Telefónica', value: newProv.nombre, onChange: ev => setNewProv(s => ({ ...s, nombre: ev.target.value })) })),
                            e('div', { className: 'form-group' }, e('label', { className: 'form-label' }, 'Contacto'), e('input', { type: 'text', className: 'form-input', placeholder: 'Persona de contacto', value: newProv.contacto, onChange: ev => setNewProv(s => ({ ...s, contacto: ev.target.value })) }))
                        ),
                        e('div', { className: 'form-row' },
                            e('div', { className: 'form-group' }, e('label', { className: 'form-label' }, 'Email'), e('input', { type: 'email', className: 'form-input', placeholder: 'contacto@proveedor.com', value: newProv.email, onChange: ev => setNewProv(s => ({ ...s, email: ev.target.value })) })),
                            e('div', { className: 'form-group' }, e('label', { className: 'form-label' }, 'Teléfono'), e('input', { type: 'text', className: 'form-input', placeholder: '+34 600 000 000', value: newProv.telefono, onChange: ev => setNewProv(s => ({ ...s, telefono: ev.target.value })) }))
                        ),
                        e('button', { className: 'button button-success', onClick: () => act(()=>dataManager.createProveedor(newProv),'Proveedor añadido').then(()=>setNewProv({nombre:'',contacto:'',email:'',telefono:''})), disabled: loading||!newProv.nombre.trim(), style:{width:'100%'} }, '+ Añadir Proveedor')
                    ),
                    (!state.proveedores || state.proveedores.length === 0) ? e('div', {style:{color:'var(--text-secondary)',textAlign:'center',padding:'20px'}},'No hay proveedores') :
                    (state.proveedores||[]).map(p => {
                        const isEditing = editingProvId === p.id;
                        return e('div', { key: p.id, style: { background: 'var(--bg-primary)', borderRadius: '8px', padding: '12px 14px', marginBottom: '8px' } },
                            isEditing ? e('div', null,
                                e('div', { className: 'form-row' },
                                    e('div', { className: 'form-group' }, e('label', { className: 'form-label' }, 'Nombre'), e('input', { type: 'text', className: 'form-input', value: editingProvData.nombre||'', onChange: ev=>setEditingProvData(d=>({...d,nombre:ev.target.value})) })),
                                    e('div', { className: 'form-group' }, e('label', { className: 'form-label' }, 'Contacto'), e('input', { type: 'text', className: 'form-input', value: editingProvData.contacto||'', onChange: ev=>setEditingProvData(d=>({...d,contacto:ev.target.value})) }))
                                ),
                                e('div', { className: 'form-row' },
                                    e('div', { className: 'form-group' }, e('label', { className: 'form-label' }, 'Email'), e('input', { type: 'email', className: 'form-input', value: editingProvData.email||'', onChange: ev=>setEditingProvData(d=>({...d,email:ev.target.value})) })),
                                    e('div', { className: 'form-group' }, e('label', { className: 'form-label' }, 'Teléfono'), e('input', { type: 'text', className: 'form-input', value: editingProvData.telefono||'', onChange: ev=>setEditingProvData(d=>({...d,telefono:ev.target.value})) }))
                                ),
                                e('div', { style: { display: 'flex', gap: '8px' } },
                                    e('button', { className: 'button button-success', onClick: ()=>act(()=>dataManager.updateProveedor(p.id,editingProvData),'Actualizado').then(()=>setEditingProvId(null)), style:{padding:'8px 16px',fontSize:'13px'} }, '✓ Guardar'),
                                    e('button', { className: 'button button-secondary', onClick: ()=>setEditingProvId(null), style:{padding:'8px 12px',fontSize:'13px'} }, '✕ Cancelar')
                                )
                            ) : e('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
                                e('div', { style: { flex: 1 } },
                                    e('div', { style: { fontWeight: '600', fontSize: '14px' } }, p.nombre),
                                    e('div', { style: { fontSize: '12px', color: 'var(--text-secondary)' } }, [p.contacto, p.email, p.telefono].filter(Boolean).join(' · '))
                                ),
                                e('button', { className: 'button button-secondary', onClick: ()=>{setEditingProvId(p.id);setEditingProvData({nombre:p.nombre,contacto:p.contacto,email:p.email,telefono:p.telefono});}, style:{padding:'6px 10px',fontSize:'12px'} }, '✏️'),
                                e('button', { className: 'button button-danger', onClick: ()=>act(()=>dataManager.deleteProveedor(p.id),'Eliminado'), disabled:loading, style:{padding:'6px 10px',fontSize:'12px'} }, '🗑️')
                            )
                        );
                    })
                )
            );

            const renderPacks = () => card('🎒 Packs de Incorporación',
                e('div', null,
                    e('div', { style: { marginBottom: '24px' } },
                        e('div', { className: 'form-label', style: { marginBottom: '8px' } }, 'Nuevo Pack'),
                        e('div', { className: 'form-row' },
                            e('div', { className: 'form-group' }, e('label', { className: 'form-label' }, 'Nombre *'), e('input', { type: 'text', className: 'form-input', placeholder: 'Ej: Usuario Estándar', value: newPack.nombre, onChange: ev => setNewPack(p => ({ ...p, nombre: ev.target.value })) })),
                            e('div', { className: 'form-group' }, e('label', { className: 'form-label' }, 'Descripción'), e('input', { type: 'text', className: 'form-input', placeholder: 'Ej: iPhone 16e + HP ProBook G11', value: newPack.descripcion, onChange: ev => setNewPack(p => ({ ...p, descripcion: ev.target.value })) }))
                        ),
                        e('div', { style: { background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '12px', marginBottom: '10px' } },
                            e('div', { className: 'form-label', style: { marginBottom: '8px' } }, 'Equipos del pack'),
                            e('div', { style: { display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' } },
                                e('select', { className: 'form-select', value: newPackEquipo.tipo, onChange: ev => setNewPackEquipo(p => ({ ...p, tipo: ev.target.value, modelo: '' })), style: { flex: 1 } },
                                    e('option', { value: '' }, '-- Tipo --'),
                                    Object.keys(state.catalogoTipos || {}).filter(t => state.catalogoTipos[t].llevaEtiqueta).map(t => e('option', { key: t, value: t }, t))
                                ),
                                e('select', { className: 'form-select', value: newPackEquipo.modelo, onChange: ev => setNewPackEquipo(p => ({ ...p, modelo: ev.target.value })), disabled: !newPackEquipo.tipo, style: { flex: 1 } },
                                    e('option', { value: '' }, '-- Modelo --'),
                                    (state.catalogo[newPackEquipo.tipo] || []).map(m => e('option', { key: m, value: m }, m))
                                ),
                                e('button', { type: 'button', className: 'button button-success', onClick: () => {
                                    if (!newPackEquipo.tipo || !newPackEquipo.modelo) return;
                                    setNewPack(p => ({ ...p, equipos: p.equipos.concat([{ tipo: newPackEquipo.tipo, modelo: newPackEquipo.modelo }]) }));
                                    setNewPackEquipo({ tipo: '', modelo: '' });
                                }, disabled: !newPackEquipo.tipo || !newPackEquipo.modelo, style: { padding: '10px 16px' } }, '+ Añadir')
                            ),
                            newPack.equipos.length > 0 ? e('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
                                newPack.equipos.map((eq, idx) => e('div', { key: idx, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg-primary)', borderRadius: '6px', fontSize: '13px' } },
                                    e('span', null, eq.tipo + ' · ' + eq.modelo),
                                    e('button', { type: 'button', style: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-red)', fontSize: '16px' }, onClick: () => setNewPack(p => ({ ...p, equipos: p.equipos.filter((_, i) => i !== idx) })) }, '×')
                                ))
                            ) : e('div', { style: { color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '8px' } }, 'Añade al menos un equipo')
                        ),
                        e('button', { className: 'button button-success', onClick: () => { PacksManager.create(newPack); refreshPacks(); setNewPack({ nombre: '', descripcion: '', equipos: [] }); showToast('Pack creado', 'success'); }, disabled: !newPack.nombre.trim() || newPack.equipos.length === 0, style: { width: '100%' } }, '+ Crear Pack')
                    ),
                    packs.length === 0 ? e('div', { style: { color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' } }, 'No hay packs. Crea el primero arriba.') :
                    packs.map(pack => e('div', { key: pack.id, style: { background: 'var(--bg-primary)', borderRadius: '10px', padding: '16px', marginBottom: '12px', border: '1px solid var(--border)' } },
                        e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' } },
                            e('div', null,
                                e('div', { style: { fontWeight: '700', fontSize: '15px' } }, '🎒 ' + pack.nombre),
                                pack.descripcion && e('div', { style: { fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' } }, pack.descripcion)
                            ),
                            e('button', { className: 'button button-danger', onClick: () => { PacksManager.delete(pack.id); refreshPacks(); showToast('Pack eliminado', 'success'); }, style: { padding: '6px 10px', fontSize: '12px' } }, '🗑️')
                        ),
                        e('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
                            (pack.equipos || []).map((eq, idx) => e('div', { key: idx, style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'var(--bg-tertiary)', borderRadius: '6px', fontSize: '13px' } },
                                e('span', { style: { width: '20px', height: '20px', background: 'var(--accent-blue)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: 'white', flexShrink: 0 } }, idx + 1),
                                e('span', { style: { fontWeight: '500' } }, eq.tipo),
                                e('span', { style: { color: 'var(--text-secondary)' } }, '·'),
                                e('span', { style: { color: 'var(--accent-blue)' } }, eq.modelo)
                            ))
                        )
                    ))
                )
            );

            return e('div', null,
                e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' } },
                    e('h2', { style: { fontSize: '24px', fontWeight: '700' } }, T().adminPanel)
                ),
                e('div', { style: { display: 'flex', gap: '20px', flexWrap: 'wrap' } },
                    e('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '190px' } },
                        // Grupo: Infraestructura
                        e('button', { onClick: () => toggleGroup('infraestructura'), style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', width: '100%', borderRadius: '6px' },
                            onMouseEnter: ev => ev.currentTarget.style.background = 'var(--bg-primary)',
                            onMouseLeave: ev => ev.currentTarget.style.background = 'none'
                        }, e('span', null, T().infraGroup), e('span', null, openGroups.infraestructura ? '▾' : '▸')),
                        openGroups.infraestructura && e('div', { style: { display: 'flex', flexDirection: 'column', gap: '3px', paddingLeft: '10px', marginBottom: '4px', borderLeft: '2px solid rgba(168,85,247,.3)' } },
                            sectionBtn('ubicaciones', T().locations, '📍'),
                            sectionBtn('sociedades', T().societies, '🏢')
                        ),
                        // Grupo: Catálogo
                        e('button', { onClick: () => toggleGroup('catalogo'), style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', width: '100%', borderRadius: '6px' },
                            onMouseEnter: ev => ev.currentTarget.style.background = 'var(--bg-primary)',
                            onMouseLeave: ev => ev.currentTarget.style.background = 'none'
                        }, e('span', null, '📦 Catálogo'), e('span', null, openGroups.catalogo ? '▾' : '▸')),
                        openGroups.catalogo && e('div', { style: { display: 'flex', flexDirection: 'column', gap: '3px', paddingLeft: '10px', marginBottom: '4px', borderLeft: '2px solid rgba(168,85,247,.3)' } },
                            isAdmin && sectionBtn('proveedores', T().suppliers, '🚚'),
                            sectionBtn('catalogo', T().catalog, '📦'),
                            isAdmin && sectionBtn('packs', T().packs, '🎒')
                        ),
                        // Grupo: Usuarios — solo admins
                        isAdmin && e('button', { onClick: () => toggleGroup('usuarios'), style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', width: '100%', borderRadius: '6px' },
                            onMouseEnter: ev => ev.currentTarget.style.background = 'var(--bg-primary)',
                            onMouseLeave: ev => ev.currentTarget.style.background = 'none'
                        }, e('span', null, T().usersGroup), e('span', null, openGroups.usuarios ? '▾' : '▸')),
                        isAdmin && openGroups.usuarios && e('div', { style: { display: 'flex', flexDirection: 'column', gap: '3px', paddingLeft: '10px', marginBottom: '4px', borderLeft: '2px solid rgba(168,85,247,.3)' } },
                            sectionBtn('tecnicos', T().technicians, '👤'),
                            sectionBtn('admins', T().administrators, '🛡️')
                        ),
                        // Grupo: Sistema — solo admins
                        isAdmin && e('button', { onClick: () => toggleGroup('sistema'), style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', width: '100%', borderRadius: '6px' },
                            onMouseEnter: ev => ev.currentTarget.style.background = 'var(--bg-primary)',
                            onMouseLeave: ev => ev.currentTarget.style.background = 'none'
                        }, e('span', null, T().systemGroup), e('span', null, openGroups.sistema ? '▾' : '▸')),
                        isAdmin && openGroups.sistema && e('div', { style: { display: 'flex', flexDirection: 'column', gap: '3px', paddingLeft: '10px', borderLeft: '2px solid rgba(168,85,247,.3)' } },
                            sectionBtn('ajustes', T().settings, '⚙️'),
                            sectionBtn('exportar', T().exportAudit, '📊'),
                            sectionBtn('log', T().actionLog, '📋')
                        )
                    ),
                    e('div', { style: { flex: 1, minWidth: '300px' } },
                        activeSection === 'ubicaciones' && renderUbicaciones(),
                        activeSection === 'sociedades' && renderSociedades(),
                        activeSection === 'proveedores' && renderProveedores(),
                        activeSection === 'packs' && renderPacks(),
                        activeSection === 'catalogo' && renderCatalogo(),
                        activeSection === 'tecnicos' && renderTecnicos(),
                        activeSection === 'admins' && renderAdmins(),
                        activeSection === 'ajustes' && renderAjustes(),
                        activeSection === 'exportar' && renderExportar(),
                        activeSection === 'log' && e('div', { style: { background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' } },
                            e('div', { style: { padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: '700', fontSize: '16px' } }, '📋 Log de Acciones'),
                            e('div', { style: { padding: '20px' } },
                                e('div', { style: { display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' } },
                                    e('select', { className: 'filter-select', style: { flex: 1 }, defaultValue: 'all', onChange: ev => { window._logTecnico = ev.target.value; } },
                                        e('option', { value: 'all' }, 'Todos los técnicos'),
                                        state.technicians.map(t => e('option', { key: t.id, value: t.nombre }, t.nombre))
                                    ),
                                    e('select', { className: 'filter-select', defaultValue: 'all', onChange: ev => { window._logTipo = ev.target.value; } },
                                        e('option', { value: 'all' }, 'Todos los tipos'),
                                        ['Entrada', 'Salida', 'Asignacion', 'Prestamo', 'Devolucion', 'CambioEstado'].map(t => e('option', { key: t, value: t }, t))
                                    )
                                ),
                                e('div', { style: { maxHeight: '500px', overflowY: 'auto' } },
                                    (function() {
                                        const logTec = window._logTecnico || 'all';
                                        const logTip = window._logTipo || 'all';
                                        return state.history
                                            .filter(h => (logTec === 'all' || h.tecnico === logTec) && (logTip === 'all' || h.tipo === logTip))
                                            .slice(0, 200)
                                            .map(h => e('div', { key: h.id, style: { display: 'flex', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' } },
                                                e('span', { style: { fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', minWidth: '120px', fontFamily: 'IBM Plex Mono,monospace' } }, new Date(h.fecha).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })),
                                                e('span', { className: 'movement-badge ' + h.tipo, style: { minWidth: '80px', textAlign: 'center' } }, h.tipo),
                                                e('span', { style: { flex: 1, fontSize: '13px', fontWeight: '500' } }, h.producto),
                                                h.idEtiqueta ? e('span', { style: { fontSize: '11px', color: 'var(--accent-blue)', fontFamily: 'IBM Plex Mono,monospace' } }, h.idEtiqueta) : null,
                                                e('span', { style: { fontSize: '12px', color: 'var(--accent-green)' } }, h.tecnico || '-'),
                                                h.usuario ? e('span', { style: { fontSize: '12px', color: 'var(--text-secondary)' } }, '→ ' + h.usuario) : null
                                            ));
                                    })()
                                )
                            )
                        )
                    )
                )

            );
        }

export default AdminPanel;
