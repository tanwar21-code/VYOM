import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/demo-pairs': process.env.VITE_API_BASE_URL || 'https://vyom-1.onrender.com',
        '/register': process.env.VITE_API_BASE_URL || 'https://vyom-1.onrender.com',
        '/compare': process.env.VITE_API_BASE_URL || 'https://vyom-1.onrender.com',
        '/health': process.env.VITE_API_BASE_URL || 'https://vyom-1.onrender.com',
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
