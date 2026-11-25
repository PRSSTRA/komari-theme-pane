import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

const { short } = JSON.parse(readFileSync(new URL('./komari-theme.json', import.meta.url), 'utf8'));

export default defineConfig(({ command, isPreview }) => {
  const target = process.env.VITE_API_TARGET || process.env.KOMARI_URL;
  const proxy = target && {
    '/api': { target, changeOrigin: true, ws: true, rewriteWsOrigin: true },
    '/admin': { target, changeOrigin: true },
  };

  return {
    base: command === 'build' || isPreview ? `/themes/${short}/dist/` : '/',
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    plugins: [react(), tailwindcss()],
    server: { proxy },
    preview: { proxy },
  };
});
