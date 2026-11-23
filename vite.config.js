import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default {
  plugins: [react(), tailwindcss()],
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
};
