import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@structured-qa/shared': resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  optimizeDeps: {
    include: ['@structured-qa/shared'],
  },
  build: {
    commonjsOptions: {
      include: [/@structured-qa\/shared/, /node_modules/],
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
