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

// Vercel's Edge runtime injects env vars at process.env at build time.
// Declare the shape locally so we can use the idiomatic access without
// pulling in @types/node for a non-Node runtime.
declare const process: { env: Record<string, string | undefined> };

export const config = {
  // Gate every path. The favicon is included; that's fine, it'll prompt once.
  matcher: '/(.*)',
};

const REALM = 'ADI L2 Benchmark';

export default function middleware(request: Request): Response | undefined {
  const password = process.env.DASHBOARD_PASSWORD;
  const user = process.env.DASHBOARD_USERNAME || 'adi';

  if (!password) {
    // Surface every env var name visible to the middleware so a missing
    // configuration is debuggable from the response itself rather than
    // requiring access to Vercel logs.
    const visible = Object.keys(process.env || {}).sort().join(', ') || '(none)';
    return new Response(
      'Dashboard misconfigured: DASHBOARD_PASSWORD env var is not set on this deployment.\n\n' +
      'Env vars visible to the Edge runtime on this build:\n  ' + visible + '\n\n' +
      'Fix: add DASHBOARD_PASSWORD in Vercel → Project Settings → Environment Variables, ' +
      'enable it for the Production environment, then trigger a redeploy.',
      { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } },
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
