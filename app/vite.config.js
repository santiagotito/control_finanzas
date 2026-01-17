import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Ajusta esto al nombre de tu repositorio en GitHub para el despliegue
  // Ejemplo: si tu repo es 'control-financiero', usa base: '/control-financiero/'
  // Si usas un dominio personalizado, puede ser '/'
  base: './',
})
