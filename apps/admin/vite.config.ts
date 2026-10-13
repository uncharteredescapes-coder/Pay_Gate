import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@paygate/domain': path.resolve(__dirname, '../../packages/domain/src/index.ts'),
      '@paygate/contracts': path.resolve(__dirname, '../../packages/contracts/src/index.ts'),
      '@paygate/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@paygate/i18n': path.resolve(__dirname, '../../packages/i18n/src/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
