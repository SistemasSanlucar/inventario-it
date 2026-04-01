import { CONFIG } from '../../lib/config';
import { normalizeAppData } from '../../lib/normalizers';

export class DataManager {
        constructor(graphClient) { this.graph = graphClient; }
        async loadAllData() {
            try {
                const [inventario, tecnicos, historial, admins, asignaciones, catalogo, ubicacionesRaw, activosRaw, sociedadesRaw, proveedoresRaw] = await Promise.all([
                    this.graph.getListItems(CONFIG.sharepoint.lists.inventario),
                    this.graph.getListItems(CONFIG.sharepoint.lists.tecnicos),
                    this.graph.getListItems(CONFIG.sharepoint.lists.historial),
                    this.graph.getListItems(CONFIG.sharepoint.lists.admins),
                    this.graph.getListItems(CONFIG.sharepoint.lists.asignaciones).catch(() => []),
                    this.graph.getListItems(CONFIG.sharepoint.lists.catalogo).catch(() => []),
                    this.graph.getListItems(CONFIG.sharepoint.lists.ubicaciones).catch(() => []),
                    this.graph.getListItems(CONFIG.sharepoint.lists.activos).catch(() => []),
                    this.graph.getListItems(CONFIG.sharepoint.lists.sociedades).catch(() => []),
                    this.graph.getListItems(CONFIG.sharepoint.lists.proveedores).catch(() => [])
                ]);
                return normalizeAppData({ inventario, tecnicos, historial, admins, asignaciones, catalogo, ubicacionesRaw, activosRaw, sociedadesRaw, proveedoresRaw });
            } catch(error) { console.error('Error cargando datos:', error); throw error; }
        }
        async checkBarcodeExists(barcode) {
            try { const items = await this.graph.getListItems(CONFIG.sharepoint.lists.inventario); return items.some(item => item.CodigoBarras === barcode); } catch(e) { return false; }
        }
        async createInventoryItem(data) {
            return await this.graph.createListItem(CONFIG.sharepoint.lists.inventario, { Title: data.nombre, Nombre: data.nombre, Categoria: data.categoria, CodigoBarras: data.barcode, Stock: data.stock, StockMinimo: data.stockMinimo, Ubicacion: data.ubicacion, Estado: data.estado || 'Nuevo' });
        }
        async updateInventoryItem(itemId, data) { await this.graph.updateListItem(CONFIG.sharepoint.lists.inventario, itemId, data); }
        async deleteInventoryItem(itemId) { await this.graph.deleteListItem(CONFIG.sharepoint.lists.inventario, itemId); }
        async addToHistory(data) {
            await this.graph.createListItem(CONFIG.sharepoint.lists.historial, { Title: data.tipo + ' - ' + data.producto, TipoMovimiento: data.tipo, Producto: data.producto, Cantidad: data.cantidad, Ticket: data.ticket || '', Usuario: data.usuario || '', Tecnico: data.tecnico || '', FechaHora: new Date().toISOString(), Firma: data.firma || '', IDEtiqueta: data.idEtiqueta || '', MotivoIncidencia: data.motivo || '' });
        }
        // UBICACIONES CRUD
        async createUbicacion(nombre) { return await this.graph.createListItem(CONFIG.sharepoint.lists.ubicaciones, { Title: nombre, Activo: 'Si' }); }
        async updateUbicacion(itemId, nombre) { await this.graph.updateListItem(CONFIG.sharepoint.lists.ubicaciones, itemId, { Title: nombre }); }
        async toggleUbicacion(itemId, activo) { await this.graph.updateListItem(CONFIG.sharepoint.lists.ubicaciones, itemId, { Activo: activo ? 'No' : 'Si' }); }
        async deleteUbicacion(itemId) { await this.graph.deleteListItem(CONFIG.sharepoint.lists.ubicaciones, itemId); }
        // CATALOGO CRUD completo
        async deleteCatalogItem(itemId) { await this.graph.deleteListItem(CONFIG.sharepoint.lists.catalogo, itemId); }
        async getCatalogoRaw() {
            const items = await this.graph.getListItems(CONFIG.sharepoint.lists.catalogo);
            return items.map(item => ({ id: item.sharePointId, tipo: item.Title, modelo: item.Modelo, activo: item.Activo !== 'No' && item.Activo !== false, llevaEtiqueta: item.LlevaEtiqueta === 'Si' }));
        }
        async addToCatalog(tipo, modelo) {
            const fields = { Title: tipo, Activo: 'Si' };
            if (modelo && modelo.trim()) fields.Modelo = modelo.trim();
            return await this.graph.createListItem(CONFIG.sharepoint.lists.catalogo, fields);
        }
        async updateCatalogLlevaEtiqueta(itemId, llevaEtiqueta) {
            await this.graph.updateListItem(CONFIG.sharepoint.lists.catalogo, itemId, { LlevaEtiqueta: llevaEtiqueta ? 'Si' : 'No' });
        }
        // ADMINS CRUD
        async createAdmin(email) { return await this.graph.createListItem(CONFIG.sharepoint.lists.admins, { Title: email, Email: email, Activo: 'Si' }); }
        async toggleAdmin(itemId, activo) { await this.graph.updateListItem(CONFIG.sharepoint.lists.admins, itemId, { Activo: activo ? 'No' : 'Si' }); }
        async deleteAdmin(itemId) { await this.graph.deleteListItem(CONFIG.sharepoint.lists.admins, itemId); }
        async createTechnician(data) {
            // Activo puede ser booleano (Sí/No SharePoint) o elección ('Si'/'No')
            // Enviamos true — si el campo es boolean SharePoint lo acepta; si es texto, intentar con 'Si'
            try {
                return await this.graph.createListItem(CONFIG.sharepoint.lists.tecnicos, { Title: data.nombre, NombreTecnico: data.nombre, CodigoTecnico: data.codigo, Email: data.email, Activo: true });
            } catch(e) {
                if (e.message && e.message.includes('General exception')) {
                    return await this.graph.createListItem(CONFIG.sharepoint.lists.tecnicos, { Title: data.nombre, NombreTecnico: data.nombre, CodigoTecnico: data.codigo, Email: data.email, Activo: 'Si' });
                }
                throw e;
            }
        }
        async toggleTechnicianStatus(itemId, currentStatus) {
            try {
                await this.graph.updateListItem(CONFIG.sharepoint.lists.tecnicos, itemId, { Activo: !currentStatus });
            } catch(e) {
                await this.graph.updateListItem(CONFIG.sharepoint.lists.tecnicos, itemId, { Activo: currentStatus ? 'No' : 'Si' });
            }
        }
        async deleteHistoryItem(itemId) { await this.graph.deleteListItem(CONFIG.sharepoint.lists.historial, itemId); }
        // ACTIVOS (etiquetas individuales)
        async getNextEtiquetaId(codigoSociedad) {
            const anyo = new Date().getFullYear().toString().slice(-2);
            const codigo = (codigoSociedad || 'SLF').toUpperCase();
            const unique = crypto.randomUUID().replace(/-/g, '').toUpperCase().slice(0, 8);
            return codigo + '-' + anyo + '-' + unique;
        }
        async createActivo(data) {
            return await this.graph.createListItem(CONFIG.sharepoint.lists.activos, {
                Title: data.idEtiqueta,
                IDEtiqueta: data.idEtiqueta,
                TipoMaterial: data.tipo,
                ModeloMaterial: data.modelo,
                EstadoActivo: data.estado || 'Pendiente',
                UbicacionActivo: data.ubicacion || '',
                NumSerie: data.numSerie || '',
                Notas: data.notas || '',
                Sociedad: data.sociedad || ''
            });
        }
        async cambiarEstadoActivo(itemId, estado, extra) {
            const fields = { EstadoActivo: estado };
            const ex = extra || {};
            if (ex.ubicacion !== undefined) fields.UbicacionActivo = ex.ubicacion;
            if (ex.asignadoA !== undefined) fields.AsignadoA = ex.asignadoA;
            if (ex.emailAsignadoA !== undefined) fields.EmailAsignadoA = ex.emailAsignadoA;
            if (ex.fechaAsignacion !== undefined) fields.FechaAsignacion = ex.fechaAsignacion;
            if (ex.transitoDestino !== undefined) fields.TransitoDestino = ex.transitoDestino;
            if (ex.fechaTransito !== undefined) fields.FechaTransito = ex.fechaTransito;
            if (ex.motivoIncidencia !== undefined) fields.MotivoIncidencia = ex.motivoIncidencia;
            // Limpiar campos de asignación si vuelve a Almacén
            if (estado === 'Almacen') { fields.AsignadoA = ''; fields.EmailAsignadoA = ''; fields.FechaAsignacion = null; fields.TransitoDestino = ''; }
            await this.graph.updateListItem(CONFIG.sharepoint.lists.activos, itemId, fields);
        }
        // SOCIEDADES CRUD
        async createSociedad(data) {
            const codigo = data.codigo.toUpperCase().slice(0, 3);
            return await this.graph.createListItem(CONFIG.sharepoint.lists.sociedades, { Title: data.nombre, Codigo: codigo, Pais: data.pais, Activo: 'Si' });
        }
        async updateSociedad(itemId, data) {
            const fields = {};
            if (data.nombre !== undefined) fields.Title = data.nombre;
            if (data.codigo !== undefined) fields.Codigo = data.codigo.toUpperCase().slice(0, 3);
            if (data.pais !== undefined) fields.Pais = data.pais;
            await this.graph.updateListItem(CONFIG.sharepoint.lists.sociedades, itemId, fields);
        }
        async toggleSociedad(itemId, activo) { await this.graph.updateListItem(CONFIG.sharepoint.lists.sociedades, itemId, { Activo: activo ? 'No' : 'Si' }); }
        async deleteSociedad(itemId) { await this.graph.deleteListItem(CONFIG.sharepoint.lists.sociedades, itemId); }
        async updateActivoEstado(itemId, estado, ubicacion) {
            await this.graph.updateListItem(CONFIG.sharepoint.lists.activos, itemId, { EstadoActivo: estado, UbicacionActivo: ubicacion || '' });
        }
        async updateActivoNS(itemId, numSerie) {
            await this.graph.updateListItem(CONFIG.sharepoint.lists.activos, itemId, { NumSerie: numSerie, EstadoActivo: 'Almacen' });
        }
        async updateActivoAccesorios(itemId, accesorios) {
            await this.graph.updateListItem(CONFIG.sharepoint.lists.activos, itemId, { Accesorios: accesorios });
        }
        async updateCatalogAccesorios(itemId, accesorios) {
            await this.graph.updateListItem(CONFIG.sharepoint.lists.catalogo, itemId, { Accesorios: accesorios });
        }
        async deleteActivo(itemId) { await this.graph.deleteListItem(CONFIG.sharepoint.lists.activos, itemId); }
        // PROVEEDORES CRUD
        async createProveedor(data) { return await this.graph.createListItem(CONFIG.sharepoint.lists.proveedores, { Title: data.nombre, Contacto: data.contacto || '', Email: data.email || '', Telefono: data.telefono || '', Activo: true }); }
        async updateProveedor(itemId, data) { await this.graph.updateListItem(CONFIG.sharepoint.lists.proveedores, itemId, { Title: data.nombre, Contacto: data.contacto || '', Email: data.email || '', Telefono: data.telefono || '' }); }
        async toggleProveedor(itemId, activo) { await this.graph.updateListItem(CONFIG.sharepoint.lists.proveedores, itemId, { Activo: !activo }); }
        async deleteProveedor(itemId) { await this.graph.deleteListItem(CONFIG.sharepoint.lists.proveedores, itemId); }
        async createAssignment(data) {
            const titulo = data.esPrestamo ? 'Prestamo - ' + data.nombreEmpleado : 'Asignacion - ' + data.nombreEmpleado + ' - ' + new Date().toLocaleDateString('es-ES');
            const todosProductos = (data.productosAsignados || []).concat(data.equiposAsignados || []);
            const detalleProductos = todosProductos.map((p, i) => (i + 1) + '. ' + p.nombre + ' (Cod: ' + (p.barcode || p.idEtiqueta || '') + ')').join('\n');
            return await this.graph.createListItem(CONFIG.sharepoint.lists.asignaciones, { Title: titulo, NombreEmpleado: data.nombreEmpleado, EmailEmpleado: data.emailEmpleado, Departamento: data.departamento, Puesto: data.puesto, FechaIncorporacion: data.fechaIncorporacion, ProductosAsignados: JSON.stringify(todosProductos), CantidadProductos: todosProductos.length, FirmaEmpleado: data.firmaEmpleado, TecnicoResponsable: data.tecnicoResponsable, FechaAsignacion: new Date().toISOString(), Estado: 'Activo', Observaciones: data.observaciones || '', EsPrestamo: data.esPrestamo ? 'Si' : 'No', DetalleProductos: detalleProductos, Foto1: '', Foto2: '', Foto3: '' });
        }
        async updateAssignmentStatus(itemId, nuevoEstado) { await this.graph.updateListItem(CONFIG.sharepoint.lists.asignaciones, itemId, { Estado: nuevoEstado }); }
        async deleteAssignment(itemId) { await this.graph.deleteListItem(CONFIG.sharepoint.lists.asignaciones, itemId); }
        async searchUsers(searchTerm) { return await this.graph.searchUsers(searchTerm); }
        async returnMaterial(assignmentId, returnedProducts, allProducts, observaciones, tecnico, inventoryData, activosData) {
            const fullyReturned = returnedProducts.length === allProducts.length;
            const newState = fullyReturned ? 'Devuelto' : 'Parcial';
            await this.graph.updateListItem(CONFIG.sharepoint.lists.asignaciones, assignmentId, { Estado: newState, Observaciones: observaciones });
            // Agrupar productos fungibles por barcode para sumar cantidades correctamente
            const fungibleMap = {};
            for (const prod of returnedProducts) {
                if (prod.esEquipo) {
                    // Equipo etiquetado — vuelve a Almacén
                    const activo = (activosData || []).find(a => a.idEtiqueta === prod.idEtiqueta);
                    if (activo) await this.cambiarEstadoActivo(activo.id, 'Almacen', {});
                    await this.addToHistory({ tipo: 'Devolucion', producto: prod.nombre, cantidad: 1, usuario: '', tecnico, idEtiqueta: prod.idEtiqueta || '' });
                } else {
                    // Agrupar fungibles — puede devolver varias unidades del mismo producto
                    const key = prod.barcode || prod.nombre;
                    if (!fungibleMap[key]) fungibleMap[key] = { prod, cantidad: 0 };
                    fungibleMap[key].cantidad += (parseInt(prod.cantidad) || 1);
                }
            }
            // Actualizar stock de fungibles con cantidad real
            for (const key of Object.keys(fungibleMap)) {
                const { prod, cantidad } = fungibleMap[key];
                const inventoryItem = (inventoryData || []).find(i => i.barcode === prod.barcode);
                if (inventoryItem) await this.graph.updateListItem(CONFIG.sharepoint.lists.inventario, inventoryItem.id, { Stock: (inventoryItem.stock || 0) + cantidad });
                await this.addToHistory({ tipo: 'Devolucion', producto: prod.nombre, cantidad, usuario: '', tecnico });
            }
            return newState;
        }
        async findProductByBarcode(barcode) {
            const items = await this.graph.getListItems(CONFIG.sharepoint.lists.inventario, "$filter=fields/CodigoBarras eq '" + barcode + "'");
            const item = items[0];
            if (item) return { id: item.sharePointId, nombre: item.Nombre || item.Title, stock: parseInt(item.Stock) || 0, barcode: item.CodigoBarras };
            return null;
        }
    }