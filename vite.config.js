import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

const { short } = JSON.parse(readFileSync(new URL('./komari-theme.json', import.meta.url), 'utf8'));

export default defineConfig(({ command, isPreview }) => {
  const target = process.env.VITE_API_TARGET || process.env.KOMARI_URL;
  const origin = target && new URL(target).origin;
  const proxy = target && {
    '/api': {
      target, changeOrigin: true, ws: true, rewriteWsOrigin: true,
      configure(proxy) {
        proxy.on('proxyReq', (upstream, incoming) => {
          const browserOrigin = incoming.headers.origin;
          if (!browserOrigin || !incoming.headers.host) return;
          if (browserOrigin === `http://${incoming.headers.host}` || browserOrigin === `https://${incoming.headers.host}`) {
            upstream.setHeader('Origin', origin);
          }
        });
      },
    },
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
