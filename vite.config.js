import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import manifest from './komari-theme.json' with { type: 'json' };

export default defineConfig(({ command, mode }) => {
  const { VITE_API_TARGET } = loadEnv(mode, process.cwd());
  return {
    plugins: [tailwindcss()],
    base: command === 'build' ? `/themes/${manifest.short}/dist/` : '/',
    server: VITE_API_TARGET ? {
      proxy: { '/api': { target: VITE_API_TARGET, changeOrigin: true, ws: true } },
    } : undefined,
  };
});
