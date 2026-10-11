import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: { main: resolve(import.meta.dirname, 'index.html'), dev: resolve(import.meta.dirname, 'dev.html'), pixmap: resolve(import.meta.dirname, 'pixmap.html') },
    },
  },
});
