import {
  handleSellerApiRequest,
  type SellerApiEnv,
} from '../src/server/sellerLeadApi.ts';

export interface CloudflareWorkerEnv extends SellerApiEnv {
  ASSETS?: {
    fetch: (request: Request | string) => Promise<Response>;
  };
}

export default {
  async fetch(
    request: Request,
    env: CloudflareWorkerEnv
  ): Promise<Response> {
    const url = new URL(request.url);

    // 1. Route all /api/* requests to the server-side API handler
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      return handleSellerApiRequest(request, env);
    }

    // 2. Serve built Vite static assets & SPA fallback via Cloudflare Assets binding
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      const assetResponse = await env.ASSETS.fetch(request);
      if (
        assetResponse.status === 404 &&
        request.method === 'GET' &&
        (request.headers.get('accept') || '').includes('text/html')
      ) {
        const indexUrl = new URL('/index.html', url.origin);
        return env.ASSETS.fetch(new Request(indexUrl.toString(), request));
      }
      return assetResponse;
    }

    return new Response('Not Found', { status: 404 });
  },
};
