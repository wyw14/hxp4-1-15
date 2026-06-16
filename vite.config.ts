import { defineConfig } from 'vite';

export default defineConfig({
  root: 'client',
  server: {
    port: 41015,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:42015',
        changeOrigin: true
      }
    }
  }
});
