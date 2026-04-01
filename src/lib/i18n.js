const STORAGE_KEY = 'inv_lang';

export const TRANSLATIONS = {
        es: {
            appTitle: 'Sistema de Inventario IT',
            login: 'Iniciar Sesión con Microsoft', loginIng: 'Iniciando...',
            loginDesc: 'Inicia sesión con tu cuenta corporativa de Microsoft 365 para acceder al sistema de gestión de inventario.',
            loginNote: 'Usa tu cuenta @sanlucar.com',
            loginLocalFileTitle: 'Este archivo no puede iniciar sesión directamente',
            loginLocalFileDesc: 'Al abrir la app como archivo local se usa una URL file://, y Microsoft 365 la rechaza como redirect URI.',
            loginLocalFileHint: 'Usa la versión publicada o ejecútala con un servidor local como http://localhost.',
            dashboard: '📊 Dashboard', inventory: '📦 Inventario', equipment: '💻 Equipos',
            assignments: '📋 Asignaciones', history: '📜 Historial', admin: '🛠️ Admin',
            sync: '🔄 Sync', syncing: '⏳ Sync...', logout: 'Salir',
            products: 'Productos', units: 'Unidades', lowStock: 'Stock Bajo',
            newProduct: '+ Nuevo Producto', export: 'Exportar', search: 'Buscar...',
            save: 'Guardar', cancel: 'Cancelar', delete: '🗑️ Eliminar', edit: '✏️ Editar',
            activate: 'Activar', deactivate: 'Desactivar', add: '+ Añadir',
            confirm: 'Confirmar', close: 'Cerrar',
            accessDenied: 'Acceso Denegado',
            accessDeniedMsg: 'Tu cuenta no tiene acceso a esta aplicación. Contacta con el departamento IT.',
            accessDeniedSub: 'Solo el personal autorizado por IT puede acceder.',
            tryOtherAccount: 'Intentar con otra cuenta',
            reception: '+ Recepción de lote', pendingNS: '⚠️ Pendientes N/S',
            newAssignment: '+ Nueva Asignación', loan: '⏱️ Préstamo',
            employeeLeave: '👋 Baja de Empleado',
            globalSearch: 'Buscar en todo... (o escanea QR)',
            packLoad: 'Cargar pack',
            packStandard: 'Usuario Estándar', packPremium: 'Usuario Premium',
            saving: 'Guardando...', loading: 'Cargando...',
            welcome: 'Bienvenido', noAccess: 'Sin acceso',
            zones: '🗄️ Armarios', list: '☰ Lista', newItem: '+ Nuevo', criticalStock: 'Stock Crítico',
            noResults: 'Sin resultados', tryOtherFilters: 'Prueba otros filtros',
            allCategories: 'Todas las categorías', sortName: 'Ordenar: Nombre',
            sortStock: 'Ordenar: Stock', allStatuses: 'Todos',
            stockLow: '⚠️ Stock bajo', outOfStock: '🔴 Sin stock',
            backToList: '← Volver a lista', exitScanner: '← Salir del escáner',
            mapView: '🗺️ Mapa', scannerMode: '⚡ Escáner', receiveBatch: '+ Recepción',
            pendingNSCount: '⚠️ Pendientes N/S',
            assignMaterial: '+ Asignar', returnMaterial: '↩️ Devolver',
            allTypes: 'Todos los tipos', allStates: 'Todos los estados',
            allDepts: 'Todos los dptos.', results: 'resultado(s)',
            clearFilters: '✕ Limpiar', activeAssignment: 'Asignación', activeLoan: 'Préstamo',
            assigned: 'Asignado', returned: 'Devuelto', partial: 'Parcial', expired: '⚠️ Vencidos',
            noAssignments: 'No hay asignaciones', createFirst: 'Empieza asignando material a un empleado',
            allTechnicians: 'Todos los técnicos', allMovements: 'Todos los movimientos',
            dateFrom: 'Desde', dateTo: 'Hasta',
            missionControl: '🎛️ Mission Control', lastSync: 'Última sincronización',
            generalStatus: 'Estado General', optimal: 'Óptimo', attention: 'Atención', critical: 'Crítico',
            equipments: 'Equipos', inStorage: 'En Almacén', today: 'Hoy',
            noAlerts: 'sin alertas', alerts: 'alerta(s)',
            allOk: 'Todo en orden', noActiveAlerts: 'No hay alertas activas',
            nearWarranties: 'Garantías Próximas', noExpiring: 'Sin vencimientos próximos',
            next90: 'Próximos 90 días OK', topTechnicians: '🏆 Top Técnicos — Este Mes',
            noActivityMonth: 'Sin actividad este mes', recentActivity: '📜 Actividad Reciente',
            viewAll: 'Ver todo →', criticalStockTitle: '📦 Stock Crítico',
            stockOptimal: 'Stock en niveles óptimos', noMovements: 'Sin movimientos',
            incidents: '🔧 Equipos con Incidencia',
            adminPanel: '🛠️ Panel de Administración',
            infraGroup: '📍 Infraestructura', catalogGroup: '📦 Catálogo y Stock',
            usersGroup: '👥 Usuarios', systemGroup: '⚙️ Sistema',
            locations: 'Ubicaciones', societies: 'Sociedades', suppliers: 'Proveedores',
            catalog: 'Catálogo', packs: 'Packs', technicians: 'Técnicos',
            administrators: 'Administradores', settings: 'Ajustes', exportAudit: 'Exportar', actionLog: 'Log de Acciones',
            equipmentFile: '📄 Ficha de Equipo', timeline: '📋 Timeline del Equipo',
            noMovementsYet: 'Sin movimientos registrados aún',
            accessories: '🔌 Accesorios incluidos', saveChanges: 'Guardar cambios',
            changeStatus: '🔄 Cambiar estado', printLabel: '🖨️ Imprimir etiqueta',
        },
        en: {
            appTitle: 'IT Inventory System',
            login: 'Sign in with Microsoft', loginIng: 'Signing in...',
            loginDesc: 'Sign in with your Microsoft 365 corporate account to access the inventory management system.',
            loginNote: 'Use your @sanlucar.com account',
            loginLocalFileTitle: 'This file cannot sign in directly',
            loginLocalFileDesc: 'When the app is opened as a local file it uses a file:// URL, and Microsoft 365 rejects it as a redirect URI.',
            loginLocalFileHint: 'Use the published version or run it through a local server such as http://localhost.',
            dashboard: '📊 Dashboard', inventory: '📦 Inventory', equipment: '💻 Equipment',
            assignments: '📋 Assignments', history: '📜 History', admin: '🛠️ Admin',
            sync: '🔄 Sync', syncing: '⏳ Sync...', logout: 'Sign out',
            products: 'Products', units: 'Units', lowStock: 'Low Stock',
            newProduct: '+ New Product', export: 'Export', search: 'Search...',
            save: 'Save', cancel: 'Cancel', delete: '🗑️ Delete', edit: '✏️ Edit',
            activate: 'Activate', deactivate: 'Deactivate', add: '+ Add',
            confirm: 'Confirm', close: 'Close',
            accessDenied: 'Access Denied',
            accessDeniedMsg: 'Your account does not have access to this application. Please contact the IT department.',
            accessDeniedSub: 'Only IT-authorized personnel can access this application.',
            tryOtherAccount: 'Try another account',
            reception: '+ Receive batch', pendingNS: '⚠️ Pending S/N',
            newAssignment: '+ New Assignment', loan: '⏱️ Loan',
            employeeLeave: '👋 Employee Offboarding',
            globalSearch: 'Search everything... (or scan QR)',
            packLoad: 'Load pack',
            packStandard: 'Standard User', packPremium: 'Premium User',
            saving: 'Saving...', loading: 'Loading...',
            welcome: 'Welcome', noAccess: 'No access',
            // Inventory
            zones: '🗄️ Cabinets', list: '☰ List', newItem: '+ New', criticalStock: 'Critical Stock',
            noResults: 'No results', tryOtherFilters: 'Try other filters',
            allCategories: 'All categories', sortName: 'Sort: Name',
            sortStock: 'Sort: Stock', allStatuses: 'All',
            stockLow: '⚠️ Low stock', outOfStock: '🔴 Out of stock',
            // Equipment
            backToList: '← Back to list', exitScanner: '← Exit scanner',
            mapView: '🗺️ Map', scannerMode: '⚡ Scanner', receiveBatch: '+ Receive',
            pendingNSCount: '⚠️ Pending S/N',
            // Assignments
            assignMaterial: '+ Assign', returnMaterial: '↩️ Return',
            allTypes: 'All types', allStates: 'All states',
            allDepts: 'All depts.', results: 'result(s)',
            clearFilters: '✕ Clear', activeAssignment: 'Assignment', activeLoan: 'Loan',
            assigned: 'Assigned', returned: 'Returned', partial: 'Partial', expired: '⚠️ Expired',
            noAssignments: 'No assignments', createFirst: 'Start by assigning material to an employee',
            // History
            allTechnicians: 'All technicians', allMovements: 'All movements',
            dateFrom: 'From', dateTo: 'To',
            // Dashboard
            missionControl: '🎛️ Mission Control', lastSync: 'Last sync',
            generalStatus: 'General Status', optimal: 'Optimal', attention: 'Attention', critical: 'Critical',
            equipments: 'Equipment', inStorage: 'In Storage', today: 'Today',
            noAlerts: 'no alerts', alerts: 'alert(s)',
            allOk: 'All clear', noActiveAlerts: 'No active alerts',
            nearWarranties: 'Upcoming Warranties', noExpiring: 'No upcoming expirations',
            next90: 'Next 90 days OK', topTechnicians: '🏆 Top Technicians — This Month',
            noActivityMonth: 'No activity this month', recentActivity: '📜 Recent Activity',
            viewAll: 'View all →', criticalStockTitle: '📦 Critical Stock',
            stockOptimal: 'Stock at optimal levels', noMovements: 'No movements',
            incidents: '🔧 Equipment with Incidents',
            // Admin
            adminPanel: '🛠️ Admin Panel',
            infraGroup: '📍 Infrastructure', catalogGroup: '📦 Catalogue & Stock',
            usersGroup: '👥 Users', systemGroup: '⚙️ System',
            locations: 'Locations', societies: 'Companies', suppliers: 'Suppliers',
            catalog: 'Catalogue', packs: 'Packs', technicians: 'Technicians',
            administrators: 'Administrators', settings: 'Settings', exportAudit: 'Export', actionLog: 'Action Log',
            // Equipment file
            equipmentFile: '📄 Equipment File', timeline: '📋 Equipment Timeline',
            noMovementsYet: 'No movements registered yet',
            accessories: '🔌 Included accessories', saveChanges: 'Save changes',
            changeStatus: '🔄 Change status', printLabel: '🖨️ Print label',
        }
    };

let currentLang = typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_KEY) || 'es') : 'es';

export function getCurrentLang() {
    return currentLang;
}

export function setCurrentLang(lang) {
    currentLang = lang || 'es';
    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, currentLang);
    }
    return currentLang;
}

export function T(lang) {
    return TRANSLATIONS[lang || currentLang] || TRANSLATIONS.es;
}