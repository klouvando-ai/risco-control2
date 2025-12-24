import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Garante que caminhos sejam relativos para o Electron
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
    assetsDir: 'assets',
    rollupOptions: {
      // Garante que o build não tente buscar nada externo
      external: []
    }
  },
  server: {
    port: 3004,
    strictPort: true
  }
});