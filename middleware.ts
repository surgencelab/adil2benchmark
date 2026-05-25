/**
 * Vercel Edge Middleware: HTTP Basic Auth gate for the whole dashboard.
 *
 * Runs at the Vercel CDN layer before any static asset is served, so
 * unauthenticated requests never reach the React bundle or public/data.json.
 *
 * Username is fixed: `adi`. Password defaults to the value baked here for
 * convenience; override with the DASHBOARD_PASSWORD env var on Vercel
 * (Project Settings → Environment Variables) to rotate without a code push.
 */

export const config = {
  // Gate every path. The favicon is included; that's fine, it'll prompt once.
  matcher: '/(.*)',
};

const REALM = 'ADI L2 Benchmark';
const USER = 'adi';
const DEFAULT_PASSWORD = 'ADSURL2#';

export default function middleware(request: Request): Response | undefined {
  const password = (globalThis as any).process?.env?.DASHBOARD_PASSWORD || DEFAULT_PASSWORD;
  const expected = 'Basic ' + btoa(`${USER}:${password}`);
  const provided = request.headers.get('authorization');

  if (provided === expected) {
    // Auth OK — fall through to the static asset / SPA rewrite.
    return undefined;
  }

  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
      'content-type': 'text/plain',
    },
  });
}
