import React, { useEffect, useRef, useState } from 'react';
import { T } from '../../lib/i18n';
import { showToast } from '../feedback/toast';
import { exportAssignmentToPDF } from '../../services/export/exportService';
import { startBarcodeScanner } from '../../services/scanner/scannerService';
import { PacksManager } from '../../services/storage/packsManager';
import { getDataManager } from '../../services/runtime';
import ProductsGrid from '../../features/assignments/ProductsGrid';

const e = React.createElement;

        function FormModal({ state, modalType, selectedItem, onClose, onRefresh }) {
            const dataManager = getDataManager();
            const [loading, setLoading] = useState(false);
            const deriveTipo = function() {
                if (!selectedItem) return '';
                var parts = (selectedItem.nombre || '').split(' - ');
                return parts[0] || '';
            };
            const deriveModelo = function() {
                if (!selectedItem) return '';
                var parts = (selectedItem.nombre || '').split(' - ');
                return parts.slice(1).join(' - ') || '';
            };
            const [formData, setFormData] = useState({
                tipo: deriveTipo(),
                modelo: deriveModelo(),
                tipoNuevo: '',
                modeloNuevo: '',
                barcode: (selectedItem && modalType !== 'duplicar') ? selectedItem.barcode : '',
                stock: selectedItem ? String(selectedItem.stock) : '0',
                stockMinimo: selectedItem ? String(selectedItem.stockMinimo) : String(state.stockMinimoDefault || 2),
                numSerie: '',
                ubicacion: selectedItem ? (selectedItem.ubicacion || '') : '',
                estado: selectedItem ? (selectedItem.estado || 'Nuevo') : 'Nuevo',
                cantidad: '1',
                ticket: '',
                usuario: '',
                emailUsuario: '',
                nombreEmpleado: '',
                emailEmpleado: '',
                departamento: '',
                puesto: '',
                fechaIncorporacion: new Date().toISOString().split('T')[0],
                observaciones: '',
                esPrestamo: modalType === 'nuevo-prestamo',
                nombreTecnico: '',
                emailTecnico: '',
                showAddTipo: false,
                showAddModelo: false
            });
            const [signature, setSignature] = useState(null);
            const [userSearchQuery, setUserSearchQuery] = useState('');
            const [userSearchResults, setUserSearchResults] = useState([]);
            const [userSearchLoading, setUserSearchLoading] = useState(false);
            const [salidaUserQuery, setSalidaUserQuery] = useState('');
            const [salidaUserResults, setSalidaUserResults] = useState([]);
            const [salidaUserLoading, setSalidaUserLoading] = useState(false);
            const [selectedProducts, setSelectedProducts] = useState([]);
            const [selectedEquipos, setSelectedEquipos] = useState([]);
            const [equipoInput, setEquipoInput] = useState('');
            const [equipoError, setEquipoError] = useState('');
            const [barcodeInput, setBarcodeInput] = useState('');
            const [barcodeError, setBarcodeError] = useState('');
            const [returnSelections, setReturnSelections] = useState({});
            const [savingCatalog, setSavingCatalog] = useState(false);
            // Baja empleado
            const [bajaQuery, setBajaQuery] = useState('');
            const [bajaResults, setBajaResults] = useState([]);
            const [bajaSelected, setBajaSelected] = useState(null);
            const [bajaSelections, setBajaSelections] = useState({});
            const canvasRef = useRef(null);
            const searchTimeoutRef = useRef(null);
            const salidaSearchRef = useRef(null);
            const overlayRef = useRef(null);
            const mouseDownOnOverlay = useRef(false);
            const isDrawingRef = useRef(false);
            const lastPosRef = useRef(null);

            const tecnicoActual = state.user ? state.user.name : '';
            const upd = function(field, value) { setFormData(function(prev) { var n = Object.assign({}, prev); n[field] = value; return n; }); };

            // Canvas
            const getCanvasPos = function(ev) {
                const canvas = canvasRef.current;
                if (!canvas) return { x: 0, y: 0 };
                const rect = canvas.getBoundingClientRect();
                const sx = canvas.width / rect.width;
                const sy = canvas.height / rect.height;
                const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
                const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
                return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
            };

            const onCanvasDownRef = useRef(function(ev) {
                ev.preventDefault();
                isDrawingRef.current = true;
                lastPosRef.current = getCanvasPos(ev);
            });
            const onCanvasUpRef = useRef(function(ev) {
                if (ev) ev.preventDefault();
                isDrawingRef.current = false;
                lastPosRef.current = null;
                if (canvasRef.current) setSignature(canvasRef.current.toDataURL());
            });
            const onCanvasMoveRef = useRef(function(ev) {
                ev.preventDefault();
                if (!isDrawingRef.current || !lastPosRef.current || !canvasRef.current) return;
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                const pos = getCanvasPos(ev);
                ctx.beginPath();
                ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
                ctx.lineTo(pos.x, pos.y);
                ctx.strokeStyle = '#58a6ff';
                ctx.lineWidth = 2.5;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.stroke();
                lastPosRef.current = pos;
            });

            const onCanvasDown = function(ev) { isDrawingRef.current = true; lastPosRef.current = getCanvasPos(ev); };
            const onCanvasMove = function(ev) {
                if (!isDrawingRef.current || !lastPosRef.current || !canvasRef.current) return;
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                const pos = getCanvasPos(ev);
                ctx.beginPath();
                ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
                ctx.lineTo(pos.x, pos.y);
                ctx.strokeStyle = '#58a6ff';
                ctx.lineWidth = 2.5;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.stroke();
                lastPosRef.current = pos;
            };
            const onCanvasUp = function() {
                isDrawingRef.current = false;
                lastPosRef.current = null;
                if (canvasRef.current) setSignature(canvasRef.current.toDataURL());
            };
            const clearSignature = function() {
                if (canvasRef.current) {
                    canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                }
                setSignature(null);
            };

            useEffect(function() {
                if (canvasRef.current) {
                    const canvas = canvasRef.current;
                    // Solo inicializar dimensiones si no están ya establecidas
                    if (!canvas.width || canvas.width !== (canvas.offsetWidth || 600)) {
                        canvas.width = canvas.offsetWidth || 600;
                        canvas.height = 200;
                    }
                    const opts = { passive: false };
                    canvas.addEventListener('touchstart', onCanvasDownRef.current, opts);
                    canvas.addEventListener('touchmove', onCanvasMoveRef.current, opts);
                    canvas.addEventListener('touchend', onCanvasUpRef.current, opts);
                    return function() {
                        canvas.removeEventListener('touchstart', onCanvasDownRef.current, opts);
                        canvas.removeEventListener('touchmove', onCanvasMoveRef.current, opts);
                        canvas.removeEventListener('touchend', onCanvasUpRef.current, opts);
                    };
                }
            }, []); // [] = solo ejecutar al montar, nunca más

            // Búsqueda AD asignación
            const handleUserSearch = function(query) {
                setUserSearchQuery(query);
                if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                if (!query || query.length < 2) { setUserSearchResults([]); return; }
                setUserSearchLoading(true);
                searchTimeoutRef.current = setTimeout(async function() {
                    try {
                        const results = await dataManager.searchUsers(query);
                        setUserSearchResults(results);
                    } catch(err) { setUserSearchResults([]); }
                    finally { setUserSearchLoading(false); }
                }, 400);
            };
            const selectUser = function(user) {
                setFormData(function(prev) {
                    return Object.assign({}, prev, { nombreEmpleado: user.displayName || '', emailEmpleado: user.mail || '', departamento: user.department || '', puesto: user.jobTitle || '' });
                });
                setUserSearchQuery(''); setUserSearchResults([]);
            };

            // Búsqueda AD salida
            const handleSalidaSearch = function(query) {
                setSalidaUserQuery(query);
                if (salidaSearchRef.current) clearTimeout(salidaSearchRef.current);
                if (!query || query.length < 2) { setSalidaUserResults([]); return; }
                setSalidaUserLoading(true);
                salidaSearchRef.current = setTimeout(async function() {
                    try {
                        const results = await dataManager.searchUsers(query);
                        setSalidaUserResults(results);
                    } catch(err) { setSalidaUserResults([]); }
                    finally { setSalidaUserLoading(false); }
                }, 400);
            };
            const selectSalidaUser = function(user) {
                setFormData(function(prev) {
                    return Object.assign({}, prev, { usuario: user.displayName || '', emailUsuario: user.mail || '' });
                });
                setSalidaUserQuery(''); setSalidaUserResults([]);
            };

            // Añadir producto
            const addProductByBarcode = function(barcode) {
                if (!barcode) return;
                const item = state.inventory.find(function(i) { return i.barcode === barcode; });
                if (!item) { setBarcodeError('Producto no encontrado: ' + barcode); return; }
                if (item.stock <= 0) { setBarcodeError('Sin stock: ' + item.nombre); return; }
                if (selectedProducts.find(function(p) { return p.barcode === barcode; })) { setBarcodeError('Producto ya añadido'); return; }
                setSelectedProducts(function(prev) { return prev.concat([{ nombre: item.nombre, barcode: item.barcode, id: item.id, categoria: item.categoria }]); });
                setBarcodeInput(''); setBarcodeError('');
                showToast('Añadido: ' + item.nombre, 'success');
            };

            const genBarcode = function() {
                // crypto.randomUUID garantiza unicidad sin colisiones entre dispositivos simultáneos
                const unique = crypto.randomUUID().replace(/-/g, '').toUpperCase().slice(0, 10);
                upd('barcode', 'SL' + unique);
            };

            // Guardar catálogo
            const saveTipoNuevo = async function() {
                if (!formData.tipoNuevo.trim()) return;
                setSavingCatalog(true);
                try {
                    await dataManager.addToCatalog(formData.tipoNuevo.trim(), '');
                    showToast('Tipo añadido al catálogo', 'success');
                    upd('tipo', formData.tipoNuevo.trim());
                    upd('tipoNuevo', '');
                    upd('showAddTipo', false);
                    await onRefresh();
                } catch(err) { showToast('Error guardando tipo', 'error'); }
                finally { setSavingCatalog(false); }
            };
            const saveModeloNuevo = async function() {
                if (!formData.tipo || !formData.modeloNuevo.trim()) return;
                setSavingCatalog(true);
                try {
                    await dataManager.addToCatalog(formData.tipo, formData.modeloNuevo.trim());
                    showToast('Modelo añadido', 'success');
                    upd('modelo', formData.modeloNuevo.trim());
                    upd('modeloNuevo', '');
                    upd('showAddModelo', false);
                    await onRefresh();
                } catch(err) { showToast('Error guardando modelo', 'error'); }
                finally { setSavingCatalog(false); }
            };

            // Submit
            const handleSubmit = async function() {
                setLoading(true);
                try {
                    const nombreProducto = (formData.tipo && formData.modelo) ? (formData.tipo + ' - ' + formData.modelo) : (formData.tipo || '');

                    if (modalType === 'entrada' && !selectedItem) {
                        if (!formData.tipo || !formData.modelo) { showToast('Selecciona tipo y modelo', 'error'); setLoading(false); return; }
                        if (!formData.ubicacion) { showToast('Selecciona una ubicación', 'error'); setLoading(false); return; }
                        // Detectar si ya existe un producto con este tipo+modelo
                        const productoExistente = state.inventory.find(function(item) { return item.nombre === nombreProducto; });
                        if (productoExistente) {
                            const addCant = parseInt(formData.stock) || 1;
                            const newStock = productoExistente.stock + addCant;
                            await dataManager.updateInventoryItem(productoExistente.id, { Stock: newStock });
                            await dataManager.addToHistory({ tipo: 'Entrada', producto: nombreProducto, cantidad: addCant, ticket: '', usuario: '', tecnico: tecnicoActual, firma: signature || '' });
                            showToast('Stock actualizado: ' + newStock + ' uds de ' + nombreProducto, 'success');
                        } else {
                            if (!formData.barcode.trim()) { showToast('El código de barras es obligatorio', 'error'); setLoading(false); return; }
                            const exists = await dataManager.checkBarcodeExists(formData.barcode);
                            if (exists) { showToast('El código de barras ya existe', 'error'); setLoading(false); return; }
                            await dataManager.createInventoryItem({ nombre: nombreProducto, categoria: formData.tipo, barcode: formData.barcode, stock: parseInt(formData.stock) || 0, stockMinimo: parseInt(formData.stockMinimo) || 0, ubicacion: formData.ubicacion, estado: formData.estado });
                            if (parseInt(formData.stock) > 0) {
                                await dataManager.addToHistory({ tipo: 'Entrada', producto: nombreProducto, cantidad: parseInt(formData.stock) || 1, ticket: '', usuario: '', tecnico: tecnicoActual, firma: signature || '' });
                            }
                            showToast('Producto creado: ' + nombreProducto, 'success');
                        }

                    } else if (modalType === 'entrada' && selectedItem) {
                        const addCant = parseInt(formData.cantidad) || 1;
                        const newStock = selectedItem.stock + addCant;
                        await dataManager.updateInventoryItem(selectedItem.id, { Stock: newStock });
                        await dataManager.addToHistory({ tipo: 'Entrada', producto: selectedItem.nombre, cantidad: addCant, ticket: formData.ticket || '', usuario: '', tecnico: tecnicoActual, firma: signature || '' });
                        showToast('+' + addCant + ' uds → Stock: ' + newStock, 'success');

                    } else if (modalType === 'salida') {
                        const cant = parseInt(formData.cantidad) || 1;
                        if (selectedItem.stock < cant) { showToast('Stock insuficiente (' + selectedItem.stock + ' disponibles)', 'error'); setLoading(false); return; }
                        if (!formData.usuario) { showToast('Selecciona el destinatario', 'error'); setLoading(false); return; }
                        await dataManager.updateInventoryItem(selectedItem.id, { Stock: selectedItem.stock - cant });
                        await dataManager.addToHistory({ tipo: 'Salida', producto: selectedItem.nombre, cantidad: cant, ticket: formData.ticket || '', usuario: formData.usuario, tecnico: tecnicoActual, firma: signature || '' });
                        showToast('Salida: ' + cant + ' x ' + selectedItem.nombre, 'success');

                    } else if (modalType === 'editar') {
                        if (!formData.tipo || !formData.modelo) { showToast('Selecciona tipo y modelo', 'error'); setLoading(false); return; }
                        if (!formData.ubicacion) { showToast('Selecciona una ubicación', 'error'); setLoading(false); return; }
                        await dataManager.updateInventoryItem(selectedItem.id, { Title: nombreProducto, Nombre: nombreProducto, Categoria: formData.tipo, CodigoBarras: formData.barcode, Stock: parseInt(formData.stock) || 0, StockMinimo: parseInt(formData.stockMinimo) || 0, Ubicacion: formData.ubicacion, Estado: formData.estado });
                        showToast('Producto actualizado: ' + nombreProducto, 'success');

                    } else if (modalType === 'duplicar') {
                        if (!formData.barcode.trim()) { showToast('Genera un nuevo código', 'error'); setLoading(false); return; }
                        if (!formData.ubicacion) { showToast('Selecciona una ubicación', 'error'); setLoading(false); return; }
                        const dupExists = await dataManager.checkBarcodeExists(formData.barcode);
                        if (dupExists) { showToast('El código ya existe', 'error'); setLoading(false); return; }
                        await dataManager.createInventoryItem({ nombre: nombreProducto, categoria: formData.tipo, barcode: formData.barcode, stock: parseInt(formData.stock) || 0, stockMinimo: parseInt(formData.stockMinimo) || 0, ubicacion: formData.ubicacion, estado: formData.estado });
                        showToast('Producto duplicado correctamente', 'success');

                    } else if (modalType === 'tecnico') {
                        if (!formData.nombreTecnico.trim() || !formData.emailTecnico.trim()) { showToast('Nombre y email son obligatorios', 'error'); setLoading(false); return; }
                        const codigo = 'TEC' + Date.now().toString().slice(-6);
                        await dataManager.createTechnician({ nombre: formData.nombreTecnico, codigo: codigo, email: formData.emailTecnico });
                        showToast('Técnico creado. Código: ' + codigo, 'success');

                    } else if (modalType === 'nueva-asignacion' || modalType === 'nuevo-prestamo') {
                        if (!formData.nombreEmpleado.trim()) { showToast('Selecciona un empleado', 'error'); setLoading(false); return; }
                        const totalItems = selectedProducts.length + selectedEquipos.length;
                        if (totalItems === 0) { showToast('Añade al menos un producto o equipo', 'error'); setLoading(false); return; }
                        const pendientes = selectedEquipos.filter(function(eq) { return eq.pendienteEscaneo; });
                        if (pendientes.length > 0) { showToast('Faltan ' + pendientes.length + ' equipo(s) por escanear', 'error'); setLoading(false); return; }
                        // Material fungible — descuenta stock
                        for (var i = 0; i < selectedProducts.length; i++) {
                            const prod = selectedProducts[i];
                            const invItem = state.inventory.find(function(inv) { return inv.id === prod.id; });
                            if (invItem) await dataManager.updateInventoryItem(invItem.id, { Stock: invItem.stock - 1 });
                            await dataManager.addToHistory({ tipo: formData.esPrestamo ? 'Prestamo' : 'Asignacion', producto: prod.nombre, cantidad: 1, ticket: '', usuario: formData.nombreEmpleado, tecnico: tecnicoActual, firma: signature || '' });
                        }
                        // Equipos etiquetados — cambia estado a Asignado
                        for (var j = 0; j < selectedEquipos.length; j++) {
                            const eq = selectedEquipos[j];
                            await dataManager.cambiarEstadoActivo(eq.id, 'Asignado', { asignadoA: formData.nombreEmpleado, emailAsignadoA: formData.emailEmpleado, fechaAsignacion: new Date().toISOString() });
                            await dataManager.addToHistory({ tipo: formData.esPrestamo ? 'Prestamo' : 'Asignacion', producto: eq.nombre, cantidad: 1, ticket: '', usuario: formData.nombreEmpleado, tecnico: tecnicoActual, firma: signature || '', idEtiqueta: eq.idEtiqueta });
                        }
                        // Crea la asignación con todos los items
                        const equiposParaAsignacion = selectedEquipos.map(function(eq) { return { nombre: eq.nombre, idEtiqueta: eq.idEtiqueta, esEquipo: true }; });
                        await dataManager.createAssignment({ nombreEmpleado: formData.nombreEmpleado, emailEmpleado: formData.emailEmpleado, departamento: formData.departamento, puesto: formData.puesto, fechaIncorporacion: formData.fechaIncorporacion, productosAsignados: selectedProducts, equiposAsignados: equiposParaAsignacion, firmaEmpleado: signature || '', tecnicoResponsable: tecnicoActual, observaciones: formData.observaciones, esPrestamo: formData.esPrestamo });
                        showToast(formData.esPrestamo ? 'Préstamo registrado' : 'Asignación creada', 'success');

                    } else if (modalType === 'devolver-material') {
                        const toReturn = (selectedItem.productosAsignados || []).filter(function(p) { return returnSelections[p.barcode || p.idEtiqueta]; });
                        if (toReturn.length === 0) { showToast('Selecciona al menos un producto', 'warning'); setLoading(false); return; }
                        await dataManager.returnMaterial(selectedItem.id, toReturn, selectedItem.productosAsignados || [], formData.observaciones || '', tecnicoActual, state.inventory, state.activos);
                        showToast('Devolución registrada: ' + toReturn.length + ' producto(s)', 'success');

                    } else if (modalType === 'baja-empleado') {
                        if (!bajaSelected) { showToast('Selecciona un empleado', 'error'); setLoading(false); return; }
                        const asignacionesActivas = (state.assignments || []).filter(function(a) { return a.emailEmpleado.toLowerCase() === bajaSelected.emailEmpleado.toLowerCase() && a.estado === 'Activo'; });
                        const todosItemsSubmit = asignacionesActivas.flatMap(function(a) { return (a.productosAsignados || []).map(function(p) { return Object.assign({}, p, { asignacionId: a.id, asignacion: a }); }); });
                        const toReturn = todosItemsSubmit.filter(function(p) { return bajaSelections[p.barcode || p.idEtiqueta]; });
                        if (todosItemsSubmit.length > 0 && toReturn.length === 0) { showToast('Selecciona al menos un item', 'warning'); setLoading(false); return; }
                        for (const asig of asignacionesActivas) {
                            const itemsDeAsig = toReturn.filter(function(p) { return p.asignacionId === asig.id; });
                            if (itemsDeAsig.length > 0) {
                                await dataManager.returnMaterial(asig.id, itemsDeAsig, asig.productosAsignados || [], formData.observaciones || ('Baja: ' + bajaSelected.nombreEmpleado), tecnicoActual, state.inventory, state.activos);
                            } else if (itemsDeAsig.length === 0 && todosItemsSubmit.filter(function(p){return p.asignacionId===asig.id;}).length === 0) {
                                await dataManager.updateAssignmentStatus(asig.id, 'Devuelto');
                            }
                        }
                        showToast('Baja procesada: ' + toReturn.length + ' item(s) devuelto(s)', 'success');
                    }

                    onClose();
                    await onRefresh();
                } catch(error) {
                    console.error('Error en formulario:', error);
                    showToast('Error: ' + (error.message || 'Error desconocido'), 'error');
                } finally { setLoading(false); }
            };

            // Helpers de render
            const catalogo = state.catalogo || {};
            const tiposDisponibles = Object.keys(catalogo);
            const modelosDisponibles = formData.tipo ? (catalogo[formData.tipo] || []) : [];

            const fld = function(label, input, required) {
                return e('div', { className: 'form-group' },
                    e('label', { className: 'form-label' }, label, required ? e('span', { className: 'required-asterisk' }, ' *') : null),
                    input
                );
            };
            const inp = function(field, placeholder, type) {
                return e('input', { type: type || 'text', className: 'form-input', value: formData[field], placeholder: placeholder || '', onChange: function(ev) { upd(field, ev.target.value); } });
            };
            const ubicacionSelect = function() {
                return e('select', { className: 'form-select', value: formData.ubicacion, onChange: function(ev) { upd('ubicacion', ev.target.value); } },
                    e('option', { value: '' }, '-- Selecciona ubicacion --'),
                    (state.ubicaciones || []).map(function(u) { return e('option', { key: u.id, value: u.nombre }, u.nombre); })
                );
            };
            const estadoSelect = function() {
                return e('select', { className: 'form-select', value: formData.estado, onChange: function(ev) { upd('estado', ev.target.value); } },
                    e('option', { value: 'Nuevo' }, 'Nuevo'),
                    e('option', { value: 'Usado' }, 'Usado')
                );
            };
            const tipoModeloFields = function() {
                return e('div', null,
                    fld('Tipo de Material',
                        e('div', null,
                            e('div', { style: { display: 'flex', gap: '8px' } },
                                e('select', { className: 'form-select', value: formData.tipo, style: { flex: 1 }, onChange: function(ev) { upd('tipo', ev.target.value); upd('modelo', ''); upd('showAddModelo', false); } },
                                    e('option', { value: '' }, '-- Selecciona tipo --'),
                                    tiposDisponibles.map(function(t) { return e('option', { key: t, value: t }, t); })
                                ),
                                state.isAdmin ? e('button', { type: 'button', className: 'button button-secondary', onClick: function() { upd('showAddTipo', !formData.showAddTipo); }, style: { padding: '10px 14px', fontSize: '18px' } }, formData.showAddTipo ? '✕' : '+') : null
                            ),
                            state.isAdmin && formData.showAddTipo ? e('div', { style: { display: 'flex', gap: '8px', marginTop: '8px' } },
                                e('input', { type: 'text', className: 'form-input', placeholder: 'Nombre del nuevo tipo...', value: formData.tipoNuevo, onChange: function(ev) { upd('tipoNuevo', ev.target.value); }, style: { flex: 1 } }),
                                e('button', { type: 'button', className: 'button button-success', onClick: saveTipoNuevo, disabled: savingCatalog || !formData.tipoNuevo.trim(), style: { padding: '10px 16px' } }, savingCatalog ? e('span', { className: 'loading-spinner' }) : '✓ Guardar')
                            ) : null
                        ), true
                    ),
                    formData.tipo ? fld('Modelo',
                        e('div', null,
                            e('div', { style: { display: 'flex', gap: '8px' } },
                                e('select', { className: 'form-select', value: formData.modelo, style: { flex: 1 }, onChange: function(ev) { upd('modelo', ev.target.value); } },
                                    e('option', { value: '' }, '-- Selecciona modelo --'),
                                    modelosDisponibles.map(function(m) { return e('option', { key: m, value: m }, m); })
                                ),
                                state.isAdmin ? e('button', { type: 'button', className: 'button button-secondary', onClick: function() { upd('showAddModelo', !formData.showAddModelo); }, style: { padding: '10px 14px', fontSize: '18px' } }, formData.showAddModelo ? '✕' : '+') : null
                            ),
                            state.isAdmin && formData.showAddModelo ? e('div', { style: { display: 'flex', gap: '8px', marginTop: '8px' } },
                                e('input', { type: 'text', className: 'form-input', placeholder: 'Nombre del nuevo modelo...', value: formData.modeloNuevo, onChange: function(ev) { upd('modeloNuevo', ev.target.value); }, style: { flex: 1 } }),
                                e('button', { type: 'button', className: 'button button-success', onClick: saveModeloNuevo, disabled: savingCatalog || !formData.modeloNuevo.trim(), style: { padding: '10px 16px' } }, savingCatalog ? e('span', { className: 'loading-spinner' }) : '✓ Guardar')
                            ) : null
                        ), true
                    ) : null
                );
            };
            const signatureBlock = function() {
                return e('div', { className: 'signature-container' },
                    e('div', { className: 'signature-label' }, '✍️ Firma'),
                    e('canvas', { ref: canvasRef, className: 'signature-canvas', onMouseDown: onCanvasDown, onMouseMove: onCanvasMove, onMouseUp: onCanvasUp, onMouseLeave: onCanvasUp, style: { cursor: 'crosshair', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' } }),
                    e('div', { className: 'signature-actions' },
                        e('button', { type: 'button', className: 'button button-secondary', onClick: clearSignature, style: { fontSize: '13px', padding: '8px 16px' } }, '🗑️ Limpiar'),
                        signature ? e('span', { style: { color: 'var(--accent-green)', fontSize: '13px', alignSelf: 'center' } }, '✓ Firma capturada') : null
                    )
                );
            };
            const barcodeField = function() {
                return fld('Codigo de Barras',
                    e('div', { style: { display: 'flex', gap: '8px' } },
                        e('input', { type: 'text', className: 'form-input', value: formData.barcode, placeholder: 'Escanea o escribe', onChange: function(ev) { upd('barcode', ev.target.value); }, style: { flex: 1 } }),
                        e('button', { type: 'button', className: 'button button-primary', onClick: function() { startBarcodeScanner(function(code) { upd('barcode', code); }); } }, '📷'),
                        e('button', { type: 'button', className: 'button button-secondary', onClick: genBarcode }, '⚡ Gen')
                    ), true
                );
            };
            const tecnicoBanner = function() {
                const esAdmin = state.isAdmin;
                return e('div', { className: 'info-banner green', style: { marginBottom: '16px' } },
                    esAdmin ? '🛡️ Admin: ' : '🔧 Técnico: ', e('strong', null, tecnicoActual)
                );
            };
            const adDropdown = function(results, loading2, onSelect) {
                if (!loading2 && results.length === 0) return null;
                return e('div', { className: 'user-search-dropdown' },
                    loading2 ? e('div', { style: { padding: '12px', color: 'var(--text-secondary)', fontSize: '14px' } }, '⏳ Buscando...') : null,
                    results.map(function(user) {
                        return e('div', { key: user.id, className: 'user-search-item', onClick: function() { onSelect(user); } },
                            e('div', { style: { fontWeight: '600', fontSize: '14px' } }, user.displayName),
                            e('div', { style: { fontSize: '12px', color: 'var(--text-secondary)' } }, user.mail),
                            (user.department || user.jobTitle) ? e('div', { style: { fontSize: '12px', color: 'var(--accent-blue)' } }, [user.department, user.jobTitle].filter(Boolean).join(' · ')) : null
                        );
                    })
                );
            };
            const productsGrid = function() {
                return e(ProductsGrid, { inventory: state.inventory, selectedProducts, onAdd: addProductByBarcode });
            };

            // Render body
            const renderBody = function() {
                // NUEVO PRODUCTO (consumible)
                if (modalType === 'entrada' && !selectedItem) {
                    return e('div', null,
                        tecnicoBanner(),
                        e('div', { className: 'info-banner blue', style: { marginBottom: '16px' } }, 'ℹ️ Usa esta entrada para ', e('strong', null, 'material consumible'), ': cables, ratones, auriculares, adaptadores... Para equipos con etiqueta (portátiles, iPads, etc.) usa la pestaña ', e('strong', null, '💻 Equipos'), '.'),
                        tipoModeloFields(),
                        barcodeField(),
                        fld('Cantidad recibida', e('input', { type: 'number', min: '1', className: 'form-input', placeholder: 'Nº de unidades', value: formData.stock, onChange: function(ev) { upd('stock', ev.target.value); } })),
                        (function() {
                            const productoExistente = state.inventory.find(function(item) { return item.nombre === (formData.tipo && formData.modelo ? formData.tipo + ' - ' + formData.modelo : ''); });
                            const cant = parseInt(formData.stock) || 0;
                            if (productoExistente && cant > 0) {
                                return e('div', { className: 'stock-result' }, '✓ Stock resultante: ', e('strong', null, productoExistente.stock + cant), ' uds (', productoExistente.stock, ' actuales + ', cant, ' nuevas)');
                            } else if (!productoExistente && cant > 0) {
                                return e('div', { className: 'stock-result' }, '✓ Se crearán ', e('strong', null, cant), ' unidades de este producto');
                            }
                            return null;
                        })(),
                        e('div', { className: 'form-row' },
                            fld('Ubicacion', ubicacionSelect(), true),
                            fld('Estado', estadoSelect())
                        )
                    );
                }
                // AÑADIR STOCK
                if (modalType === 'entrada' && selectedItem) {
                    return e('div', null,
                        tecnicoBanner(),
                        e('div', { style: { background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', marginBottom: '20px' } },
                            e('div', { style: { fontWeight: '700', fontSize: '18px', marginBottom: '8px' } }, selectedItem.nombre),
                            e('div', { style: { display: 'flex', gap: '24px', flexWrap: 'wrap' } },
                                e('span', null, 'Stock actual: ', e('strong', { style: { color: 'var(--accent-green)' } }, selectedItem.stock + ' uds')),
                                e('span', null, 'Codigo: ', e('strong', { style: { color: 'var(--accent-blue)', fontFamily: 'IBM Plex Mono,monospace' } }, selectedItem.barcode))
                            )
                        ),
                        e('div', { className: 'form-row' },
                            fld('Unidades a añadir', e('input', { type: 'number', min: '1', className: 'form-input', value: formData.cantidad, onChange: function(ev) { upd('cantidad', ev.target.value); } }), true),
                            fld('Ticket (opcional)', inp('ticket', 'Ej: INC-123456'))
                        ),
                        e('div', { className: 'stock-result' }, '✓ Stock resultante: ' + (selectedItem.stock + (parseInt(formData.cantidad) || 0)) + ' unidades'),
                        signatureBlock()
                    );
                }
                // SALIDA
                if (modalType === 'salida') {
                    return e('div', null,
                        tecnicoBanner(),
                        e('div', { style: { background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', marginBottom: '20px' } },
                            e('div', { style: { fontWeight: '700', fontSize: '18px', marginBottom: '8px' } }, selectedItem.nombre),
                            e('div', { style: { display: 'flex', gap: '24px', flexWrap: 'wrap' } },
                                e('span', null, 'Stock: ', e('strong', { style: { color: selectedItem.stock > 0 ? 'var(--accent-green)' : 'var(--accent-red)' } }, selectedItem.stock + ' uds')),
                                e('span', null, 'Categoría: ', e('strong', null, selectedItem.categoria))
                            )
                        ),
                        e('div', { className: 'form-row' },
                            fld('Cantidad', e('input', { type: 'number', min: '1', max: String(selectedItem.stock), className: 'form-input', value: formData.cantidad, onChange: function(ev) { upd('cantidad', ev.target.value); } }), true),
                            fld('Ticket', inp('ticket', 'Ej: INC-123456'))
                        ),
                        e('div', { className: 'form-group', style: { position: 'relative' } },
                            e('label', { className: 'form-label' }, 'Destinatario', e('span', { className: 'required-asterisk' }, ' *')),
                            e('input', { type: 'text', className: 'form-input', value: formData.usuario || salidaUserQuery, placeholder: 'Buscar empleado en Active Directory...', onChange: function(ev) { if (formData.usuario) setFormData(function(p) { return Object.assign({}, p, { usuario: '', emailUsuario: '' }); }); handleSalidaSearch(ev.target.value); } }),
                            formData.usuario ? e('div', { style: { marginTop: '6px', color: 'var(--accent-green)', fontSize: '13px' } }, '✓ ' + formData.usuario) : null,
                            adDropdown(salidaUserResults, salidaUserLoading, selectSalidaUser)
                        ),
                        signatureBlock()
                    );
                }
                // EDITAR
                if (modalType === 'editar') {
                    return e('div', null,
                        tipoModeloFields(),
                        barcodeField(),
                        e('div', { className: 'form-row' },
                            fld('Stock Actual', e('input', { type: 'number', min: '0', className: 'form-input', value: formData.stock, onChange: function(ev) { upd('stock', ev.target.value); } })),
                            fld('Stock Minimo', e('input', { type: 'number', min: '0', className: 'form-input', value: formData.stockMinimo, onChange: function(ev) { upd('stockMinimo', ev.target.value); } }))
                        ),
                        e('div', { className: 'form-row' },
                            fld('Ubicacion', ubicacionSelect(), true),
                            fld('Estado', estadoSelect())
                        )
                    );
                }
                // DUPLICAR
                if (modalType === 'duplicar') {
                    return e('div', null,
                        e('div', { className: 'info-banner blue' }, 'ℹ️ Nuevo producto basado en "', selectedItem.nombre, '". Asigna un código único.'),
                        tipoModeloFields(),
                        fld('Nuevo Codigo de Barras',
                            e('div', { style: { display: 'flex', gap: '8px' } },
                                e('input', { type: 'text', className: 'form-input', value: formData.barcode, placeholder: 'Nuevo código único', onChange: function(ev) { upd('barcode', ev.target.value); }, style: { flex: 1 } }),
                                e('button', { type: 'button', className: 'button button-primary', onClick: function() { startBarcodeScanner(function(code) { upd('barcode', code); }); } }, '📷'),
                                e('button', { type: 'button', className: 'button button-secondary', onClick: genBarcode }, '⚡ Gen')
                            ), true
                        ),
                        e('div', { className: 'form-row' },
                            fld('Stock', e('input', { type: 'number', min: '0', className: 'form-input', value: formData.stock, onChange: function(ev) { upd('stock', ev.target.value); } })),
                            fld('Stock Minimo', e('input', { type: 'number', min: '0', className: 'form-input', value: formData.stockMinimo, onChange: function(ev) { upd('stockMinimo', ev.target.value); } }))
                        ),
                        e('div', { className: 'form-row' },
                            fld('Ubicacion', ubicacionSelect(), true),
                            fld('Estado', estadoSelect())
                        )
                    );
                }
                // NUEVO TÉCNICO
                if (modalType === 'tecnico') {
                    return e('div', null,
                        e('div', { className: 'form-row' },
                            fld('Nombre completo', e('input', { type: 'text', className: 'form-input', value: formData.nombreTecnico, placeholder: 'Ej: Juan Garcia', onChange: function(ev) { upd('nombreTecnico', ev.target.value); } }), true),
                            fld('Email corporativo', e('input', { type: 'email', className: 'form-input', value: formData.emailTecnico, placeholder: 'juan.garcia@sanlucar.com', onChange: function(ev) { upd('emailTecnico', ev.target.value); } }), true)
                        ),
                        e('div', { className: 'info-banner blue' }, 'ℹ️ El código se generará automáticamente.')
                    );
                }
                // ASIGNACION / PRESTAMO
                if (modalType === 'nueva-asignacion' || modalType === 'nuevo-prestamo') {
                    // addEquipoById: busca en activos por ID de etiqueta
                    const addEquipoById = function(id) {
                        const idClean = (id || '').trim().toUpperCase();
                        if (!idClean) return;
                        const activo = (state.activos || []).find(function(a) { return a.idEtiqueta === idClean; });
                        if (!activo) { setEquipoError('ID no encontrado: ' + idClean); return; }
                        if (activo.estado !== 'Almacen') { setEquipoError('Equipo no disponible (estado: ' + activo.estado + ')'); return; }
                        if (selectedEquipos.find(function(e) { return e.idEtiqueta === idClean; })) { setEquipoError('Equipo ya añadido'); return; }
                        setSelectedEquipos(function(prev) { return prev.concat([{ id: activo.id, idEtiqueta: activo.idEtiqueta, nombre: activo.tipo + ' - ' + activo.modelo, tipo: activo.tipo, modelo: activo.modelo, esEquipo: true }]); });
                        setEquipoInput(''); setEquipoError('');
                    };
                    const availablePacks = PacksManager.getAll();
                    return e('div', null,
                        tecnicoBanner(),
                        formData.esPrestamo ? e('div', { className: 'info-banner orange' }, '⏱️ PRÉSTAMO: Este material debe ser devuelto hoy.') : null,
                        // Selector de pack
                        !formData.esPrestamo && availablePacks.length > 0 && e('div', { style: { background: 'rgba(88,166,255,.08)', border: '1px solid rgba(88,166,255,.3)', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' } },
                            e('div', { style: { fontWeight: '700', fontSize: '13px', color: 'var(--accent-blue)', marginBottom: '10px', textTransform: 'uppercase' } }, '🎒 Cargar Pack de Incorporación'),
                            e('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                                availablePacks.map(function(pack) {
                                    return e('button', { key: pack.id, type: 'button', className: 'button button-secondary', style: { fontSize: '13px' }, onClick: function() {
                                        setSelectedEquipos([]); setEquipoError('');
                                        const pendientes = (pack.equipos || []).map(function(eq) { return { id: null, idEtiqueta: '', nombre: eq.tipo + ' - ' + eq.modelo, tipo: eq.tipo, modelo: eq.modelo, esEquipo: true, pendienteEscaneo: true }; });
                                        setSelectedEquipos(pendientes);
                                        showToast('Pack cargado: ' + pack.nombre + ' — escanea los IDs', 'success');
                                    } }, '🎒 ' + pack.nombre + ' (' + (pack.equipos||[]).length + ')');
                                })
                            )
                        ),
                        e('div', { className: 'form-group', style: { position: 'relative' } },
                            e('label', { className: 'form-label' }, 'Empleado', e('span', { className: 'required-asterisk' }, ' *')),
                            e('input', { type: 'text', className: 'form-input', value: formData.nombreEmpleado || userSearchQuery, placeholder: 'Buscar empleado en Active Directory...', onChange: function(ev) { if (formData.nombreEmpleado) setFormData(function(p) { return Object.assign({}, p, { nombreEmpleado: '', emailEmpleado: '', departamento: '', puesto: '' }); }); handleUserSearch(ev.target.value); } }),
                            formData.nombreEmpleado ? e('div', { style: { marginTop: '6px', color: 'var(--accent-green)', fontSize: '13px' } }, '✓ ' + formData.nombreEmpleado + ' · ' + formData.emailEmpleado) : null,
                            adDropdown(userSearchResults, userSearchLoading, selectUser)
                        ),
                        formData.nombreEmpleado ? e('div', null,
                            e('div', { className: 'form-row' },
                                fld('Departamento', inp('departamento', 'Dpto.')),
                                fld('Puesto', inp('puesto', 'Cargo'))
                            ),
                            fld('Fecha incorporacion', e('input', { type: 'date', className: 'form-input', value: formData.fechaIncorporacion, onChange: function(ev) { upd('fechaIncorporacion', ev.target.value); } }))
                        ) : null,
                        // SECCIÓN 1: Equipos con etiqueta
                        e('div', { style: { marginBottom: '16px' } },
                            e('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' } },
                                e('div', { style: { flex: 1, height: '1px', background: 'var(--border)' } }),
                                e('span', { style: { fontSize: '12px', color: 'var(--accent-blue)', whiteSpace: 'nowrap', fontWeight: '700', textTransform: 'uppercase' } }, '💻 Equipos con etiqueta'),
                                e('div', { style: { flex: 1, height: '1px', background: 'var(--border)' } })
                            ),
                            e('div', { style: { display: 'flex', gap: '8px', marginBottom: '6px' } },
                                e('input', { type: 'text', className: 'form-input', value: equipoInput, placeholder: 'ID etiqueta (SLF-26-XXXXXXXX) — escribe o escanea QR', style: { flex: 1, fontFamily: 'IBM Plex Mono,monospace', textTransform: 'uppercase' }, onChange: function(ev) { setEquipoInput(ev.target.value.toUpperCase()); setEquipoError(''); }, onKeyDown: function(ev) { if (ev.key === 'Enter') { ev.preventDefault(); addEquipoById(equipoInput); } } }),
                                e('button', { type: 'button', className: 'button button-primary', onClick: function() { startBarcodeScanner(function(code) { addEquipoById(code); }); } }, '📷'),
                                e('button', { type: 'button', className: 'button button-success', onClick: function() { addEquipoById(equipoInput); } }, '+ Añadir')
                            ),
                            equipoError ? e('div', { style: { color: 'var(--accent-red)', fontSize: '13px', marginBottom: '6px' } }, '⚠️ ' + equipoError) : null,
                            selectedEquipos.length > 0 && e('div', { style: { background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '10px', marginBottom: '8px', border: '2px solid var(--accent-blue)' } },
                                selectedEquipos.map(function(eq, idx) {
                                    return e('div', { key: eq.idEtiqueta || ('pending-' + idx), className: 'product-row-assigned', style: eq.pendienteEscaneo ? { border: '1px dashed var(--accent-orange)', borderRadius: '6px', padding: '6px' } : {} },
                                        e('div', { style: { flex: 1 } },
                                            e('div', { style: { fontWeight: '600', marginBottom: '2px' } }, eq.nombre),
                                            eq.pendienteEscaneo ?
                                                e('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } },
                                                    e('input', { type: 'text', className: 'form-input', placeholder: 'Escanea o escribe el ID del equipo...', style: { flex: 1, padding: '4px 8px', fontSize: '13px', fontFamily: 'IBM Plex Mono,monospace', textTransform: 'uppercase' }, onChange: function(ev) {
                                                        const idClean = ev.target.value.toUpperCase();
                                                        if (idClean.length > 8) {
                                                            const activo = (state.activos || []).find(function(a) { return a.idEtiqueta === idClean; });
                                                            if (activo && activo.estado === 'Almacen') {
                                                                setSelectedEquipos(function(prev) { return prev.map(function(e, i) { return i === idx ? { id: activo.id, idEtiqueta: activo.idEtiqueta, nombre: activo.tipo + ' - ' + activo.modelo, tipo: activo.tipo, modelo: activo.modelo, esEquipo: true, pendienteEscaneo: false } : e; }); });
                                                                showToast('✓ ' + idClean + ' vinculado', 'success');
                                                            }
                                                        }
                                                    } }),
                                                    e('button', { type: 'button', className: 'button button-primary', style: { padding: '4px 8px', fontSize: '12px' }, onClick: function() { startBarcodeScanner(function(code) { const activo = (state.activos || []).find(function(a) { return a.idEtiqueta === code.toUpperCase(); }); if (activo && activo.estado === 'Almacen') { setSelectedEquipos(function(prev) { return prev.map(function(e, i) { return i === idx ? { id: activo.id, idEtiqueta: activo.idEtiqueta, nombre: activo.tipo + ' - ' + activo.modelo, tipo: activo.tipo, modelo: activo.modelo, esEquipo: true, pendienteEscaneo: false } : e; }); }); showToast('✓ ' + code + ' vinculado', 'success'); } else { showToast('ID no válido o no disponible', 'error'); } }); } }, '📷')
                                                ) :
                                                e('span', { style: { color: 'var(--accent-blue)', fontSize: '11px', fontFamily: 'IBM Plex Mono,monospace' } }, eq.idEtiqueta)
                                        ),
                                        e('button', { type: 'button', style: { background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '20px', padding: '0 4px' }, onClick: function() { setSelectedEquipos(function(prev) { return prev.filter(function(_, i) { return i !== idx; }); }); } }, '×')
                                    );
                                })
                            )
                        ),
                        // SECCIÓN 2: Material fungible
                        e('div', { style: { marginBottom: '8px' } },
                            e('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' } },
                                e('div', { style: { flex: 1, height: '1px', background: 'var(--border)' } }),
                                e('span', { style: { fontSize: '12px', color: 'var(--accent-green)', whiteSpace: 'nowrap', fontWeight: '700', textTransform: 'uppercase' } }, '📦 Material fungible (consumibles)'),
                                e('div', { style: { flex: 1, height: '1px', background: 'var(--border)' } })
                            ),
                            productsGrid()
                        ),
                        selectedProducts.length > 0 ? e('div', { style: { background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '12px', marginBottom: '16px', border: '2px solid var(--accent-green)' } },
                            e('div', { style: { fontWeight: '600', fontSize: '12px', color: 'var(--accent-green)', marginBottom: '8px', textTransform: 'uppercase' } }, '✓ ' + selectedProducts.length + ' consumible(s)'),
                            selectedProducts.map(function(prod, idx) {
                                return e('div', { key: prod.barcode, className: 'product-row-assigned' },
                                    e('div', null,
                                        e('span', { style: { fontWeight: '600', marginRight: '8px' } }, (idx + 1) + '. ' + prod.nombre),
                                        e('span', { style: { color: 'var(--accent-blue)', fontSize: '12px', fontFamily: 'IBM Plex Mono,monospace' } }, prod.barcode)
                                    ),
                                    e('button', { type: 'button', style: { background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '20px', padding: '0 4px' }, onClick: function() { setSelectedProducts(function(prev) { return prev.filter(function(p) { return p.barcode !== prod.barcode; }); }); } }, '×')
                                );
                            })
                        ) : null,
                        (selectedEquipos.length + selectedProducts.length) > 0 && e('div', { style: { padding: '10px 14px', background: 'rgba(88,166,255,.1)', border: '1px solid var(--accent-blue)', borderRadius: '8px', marginBottom: '12px', fontSize: '13px' } },
                            e('strong', null, selectedEquipos.length + selectedProducts.length), ' item(s) total — ',
                            e('span', { style: { color: 'var(--accent-blue)' } }, selectedEquipos.length + ' equipo(s)'),
                            ' + ',
                            e('span', { style: { color: 'var(--accent-green)' } }, selectedProducts.length + ' consumible(s)')
                        ),
                        fld('Observaciones', inp('observaciones', 'Opcional')),
                        signatureBlock()
                    );
                }
                // VER ASIGNACION
                if (modalType === 'ver-asignacion' && selectedItem) {
                    return e('div', null,
                        e('div', { style: { background: 'var(--bg-tertiary)', padding: '24px', borderRadius: '12px', marginBottom: '20px' } },
                            e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' } },
                                e('div', null,
                                    e('div', { style: { fontSize: '22px', fontWeight: '700' } }, selectedItem.nombreEmpleado),
                                    e('div', { style: { color: 'var(--text-secondary)', fontSize: '14px' } }, selectedItem.emailEmpleado)
                                ),
                                e('span', { style: { background: selectedItem.esPrestamo ? 'var(--accent-orange)' : 'var(--accent-blue)', color: 'white', padding: '6px 14px', borderRadius: '6px', fontWeight: '700', fontSize: '13px' } },
                                    selectedItem.esPrestamo ? '⏱️ PRESTAMO' : '📋 ASIGNACION'
                                )
                            ),
                            e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
                                [
                                    { label: 'Departamento', value: selectedItem.departamento },
                                    { label: 'Puesto', value: selectedItem.puesto },
                                    { label: 'Técnico IT', value: selectedItem.tecnicoResponsable },
                                    { label: 'Fecha', value: new Date(selectedItem.fechaAsignacion).toLocaleDateString('es-ES') },
                                    { label: 'Estado', value: selectedItem.estado }
                                ].map(function(info, idx) {
                                    return e('div', { key: idx },
                                        e('div', { style: { fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' } }, info.label),
                                        e('div', { style: { fontWeight: '600', fontSize: '14px' } }, info.value || '-')
                                    );
                                })
                            )
                        ),
                        e('div', { style: { marginBottom: '20px' } },
                            e('div', { style: { fontWeight: '700', marginBottom: '12px', textTransform: 'uppercase', fontSize: '12px', color: 'var(--text-secondary)' } }, 'Material (' + (selectedItem.productosAsignados || []).length + ' productos)'),
                            (selectedItem.productosAsignados || []).map(function(prod, idx) {
                                return e('div', { key: idx, style: { display: 'flex', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--bg-tertiary)', borderRadius: '6px', marginBottom: '6px' } },
                                    e('span', { style: { fontWeight: '500' } }, (idx + 1) + '. ' + prod.nombre),
                                    e('span', { style: { fontFamily: 'IBM Plex Mono,monospace', fontSize: '12px', color: 'var(--accent-blue)' } }, prod.barcode)
                                );
                            })
                        ),
                        selectedItem.observaciones ? e('div', { style: { marginBottom: '16px' } },
                            e('div', { style: { fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' } }, 'Observaciones'),
                            e('div', { style: { background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', fontSize: '14px' } }, selectedItem.observaciones)
                        ) : null,
                        selectedItem.firmaEmpleado ? e('div', null,
                            e('div', { style: { fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' } }, 'Firma del empleado'),
                            e('img', { src: selectedItem.firmaEmpleado, style: { maxWidth: '300px', height: '80px', objectFit: 'contain', background: 'var(--bg-primary)', borderRadius: '8px', padding: '8px', border: '1px solid var(--border)' } })
                        ) : null
                    );
                }
                // DEVOLVER MATERIAL
                if (modalType === 'devolver-material' && selectedItem) {
                    const productos = selectedItem.productosAsignados || [];
                    const selectedCount = Object.values(returnSelections).filter(Boolean).length;
                    return e('div', null,
                        tecnicoBanner(),
                        e('div', { style: { background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', marginBottom: '20px' } },
                            e('div', { style: { fontWeight: '700', fontSize: '16px', marginBottom: '4px' } }, selectedItem.nombreEmpleado),
                            e('div', { style: { color: 'var(--text-secondary)', fontSize: '14px' } }, selectedItem.emailEmpleado + ' · ' + selectedItem.departamento)
                        ),
                        e('div', { style: { marginBottom: '20px' } },
                            e('div', { style: { fontWeight: '700', marginBottom: '12px', textTransform: 'uppercase', fontSize: '12px', color: 'var(--text-secondary)' } }, 'Selecciona los items a devolver'),
                            productos.map(function(prod) {
                                const key = prod.barcode || prod.idEtiqueta;
                                const sel = !!returnSelections[key];
                                const esEquipo = !!prod.esEquipo;
                                return e('div', { key: key, className: 'return-row ' + (sel ? 'selected' : ''), onClick: function() { setReturnSelections(function(prev) { var n = Object.assign({}, prev); n[key] = !prev[key]; return n; }); } },
                                    e('input', { type: 'checkbox', checked: sel, onChange: function() {}, style: { width: '18px', height: '18px', cursor: 'pointer' } }),
                                    e('div', { style: { flex: 1 } },
                                        e('div', { style: { fontWeight: '600', fontSize: '14px' } },
                                            esEquipo ? e('span', { style: { background: 'rgba(88,166,255,.15)', color: 'var(--accent-blue)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', marginRight: '6px', fontWeight: '700' } }, '💻 EQUIPO') : e('span', { style: { background: 'rgba(63,185,80,.15)', color: 'var(--accent-green)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', marginRight: '6px', fontWeight: '700' } }, '📦 FUNGIBLE'),
                                            prod.nombre
                                        ),
                                        e('div', { style: { fontFamily: 'IBM Plex Mono,monospace', fontSize: '12px', color: 'var(--accent-blue)' } }, prod.idEtiqueta || prod.barcode || '')
                                    ),
                                    sel ? e('span', { style: { color: 'var(--accent-green)', fontSize: '20px' } }, '✓') : null
                                );
                            }),
                            e('div', { style: { marginTop: '8px', padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: '6px', fontSize: '13px', color: 'var(--text-secondary)' } },
                                e('strong', { style: { color: selectedCount > 0 ? 'var(--accent-green)' : 'var(--text-secondary)' } }, selectedCount),
                                ' de ' + productos.length + ' items seleccionados'
                            )
                        ),
                        fld('Observaciones', inp('observaciones', 'Estado del material...'))
                    );
                }
                // BAJA DE EMPLEADO
                if (modalType === 'baja-empleado') {
                    const empleadoAsignaciones = bajaSelected ? (state.assignments || []).filter(function(a) { return a.emailEmpleado.toLowerCase() === bajaSelected.emailEmpleado.toLowerCase() && a.estado === 'Activo'; }) : [];
                    const todosItems = empleadoAsignaciones.flatMap(function(a) {
                        var prods = []; try { prods = JSON.parse(a.productosAsignados || '[]'); } catch(e) {}
                        return prods.map(function(p) { return Object.assign({}, p, { asignacionId: a.id }); });
                    });
                    const handleBajaSearch = function(q) {
                        setBajaQuery(q);
                        const ql = q.toLowerCase();
                        if (ql.length < 2) { setBajaResults([]); return; }
                        // Buscar primero en asignaciones activas (empleados con material)
                        const seen = new Set();
                        const encontrados = [];
                        (state.assignments || []).filter(function(a) { return a.estado === 'Activo'; }).forEach(function(a) {
                            if (!seen.has(a.emailEmpleado) && ((a.nombreEmpleado||'').toLowerCase().includes(ql) || (a.emailEmpleado||'').toLowerCase().includes(ql) || (a.departamento||'').toLowerCase().includes(ql))) {
                                seen.add(a.emailEmpleado);
                                const nAsigs = (state.assignments||[]).filter(x => x.emailEmpleado === a.emailEmpleado && x.estado === 'Activo').length;
                                encontrados.push({ nombreEmpleado: a.nombreEmpleado, emailEmpleado: a.emailEmpleado, departamento: a.departamento, tieneMaterial: true, nAsigs });
                            }
                        });
                        // Completar con búsqueda en AD si hay pocos resultados
                        if (encontrados.length < 5 && dataManager) {
                            dataManager.searchUsers(q).then(function(adUsers) {
                                const extras = (adUsers || []).filter(function(u) { return !seen.has(u.mail); }).slice(0, 5 - encontrados.length).map(function(u) {
                                    return { nombreEmpleado: u.displayName, emailEmpleado: u.mail, departamento: u.department || '', tieneMaterial: false, nAsigs: 0 };
                                });
                                setBajaResults(encontrados.concat(extras).slice(0, 8));
                            }).catch(function() { setBajaResults(encontrados.slice(0, 8)); });
                        } else {
                            setBajaResults(encontrados.slice(0, 8));
                        }
                    };
                    return e('div', null,
                        tecnicoBanner(),
                        e('div', { className: 'info-banner red', style: { marginBottom: '16px', background: 'rgba(239,68,68,.1)', border: '1px solid var(--accent-red)', borderRadius: '8px', padding: '12px 16px', color: 'var(--accent-red)', fontWeight: '600' } }, '👋 Baja de empleado — se devolverá todo el material activo y los equipos etiquetados volverán a Almacén.'),
                        !bajaSelected ? e('div', null,
                            e('div', { className: 'form-group', style: { position: 'relative' } },
                                e('label', { className: 'form-label' }, 'Buscar empleado *'),
                                e('input', { type: 'text', className: 'form-input', placeholder: 'Nombre o email...', value: bajaQuery, onChange: function(ev) { handleBajaSearch(ev.target.value); } }),
                                bajaResults.length > 0 && e('div', { className: 'user-search-dropdown' },
                                    bajaResults.map(function(u, i) { return e('div', { key: i, className: 'user-search-item', onClick: function() {
                                        setBajaSelected(u); setBajaQuery(''); setBajaResults([]);
                                        const sel = {};
                                        const asigs = (state.assignments || []).filter(function(a) { return a.emailEmpleado.toLowerCase() === u.emailEmpleado.toLowerCase() && a.estado === 'Activo'; });
                                        asigs.forEach(function(a) {
                                            var prods = []; try { prods = JSON.parse(a.productosAsignados || '[]'); } catch(e) {}
                                            prods.forEach(function(p) { sel[p.barcode || p.idEtiqueta] = true; });
                                        });
                                        setBajaSelections(sel);
                                    } },
                                        e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                                            e('div', null,
                                                e('div', { style: { fontWeight: '600' } }, u.nombreEmpleado),
                                                e('div', { style: { fontSize: '12px', color: 'var(--text-secondary)' } }, u.emailEmpleado + (u.departamento ? ' · ' + u.departamento : ''))
                                            ),
                                            u.tieneMaterial
                                                ? e('span', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--accent-orange)', background: 'rgba(249,115,22,.15)', padding: '2px 8px', borderRadius: '10px' } }, u.nAsigs + ' asig.')
                                                : e('span', { style: { fontSize: '11px', color: 'var(--text-secondary)' } }, 'Sin material')
                                        )
                                    ); })
                                )
                            )
                        ) : e('div', null,
                            e('div', { style: { background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                                e('div', null, e('div', { style: { fontWeight: '700' } }, bajaSelected.nombreEmpleado), e('div', { style: { fontSize: '13px', color: 'var(--text-secondary)' } }, bajaSelected.emailEmpleado)),
                                e('button', { className: 'button button-secondary', onClick: function() { setBajaSelected(null); setBajaSelections({}); setBajaQuery(''); }, style: { padding: '6px 10px', fontSize: '12px' } }, 'Cambiar')
                            ),
                            todosItems.length === 0 ?
                                e('div', { style: { background: 'rgba(63,185,80,.1)', border: '1px solid var(--accent-green)', borderRadius: '8px', padding: '12px 16px', color: 'var(--accent-green)', fontWeight: '600' } }, '✓ Este empleado no tiene material activo asignado.') :
                                e('div', { style: { marginBottom: '16px' } },
                                    e('div', { style: { fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase' } }, todosItems.length + ' item(s) — marca los que se devuelven'),
                                    todosItems.map(function(prod, idx) {
                                        const key = prod.barcode || prod.idEtiqueta;
                                        const sel = !!bajaSelections[key];
                                        return e('div', { key: (key || '') + idx, className: 'return-row ' + (sel ? 'selected' : ''), onClick: function() { setBajaSelections(function(prev) { const n = Object.assign({}, prev); n[key] = !prev[key]; return n; }); } },
                                            e('input', { type: 'checkbox', checked: sel, onChange: function() {}, style: { width: '18px', height: '18px' } }),
                                            e('div', { style: { flex: 1 } },
                                                e('div', { style: { fontWeight: '600', fontSize: '14px' } },
                                                    prod.esEquipo ? e('span', { style: { background: 'rgba(88,166,255,.15)', color: 'var(--accent-blue)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', marginRight: '6px', fontWeight: '700' } }, '💻') : e('span', { style: { background: 'rgba(63,185,80,.15)', color: 'var(--accent-green)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', marginRight: '6px', fontWeight: '700' } }, '📦'),
                                                    prod.nombre
                                                ),
                                                e('div', { style: { fontSize: '12px', color: 'var(--accent-blue)', fontFamily: 'IBM Plex Mono,monospace' } }, prod.idEtiqueta || prod.barcode || '')
                                            ),
                                            sel && e('span', { style: { color: 'var(--accent-green)', fontSize: '20px' } }, '✓')
                                        );
                                    })
                                ),
                            fld('Motivo de baja', inp('observaciones', 'Ej: Fin de contrato, cambio de sede...'))
                        )
                    );
                }
                return e('div', { style: { textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' } }, 'Formulario no disponible');
            };

            const titles = { 'entrada-new': '📦 Nuevo Producto', 'entrada-add': '➕ Añadir Stock', 'salida': '📤 Registrar Salida', 'editar': '✏️ Editar Producto', 'duplicar': '🔄 Duplicar Producto', 'tecnico': '👤 Nuevo Técnico', 'nueva-asignacion': '📋 Nueva Asignacion', 'nuevo-prestamo': '⏱️ Prestamo de Material', 'ver-asignacion': '📄 Documento de Asignacion', 'devolver-material': '↩️ Devolucion de Material', 'baja-empleado': '👋 Baja de Empleado' };
            const titleKey = modalType === 'entrada' ? (selectedItem ? 'entrada-add' : 'entrada-new') : modalType;
            const modalTitle = titles[titleKey] || 'Formulario';
            const isViewOnly = modalType === 'ver-asignacion';
            const submitLabels = { 'entrada-new': 'Crear Producto', 'entrada-add': 'Añadir Stock', 'salida': 'Registrar Salida', 'editar': 'Guardar Cambios', 'duplicar': 'Duplicar Producto', 'tecnico': 'Crear Técnico', 'nueva-asignacion': 'Crear Asignacion', 'nuevo-prestamo': 'Registrar Prestamo', 'devolver-material': 'Confirmar Devolucion', 'baja-empleado': '👋 Confirmar Baja' };
            const submitLabel = submitLabels[titleKey] || 'Guardar';
            const submitClass = modalType === 'salida' ? 'button-warning' : modalType === 'devolver-material' ? 'button-success' : 'button-primary';

            return e('div', {
                className: 'modal-overlay',
                ref: overlayRef,
                onMouseDown: function(ev) { mouseDownOnOverlay.current = ev.target === overlayRef.current; },
                onMouseUp: function(ev) { if (mouseDownOnOverlay.current && ev.target === overlayRef.current && !loading) onClose(); mouseDownOnOverlay.current = false; }
            },
                e('div', { className: 'modal', onMouseDown: function(ev) { ev.stopPropagation(); } },
                    e('div', { className: 'modal-header' },
                        e('h2', { className: 'modal-title' }, modalTitle),
                        e('button', { className: 'modal-close', onClick: function() { if (!loading) onClose(); }, disabled: loading }, '×')
                    ),
                    e('div', { className: 'modal-body' }, renderBody()),
                    e('div', { className: 'modal-footer' },
                        e('button', { type: 'button', className: 'button button-secondary', onClick: function() { if (!loading) onClose(); }, disabled: loading }, 'Cancelar'),
                        isViewOnly
                            ? e('button', { type: 'button', className: 'button button-primary', onClick: function() { exportAssignmentToPDF(selectedItem); } }, '📥 Descargar PDF')
                            : e('button', { type: 'button', className: 'button ' + submitClass, onClick: handleSubmit, disabled: loading },
                                loading ? e('span', { className: 'loading-spinner' }) : null,
                                ' ',
                                loading ? 'Guardando...' : submitLabel
                            )
                    )
                )
            );
        }

        // ==========================================
        // ==========================================
        // EQUIPOS VIEW - v2.2.0

export default FormModal;
