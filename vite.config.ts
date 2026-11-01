import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_');

  return {
    // En GitHub Pages se compila con VITE_BASE=/nombre-del-repo/.
    base: env.VITE_BASE || '/',
    plugins: [react()],
    server: { port: 5173, strictPort: false },
    preview: { port: 4173 },
    build: {
      target: 'es2020',
      cssCodeSplit: false,
      assetsInlineLimit: 4096,
    },
  };
});
