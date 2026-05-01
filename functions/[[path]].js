/**
 * Cloudflare Pages Function — multi-domain host-based routing
 *
 * Hub domain (landing page):
 *   nyc-affordability.com          → / (pass through as-is)
 *
 * Calculator domains (with full path preservation):
 *   nyc-co-op-affordability.com    → /coop
 *   nyc-condo-affordability.com    → /condo
 *   nyc-rent-affordability.com     → /rent
 *
 * Default Pages domain / unknown hosts: pass through as-is.
 * Each section's root / maps to its index.html; all sub-paths are
 * attempted verbatim, with a SPA-style fallback to section index.html
 * on 404 so deep links on custom domains work.
 *
 * To add a new domain:
 *   1. Add an entry to DOMAIN_ROUTES below (both apex and www).
 *      Use '' as the prefix for hub/root domains; use '/slug' for section domains.
 *   2. Add the custom domain in Cloudflare Pages → Custom domains.
 *   3. Point the domain's DNS to the Pages project.
 */

// '' prefix = hub domain, serve root as-is.
// '/slug'   = section domain, rewrite paths under /slug.
const DOMAIN_ROUTES = {
  'nyc-affordability.com':           '',
  'www.nyc-affordability.com':       '',
  'nyc-co-op-affordability.com':     '/coop',
  'www.nyc-co-op-affordability.com': '/coop',
  'nyc-condo-affordability.com':     '/condo',
  'www.nyc-condo-affordability.com': '/condo',
  'nyc-rent-affordability.com':      '/rent',
  'www.nyc-rent-affordability.com':  '/rent',
};

export async function onRequest(context) {
  const url     = new URL(context.request.url);
  const host    = url.hostname.toLowerCase();
  const reqPath = url.pathname;

  const prefix = DOMAIN_ROUTES[host];

  // Hub domain or unrecognised host — serve files as-is from root.
  if (prefix === '' || prefix === undefined) {
    return context.env.ASSETS.fetch(context.request);
  }

  // Section domain — rewrite to subdirectory with full path preservation.
  // / on the custom domain → /prefix/index.html
  // /some/path            → /prefix/some/path  (fallback → /prefix/index.html)
  const rewritten = reqPath === '/'
    ? prefix + '/index.html'
    : prefix + reqPath;

  const res = await context.env.ASSETS.fetch(new URL(rewritten, url));

  if (res.status === 404) {
    return context.env.ASSETS.fetch(new URL(prefix + '/index.html', url));
  }
  return res;
}
