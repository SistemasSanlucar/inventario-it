import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path:
//  - Producción (main → inventario-it): './' (rutas relativas, funciona en /inventario-it/)
//  - Desarrollo (developer → inventario-it-dev): '/inventario-it-dev/' (vía VITE_BASE_PATH)
//  - Dev local (vite dev): './' por defecto
// El workflow del repo target pasa VITE_BASE_PATH=/inventario-it-dev/ al build.
const basePath = process.env.VITE_BASE_PATH || './'

export default defineConfig({
  base: basePath,
  plugins: [react()],
  server: {
    port: 5173,
  },
})
