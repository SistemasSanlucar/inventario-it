import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Use relative asset paths so the built app works from a GitHub Pages project site.
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
  },
})
