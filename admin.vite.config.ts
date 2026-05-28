import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  root: resolve(__dirname, 'frontend/admin'),
  base: '/admin/',
  build: {
    outDir: resolve(__dirname, 'public/admin'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'frontend/admin/index.html')
    }
  }
});
