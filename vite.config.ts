import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', 
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    target: 'chrome120', 
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove logs de console no build final
        drop_debugger: true
      }
    }
  },
  server: {
    port: 3004,
    strictPort: true
  }
});