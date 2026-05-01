/**
 * Cloudflare Pages Function — multi-domain host-based routing
 *
 * Hub domain (landing page):
 *   nyc-affordability.com          → / (pass through as-is)
 *
 * Legacy calculator domains (canonical redirects):
 *   nyc-co-op-affordability.com    → https://www.nyc-affordability.com/coop/
 *
 * Calculator domains (with full path preservation):
 *   nyc-condo-affordability.com    → /condo
 *   nyc-rent-affordability.com     → /rent
 *
 * Default Pages domain / unknown hosts: pass through as-is.
 * Each section's root / maps to its index.html; all sub-paths are
 * attempted verbatim, with a SPA-style fallback to section index.html
 * on 404 so deep links on custom domains work.
 *
 * To add a new domain:
 *   1. Add an entry to DOMAIN_ROUTES below (both apex and www), or to
 *      DOMAIN_REDIRECTS when retiring a standalone calculator domain.
 *      Use '' as the prefix for hub/root domains; use '/slug' for section domains.
 *   2. Add the custom domain in Cloudflare Pages → Custom domains.
 *   3. Point the domain's DNS to the Pages project.
 */

const CANONICAL_HOST = 'www.nyc-affordability.com';

const DOMAIN_REDIRECTS = {
  'nyc-co-op-affordability.com':     '/coop',
  'www.nyc-co-op-affordability.com': '/coop',
};

// '' prefix = hub domain, serve root as-is.
// '/slug'   = section domain, rewrite paths under /slug.
const DOMAIN_ROUTES = {
  'nyc-affordability.com':           '',
  'www.nyc-affordability.com':       '',
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
  const redirectPrefix = DOMAIN_REDIRECTS[host];

  if (redirectPrefix) {
    return migrateLocalStorageThenRedirect(context.request, url, redirectPrefix);
  }

  // Hub domain or unrecognised host — serve files as-is from root.
  if (prefix === '' || prefix === undefined) {
    return context.env.ASSETS.fetch(context.request);
  }

  // Section domain — rewrite to subdirectory with full path preservation.
  // / on the custom domain → /prefix/index.html
  // /some/path            → /prefix/some/path  (fallback → /prefix/index.html)
  // Clone the URL so method, headers, and query params are all preserved.
  //
  // Strip any duplicate prefix (e.g. /condo/foo on nyc-condo-affordability.com
  // must not become /condo/condo/foo).
  const strippedPath = reqPath.startsWith(prefix + '/') ? reqPath.slice(prefix.length) : reqPath;

  const rewrittenUrl = new URL(url);
  rewrittenUrl.pathname = strippedPath === '/' ? prefix + '/index.html' : prefix + strippedPath;

  const res = await context.env.ASSETS.fetch(new Request(rewrittenUrl, context.request));

  // Only fall back to index.html for navigation requests — assets (CSS/JS/images)
  // that are genuinely missing should return 404, not the app shell.
  const isNavRequest = !rewrittenUrl.pathname.match(/\.[^/]+$/);
  if (res.status === 404 && isNavRequest) {
    const fallbackUrl = new URL(url);
    fallbackUrl.pathname = prefix + '/index.html';
    return context.env.ASSETS.fetch(new Request(fallbackUrl, context.request));
  }
  return res;
}

function buildCanonicalUrl(url, prefix) {
  const target = new URL(url);
  target.protocol = 'https:';
  target.hostname = CANONICAL_HOST;

  const reqPath = url.pathname;
  const strippedPath =
    reqPath === prefix ? '/' :
    reqPath.startsWith(prefix + '/') ? reqPath.slice(prefix.length) :
    reqPath;
  target.pathname = strippedPath === '/' ? prefix + '/' : prefix + strippedPath;
  return target;
}

function migrateLocalStorageThenRedirect(request, url, prefix) {
  const target = buildCanonicalUrl(url, prefix);
  const accept = request.headers.get('accept') || '';
  const isNavigation = request.method === 'GET' && accept.includes('text/html');

  if (!isNavigation) {
    return Response.redirect(target.toString(), 301);
  }

  return new Response(renderStorageMigrationPage(target), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex',
    },
  });
}

function renderStorageMigrationPage(target) {
  const canonical = escapeHtml(target.toString());
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<link rel="canonical" href="${canonical}">
<title>Moving to NYC Affordability</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#f3f4f6;color:#111827}
main{max-width:480px;padding:32px;text-align:center}
a{color:#2563eb}
</style>
</head>
<body>
<main>
<h1>Opening the co-op calculator...</h1>
<p>Your saved inputs are moving to the new NYC Affordability URL in this browser.</p>
<p><a id="fallback" href="${canonical}">Continue to the co-op calculator</a></p>
</main>
<script>
(function () {
  var target = ${JSON.stringify(target.toString())};
  var keys = ['nyc_coop_inputs', 'nyc_shared_profile'];
  var payload = {};
  keys.forEach(function (key) {
    try {
      var value = localStorage.getItem(key);
      if (value !== null) payload[key] = value;
    } catch (e) {}
  });
  try {
    if (Object.keys(payload).length) {
      var encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      target += '#migrate-local-storage=' + encodeURIComponent(encoded);
    }
  } catch (e) {}
  location.replace(target);
}());
</script>
</body>
</html>`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}
