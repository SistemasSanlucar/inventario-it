function isYes(value) {
    return value === 'Si' || value === true || value === 'Yes';
}

export function normalizeInventory(items = []) {
    return items.map(item => ({
        id: item.sharePointId,
        nombre: item.Nombre || item.Title,
        categoria: item.Categoria,
        barcode: item.CodigoBarras,
        stock: parseInt(item.Stock, 10) || 0,
        stockMinimo: parseInt(item.StockMinimo, 10) || 0,
        ubicacion: item.Ubicacion || '',
        estado: item.Estado || 'Nuevo',
    }));
}

export function normalizeTechnicians(items = []) {
    return items.map(item => ({
        id: item.sharePointId,
        nombre: item.NombreTecnico || item.Title,
        codigo: item.CodigoTecnico,
        email: item.Email,
        activo: isYes(item.Activo),
    }));
}

export function normalizeHistory(items = []) {
    return items
        .map(item => ({
            id: item.sharePointId,
            fecha: item.FechaHora || item.Created,
            tipo: item.TipoMovimiento,
            producto: item.Producto,
            cantidad: parseInt(item.Cantidad, 10) || 0,
            ticket: item.Ticket || '',
            usuario: item.Usuario || '',
            tecnico: item.Tecnico || '',
            firma: item.Firma || null,
            idEtiqueta: item.IDEtiqueta || '',
            motivo: item.MotivoIncidencia || '',
        }))
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

export function normalizeAssignments(items = []) {
    return items
        .map(item => ({
            id: item.sharePointId,
            nombreEmpleado: item.NombreEmpleado,
            emailEmpleado: item.EmailEmpleado,
            departamento: item.Departamento,
            puesto: item.Puesto,
            fechaIncorporacion: item.FechaIncorporacion,
            productosAsignados: JSON.parse(item.ProductosAsignados || '[]'),
            cantidadProductos: parseInt(item.CantidadProductos, 10) || 0,
            firmaEmpleado: item.FirmaEmpleado,
            tecnicoResponsable: item.TecnicoResponsable,
            fechaAsignacion: item.FechaAsignacion,
            estado: item.Estado,
            observaciones: item.Observaciones || '',
            esPrestamo: item.EsPrestamo === 'Si',
        }))
        .sort((a, b) => new Date(b.fechaAsignacion) - new Date(a.fechaAsignacion));
}

export function normalizeActivos(items = []) {
    return items.map(item => ({
        id: item.sharePointId,
        idEtiqueta: item.IDEtiqueta || '',
        tipo: item.TipoMaterial || '',
        modelo: item.ModeloMaterial || '',
        estado: item.EstadoActivo || 'Almacen',
        ubicacion: item.UbicacionActivo || '',
        numSerie: item.NumSerie || '',
        notas: item.Notas || '',
        sociedad: item.Sociedad || '',
        asignadoA: item.AsignadoA || '',
        emailAsignadoA: item.EmailAsignadoA || '',
        fechaAsignacion: item.FechaAsignacion || null,
        transitoDestino: item.TransitoDestino || '',
        motivoIncidencia: item.MotivoIncidencia || '',
        proveedor: item.Proveedor || '',
        numAlbaran: item.NumAlbaran || '',
        fechaCompra: item.FechaCompra || null,
        fechaGarantia: item.FechaGarantia || null,
        accesorios: item.Accesorios || '',
    }));
}

export function normalizeSociedades(items = []) {
    return items
        .map(item => ({
            id: item.sharePointId,
            nombre: item.Title,
            codigo: (item.Codigo || '').toUpperCase(),
            pais: item.Pais || '',
            activo: isYes(item.Activo),
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export function normalizeProveedores(items = []) {
    return items
        .map(item => ({
            id: item.sharePointId,
            nombre: item.Title,
            contacto: item.Contacto || '',
            email: item.Email || '',
            telefono: item.Telefono || '',
            activo: item.Activo === true || item.Activo === 'Yes' || item.Activo === 'Si',
        }))
        .filter(item => item.activo)
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export function normalizeCatalog(catalogo = []) {
    const catalogoProcessed = {};
    const catalogoTipos = {};
    const catalogoAccesorios = {};

    catalogo.forEach(item => {
        const tipo = item.Title;
        const modelo = item.Modelo;
        const activo = item.Activo !== 'No' && item.Activo !== false;
        const llevaEtiqueta = item.LlevaEtiqueta === 'Si';

        if (!catalogoTipos[tipo]) catalogoTipos[tipo] = { llevaEtiqueta };
        if (llevaEtiqueta) catalogoTipos[tipo].llevaEtiqueta = true;

        if (activo && tipo && modelo) {
            if (!catalogoProcessed[tipo]) catalogoProcessed[tipo] = [];
            catalogoProcessed[tipo].push(modelo);
            if (item.Accesorios) catalogoAccesorios[tipo + '|' + modelo] = item.Accesorios;
        }
    });

    return { catalogo: catalogoProcessed, catalogoTipos, catalogoAccesorios };
}

export function normalizeAppData(raw) {
    const { catalogo, catalogoTipos, catalogoAccesorios } = normalizeCatalog(raw.catalogo || []);

    return {
        inventory: normalizeInventory(raw.inventario || []),
        technicians: normalizeTechnicians(raw.tecnicos || []),
        history: normalizeHistory(raw.historial || []),
        assignments: normalizeAssignments(raw.asignaciones || []),
        activos: normalizeActivos(raw.activosRaw || []),
        sociedades: normalizeSociedades(raw.sociedadesRaw || []),
        proveedores: normalizeProveedores(raw.proveedoresRaw || []),
        admins: raw.admins || [],
        catalogo,
        catalogoTipos,
        catalogoAccesorios,
        ubicaciones: (raw.ubicacionesRaw || [])
            .map(item => ({ id: item.sharePointId, nombre: item.Title, activo: isYes(item.Activo) }))
            .filter(item => item.activo)
            .sort((a, b) => a.nombre.localeCompare(b.nombre)),
        ubicacionesAll: (raw.ubicacionesRaw || []).map(item => ({ id: item.sharePointId, nombre: item.Title, activo: isYes(item.Activo) })),
        adminsAll: (raw.admins || []).map(item => ({ id: item.sharePointId, email: item.Email, activo: isYes(item.Activo) })),
    };
}