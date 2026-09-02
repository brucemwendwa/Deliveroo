import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // The map stack is the heaviest dependency and only the booking and
        // tracking screens touch it, so it is worth keeping out of the chunk
        // every visitor downloads. React and the store split off for the same
        // reason: they change far less often than app code, so a separate
        // chunk stays cached across deploys.
        manualChunks: {
          'vendor-map': ['leaflet', 'react-leaflet'],
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-store': ['@reduxjs/toolkit', 'react-redux']
        }
      }
    }
  },
  server: {
    port: 5173,
    // Flask dev server. Any fetch to /api/... is forwarded, so the frontend
    // never needs to know the backend host.
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
