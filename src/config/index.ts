export const CONFIG = {
  sharepoint: {
    sitePath: import.meta.env.VITE_SHAREPOINT_SITE_PATH || 'sanlucarfruit.sharepoint.com:/sites/InformationSystems',
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
      proveedores: 'StockControl_Proveedores',
    },
  },
  msal: {
    clientId: import.meta.env.VITE_MSAL_CLIENT_ID || '80ba264e-e1fc-4749-bf00-2c25b93b4ee5',
    authority: import.meta.env.VITE_MSAL_AUTHORITY || 'https://login.microsoftonline.com/f37778d8-59b2-4e5e-a56b-08eb8ad3c13a',
    redirectUri: window.location.href.split('?')[0].split('#')[0],
  },
  scopes: ['User.Read', 'Sites.ReadWrite.All'] as const,
  version: import.meta.env.VITE_APP_VERSION || '3.5.0',
}
