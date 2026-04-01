export const IS_FILE_PROTOCOL = window.location.protocol === 'file:';

export const CONFIG = {
        sharepoint: {
            sitePath: 'sanlucarfruit.sharepoint.com:/sites/InformationSystems',
            lists: {
                inventario: 'StockControl_InventarioIT',
                tecnicos: 'StockControl_TecnicosIT',
                historial: 'StockControl_HistorialIT',
                admins: 'StockControl_Admins',
                asignaciones: 'StockControl_Asignaciones',
                catalogo: 'StockControl_Catalogo',
                ubicaciones: 'StockControl_Ubicaciones',
                activos: 'StockControl_Activos',
                sociedades: 'StockControl_Sociedades',
                proveedores: 'StockControl_Proveedores'
            }
        },
        msal: {
            clientId: '80ba264e-e1fc-4749-bf00-2c25b93b4ee5',
            authority: 'https://login.microsoftonline.com/f37778d8-59b2-4e5e-a56b-08eb8ad3c13a',
            redirectUri: window.location.href.split('?')[0].split('#')[0]
        },
        scopes: ['User.Read', 'Sites.ReadWrite.All'],
        version: '3.0.6'
    };