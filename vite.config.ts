import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Importante para o Electron carregar arquivos relativos
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    // Garante que o build seja compatível com navegadores embutidos no Electron
    target: 'chrome120', 
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          utils: ['recharts', 'jspdf', 'jspdf-autotable', 'lucide-react']
        }
      }
    }
  },
  server: {
    port: 3004,
    strictPort: true
  }
});