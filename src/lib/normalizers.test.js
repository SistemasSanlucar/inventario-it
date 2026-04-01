import { describe, expect, it } from 'vitest';
import { normalizeAppData } from './normalizers';

describe('normalizeAppData', () => {
    it('normalizes raw graph/sharepoint payloads into ui state', () => {
        const result = normalizeAppData({
            inventario: [{ sharePointId: '1', Nombre: 'Portatil', Categoria: 'Equipo', CodigoBarras: 'ABC', Stock: '3', StockMinimo: '1', Ubicacion: 'MAD', Estado: 'Nuevo' }],
            tecnicos: [{ sharePointId: '2', NombreTecnico: 'Ana', CodigoTecnico: 'TEC01', Email: 'ana@sanlucar.com', Activo: 'Si' }],
            historial: [{ sharePointId: '3', FechaHora: '2025-01-01T10:00:00Z', TipoMovimiento: 'Entrada', Producto: 'Portatil', Cantidad: '1' }],
            admins: [{ sharePointId: '4', Email: 'admin@sanlucar.com', Activo: 'Yes' }],
            asignaciones: [{ sharePointId: '5', NombreEmpleado: 'Juan', EmailEmpleado: 'juan@sanlucar.com', ProductosAsignados: '[]', CantidadProductos: '0', FechaAsignacion: '2025-01-02T10:00:00Z', Estado: 'Activo', EsPrestamo: 'No' }],
            catalogo: [{ Title: 'Laptop', Modelo: 'EliteBook', Activo: 'Si', LlevaEtiqueta: 'Si', Accesorios: 'Dock' }],
            ubicacionesRaw: [{ sharePointId: '6', Title: 'MAD-01', Activo: 'Si' }],
            activosRaw: [{ sharePointId: '7', IDEtiqueta: 'SLF-25-0001', TipoMaterial: 'Laptop', ModeloMaterial: 'EliteBook', EstadoActivo: 'Almacen' }],
            sociedadesRaw: [{ sharePointId: '8', Title: 'SanLucar', Codigo: 'slf', Pais: 'ES', Activo: 'Si' }],
            proveedoresRaw: [{ sharePointId: '9', Title: 'HP', Activo: 'Si' }],
        });

        expect(result.inventory[0]).toMatchObject({ nombre: 'Portatil', stock: 3 });
        expect(result.technicians[0]).toMatchObject({ nombre: 'Ana', activo: true });
        expect(result.catalogo.Laptop).toEqual(['EliteBook']);
        expect(result.catalogoTipos.Laptop.llevaEtiqueta).toBe(true);
        expect(result.activos[0].idEtiqueta).toBe('SLF-25-0001');
        expect(result.sociedades[0].codigo).toBe('SLF');
    });
});
