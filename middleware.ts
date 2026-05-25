/**
 * Vercel Edge Middleware: HTTP Basic Auth gate for the whole dashboard.
 *
 * Runs at the Vercel CDN layer before any static asset is served, so
 * unauthenticated requests never reach the React bundle or public/data.json.
 *
 * REQUIRED ENV VARS (set in Vercel → Project Settings → Environment Variables):
 *   DASHBOARD_PASSWORD   the password the team uses to sign in
 *   DASHBOARD_USERNAME   optional, defaults to "adi"
 *
 * No password is baked into source. If DASHBOARD_PASSWORD is unset the
 * middleware fails closed with a 503, so a misconfiguration cannot
 * accidentally publish the dashboard.
 */

export const config = {
  // Gate every path. The favicon is included; that's fine, it'll prompt once.
  matcher: '/(.*)',
};

const REALM = 'ADI L2 Benchmark';

export default function middleware(request: Request): Response | undefined {
  const env = (globalThis as any).process?.env ?? {};
  const password = env.DASHBOARD_PASSWORD;
  const user = env.DASHBOARD_USERNAME || 'adi';

  if (!password) {
    return new Response(
      'Dashboard misconfigured: DASHBOARD_PASSWORD env var is not set on this deployment.',
      { status: 503, headers: { 'content-type': 'text/plain' } },
    );
  }

  const expected = 'Basic ' + btoa(`${user}:${password}`);
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
