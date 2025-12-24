import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Garante que caminhos como /assets virem ./assets para o Electron
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    target: 'chrome120', 
    minify: 'terser', // Utiliza o terser para compressão offline
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
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