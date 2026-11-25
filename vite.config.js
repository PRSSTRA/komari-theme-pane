import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command, isPreview }) => {
  const target = process.env.KOMARI_URL;
  const proxy = target && {
    '/api': { target, changeOrigin: true, ws: true, rewriteWsOrigin: true },
    '/admin': { target, changeOrigin: true },
  };

  return {
    base: command === 'build' || isPreview ? '/themes/Pane/dist/' : '/',
    plugins: [tailwindcss()],
    server: { proxy },
    preview: { proxy },
  };
});
