import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { handleTmdbApiRequest } from './api/_lib/router';

function tmdbApiDevMiddleware(): Plugin {
  return {
    name: 'tmdb-api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && (req.url.startsWith('/api/tmdb/') || req.url === '/api/tmdb')) {
          try {
            await handleTmdbApiRequest(req, res);
          } catch (err: any) {
            console.error('[Vite TMDB Dev Middleware Error]:', err);
            if (!res.writableEnded) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Erro interno no middleware TMDB de desenvolvimento.',
                  },
                })
              );
            }
          }
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), tmdbApiDevMiddleware()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
