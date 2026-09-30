import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    open: false,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.KB_API_PORT || 5174}`,
        changeOrigin: false,
        configure(proxy) {
          proxy.on('proxyRes', (response, request, client) => {
            if (request.url?.startsWith('/api/events')) response.once('aborted', () => client.destroy());
          });
        },
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-hljs': ['highlight.js'],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
});
