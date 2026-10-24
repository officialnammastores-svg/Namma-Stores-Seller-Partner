import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  handleSellerApiRequest,
  resolveRuntimeEnv,
  createSupabaseServiceClient,
} from './src/server/sellerLeadApi.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

const runtimeEnv = resolveRuntimeEnv();
const sharedSupabaseClient = createSupabaseServiceClient(runtimeEnv);

function getExpressClientIp(req: express.Request): string {
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim()) {
    return cfIp.trim();
  }
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

async function startServer() {
  const app = express();

  // Capture raw body for /api/* routes (up to 128kb so >64kb check returns 413 cleanly)
  app.use(
    '/api',
    express.text({
      type: '*/*',
      limit: '128kb',
    })
  );

  // Delegate all /api/* requests to the unified Web Fetch API handler
  app.use('/api', async (req, res) => {
    try {
      const protocol =
        (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim() ||
        req.protocol ||
        'http';
      const host = req.headers.host || `localhost:${PORT}`;
      const fullUrl = new URL(req.originalUrl || req.url, `${protocol}://${host}`);

      const headers = new Headers();
      for (const [key, val] of Object.entries(req.headers)) {
        if (typeof val === 'string') {
          headers.set(key, val);
        } else if (Array.isArray(val)) {
          headers.set(key, val.join(', '));
        }
      }

      const method = req.method.toUpperCase();
      const hasBody = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
      const rawBody =
        hasBody && typeof req.body === 'string'
          ? req.body
          : hasBody && req.body && typeof req.body === 'object'
            ? JSON.stringify(req.body)
            : undefined;

      const webRequest = new Request(fullUrl.toString(), {
        method,
        headers,
        body: rawBody,
      });

      const webResponse = await handleSellerApiRequest(
        webRequest,
        resolveRuntimeEnv(),
        { supabaseClient: sharedSupabaseClient },
        getExpressClientIp(req)
      );

      res.status(webResponse.status);
      webResponse.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      const responseText = await webResponse.text();
      res.send(responseText);
    } catch (err: any) {
      if (err?.type === 'entity.too.large') {
        res.status(413).json({
          success: false,
          message: 'Request payload is too large.',
        });
        return;
      }
      console.error('[API Adapter Error]', err?.message || err);
      res.status(500).json({
        success: false,
        message: 'An unexpected server error occurred. Please try again shortly.',
      });
    }
  });

  // ---------------------------------------------------------------------------
  // VITE MIDDLEWARE (DEVELOPMENT) OR STATIC DIST (PRODUCTION)
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[Namma Stores Seller Partner] Server listening on http://0.0.0.0:${PORT}`
    );
  });
}

startServer().catch((err) => {
  console.error('[Server Startup Error]', err);
  process.exit(1);
});
