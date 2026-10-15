import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// Build-only: injects a strict Content-Security-Policy <meta> into index.html.
// The dev server is left alone because Vite's HMR needs inline scripts.
function cspPlugin(apiBase?: string): Plugin {
  return {
    name: 'skillora-csp',
    apply: 'build',
    transformIndexHtml(html) {
      if (!apiBase) throw new Error('VITE_API_BASE_URL must be set for production builds');
      const csp = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self'",
        "img-src 'self' data:",
        "font-src 'self' data:",
        `connect-src 'self' ${new URL(apiBase).origin}`,
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ');
      return {
        html,
        tags: [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp }, injectTo: 'head-prepend' }],
      };
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), tailwindcss(), cspPlugin(env.VITE_API_BASE_URL)],
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
    server: { port: 5173, strictPort: true },   // localhost only; matches the API's CORS default
  };
});
