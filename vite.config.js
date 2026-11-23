/**
 * Configuración de Vite para el proyecto frontend.
 * Registra los plugins de React y Tailwind CSS, y ajusta el comportamiento de recarga en caliente (HMR).
 */
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default {
  // Plugins activos: soporte para React y compilación de Tailwind CSS
  plugins: [react(), tailwindcss()],
  server: {
    // Permite desactivar HMR y el observador de archivos mediante la variable de entorno DISABLE_HMR
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
};
