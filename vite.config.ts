import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env.local into process.env for API handlers
try {
  const envContent = readFileSync(resolve(__dirname, '.env.local'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq > 0 && !process.env[trimmed.slice(0, eq)]) {
      process.env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
    }
  }
} catch {}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'api-routes',
      configureServer(server) {
        // Handle API routes with the actual serverless function handlers
        server.middlewares.use(async (req, res, next) => {
          const routeMap: Record<string, string> = {
            '/docs/chat': './api/docs/chat.ts',
            '/mcp/docs': './api/mcp/docs.ts',
            '/mcp': './api/mcp.ts',
          };

          const handler = routeMap[req.url?.split('?')[0] || ''];
          if (!handler) return next();

          // Collect body
          let body = '';
          req.on('data', (c: Buffer) => (body += c));
          req.on('end', async () => {
            const url = new URL(req.url!, `http://localhost`);

            const vercelReq: any = {
              method: req.method,
              headers: req.headers,
              query: Object.fromEntries(url.searchParams),
              body: body ? JSON.parse(body) : undefined,
              url: req.url,
            };

            let statusCode = 200;
            let headersSent = false;

            const vercelRes: any = {
              headersSent: false,
              setHeader(k: string, v: string) { res.setHeader(k, v); },
              status(code: number) { statusCode = code; return vercelRes; },
              json(data: any) {
                headersSent = true;
                vercelRes.headersSent = true;
                res.writeHead(statusCode, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
              },
              write(data: string) {
                if (!headersSent) {
                  res.writeHead(statusCode, {
                    'Content-Type': res.getHeader('Content-Type') || 'text/event-stream',
                    'Cache-Control': 'no-cache, no-store',
                    'Connection': 'keep-alive',
                  });
                  headersSent = true;
                  vercelRes.headersSent = true;
                }
                res.write(data);
              },
              end(data?: string) {
                headersSent = true;
                vercelRes.headersSent = true;
                res.end(data);
              },
              redirect(code: number, url: string) {
                headersSent = true;
                vercelRes.headersSent = true;
                res.writeHead(code, { Location: url });
                res.end();
              },
            };

            try {
              const mod = await server.ssrLoadModule(handler);
              await mod.default(vercelReq, vercelRes);
            } catch (err: any) {
              console.error(`API error [${req.url}]:`, err);
              if (!headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
              }
            }
          });
        });
      },
    },
  ],
  build: {
    outDir: 'dist/client',
  },
});
