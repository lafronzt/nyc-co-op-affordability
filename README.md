# NYC Affordability

A suite of free, single-page NYC apartment, home, and housing affordability calculators deployed on one primary domain via a Cloudflare Worker with Static Assets.

| Calculator | URL | Path |
|---|---|---|
| Landing page | [nyc-affordability.com](https://www.nyc-affordability.com/) | `/` |
| Co-op Affordability | [nyc-affordability.com/coop](https://www.nyc-affordability.com/coop/) | `/coop/` |
| Condo Affordability | [nyc-affordability.com/condo](https://www.nyc-affordability.com/condo/) | `/condo/` |
| Rent Affordability | [nyc-affordability.com/rent](https://www.nyc-affordability.com/rent/) | `/rent/` |
| Compare All Options | [nyc-affordability.com/compare](https://www.nyc-affordability.com/compare/) | `/compare/` |
| Co-op legacy domain | [nyc-co-op-affordability.com](https://www.nyc-co-op-affordability.com/) | redirects to `/coop/` |

---

## How domain routing works

A single Cloudflare Worker entrypoint at [`/functions/[[path]].js`](functions/%5B%5Bpath%5D%5D.js) intercepts every request and routes based on the incoming `hostname`:

```
nyc-affordability.com              →  / (hub landing page, pass through)
nyc-affordability.com/coop/        →  /coop/ (co-op calculator)
nyc-affordability.com/condo/       →  /condo/ (condo calculator)
nyc-affordability.com/rent/        →  /rent/ (rent calculator)
nyc-affordability.com/compare/     →  /compare/ (cross-calculator dashboard)
nyc-co-op-affordability.com        →  localStorage migration page, then https://www.nyc-affordability.com/coop/
default Worker URL / unknown       →  pass through (serves /index.html at root)
```

The primary domain is the canonical SEO target for all calculators. The legacy co-op domain preserves paths while migrating saved browser inputs, so `www.nyc-co-op-affordability.com/details` lands on `https://www.nyc-affordability.com/coop/details`.

The co-op migration has to run in the browser because `localStorage` is scoped by domain. The legacy domain serves a short noindex migration page that copies `nyc_coop_inputs` and `nyc_shared_profile` into a URL fragment, opens the canonical `/coop/` page, and the canonical page immediately imports those values and removes the fragment from browser history. Non-HTML requests still receive a normal 301 redirect.

The default Worker domain also serves all paths directly by file-system structure:
- `[worker-url]/` → landing page
- `[worker-url]/coop/` → co-op calculator
- `[worker-url]/condo/` → condo calculator
- `[worker-url]/rent/` → rent calculator
- `[worker-url]/compare/` → cross-calculator comparison dashboard

### Adding a new domain

1. Add entries to `DOMAIN_ROUTES` in `functions/[[path]].js`:
   ```js
   'example.com':     '/example',
   'www.example.com': '/example',
   ```
   To retire a standalone calculator domain in favor of the hub, add it to `DOMAIN_REDIRECTS` instead.
2. Create the static page at `/public/example/index.html`.
3. In Cloudflare Workers → your Worker → **Settings** → **Domains & Routes**, add the domain or route.
4. Update DNS as needed for the Worker custom domain or route.
5. Add cross-links in the footer of each existing page and on `/public/index.html`.

---

## Repository structure

```
/
├── public/
│   ├── index.html           ← Landing page (NYC Affordability hub)
│   ├── coop/
│   │   └── index.html       ← NYC Co-op Affordability calculator
│   ├── condo/
│   │   └── index.html       ← NYC Condo Affordability calculator
│   ├── compare/
│   │   └── index.html       ← Rent vs co-op vs condo comparison dashboard
│   └── rent/
│       └── index.html       ← NYC Rent Affordability calculator
├── functions/
│   └── [[path]].js          ← Cloudflare Worker routing entrypoint
├── wrangler.toml
└── README.md
```

All calculators are **pure HTML/CSS/JS** — no build step, no dependencies, no frameworks.

The `/compare/` dashboard is also static. It reads the shared browser profile saved at `nyc_shared_profile` and can update it when the page's Save toggle is enabled, then combines that profile with each calculator's default assumptions to compare max affordable rent, max co-op price, max condo price, cash required, monthly housing cost, DTI, reserve requirement, and binding constraint.

---

## Deploy

### Cloudflare Workers

1. Fork or clone this repo.
2. In **Cloudflare Workers & Pages → Create → Worker → Import a repository**, connect the repo.
3. Use this repo's `wrangler.toml` as the deployment config.
4. Deploy on push.
5. Add each custom domain under the Worker's **Settings → Domains & Routes** and configure DNS.

### Local preview

```bash
npx wrangler dev --local
```

This runs the Worker locally so host-based routing works. You can test it by passing a custom `Host` header:

```bash
curl -H "Host: nyc-co-op-affordability.com" http://localhost:8788/
```

Or just open the files directly in a browser — each calculator works standalone with no server (`file://` protocol).

---

## Calculator assumptions & sources

### Co-op (`/coop/`)
- Post-close reserves: 12–24 months maintenance + mortgage (board-specific)
- Board DTI: typically 25–30% of gross monthly income
- Sources: StreetEasy/Baruch CUNY Q1 2025, Freddie Mac PMMS, Prevu/Compass 2025–2026

### Condo (`/condo/`)
- Lender back-end DTI: 43% (includes mortgage P&I + common charges + property taxes + insurance + other debt)
- Mortgage rate default: **6.30%** (Freddie Mac PMMS, April 30, 2026)
- Mansion tax: buyer-paid on purchases ≥ $1M, tiered 1.00%–3.90% (NYS)
- Mortgage recording tax: 1.80% of loan < $500K; 1.925% of loan ≥ $500K (NYC/NYS DOF/ACRIS)
- Property tax default: $1,250/mo (Habitat Magazine / NYC DOF tentative 2025–2026 roll, citywide avg $15,134/unit)
- Sources: Freddie Mac PMMS, NYC DOF/ACRIS, NYS mansion tax guidance, Habitat Magazine

### Rent (`/rent/`)
- Landlord income multiplier: 40× annual income (NYC market practice)
- Broker fee: defaults to **no tenant-paid fee** per NYC FARE Act (effective June 11, 2025)
- Security deposit: capped at 1 month's rent (NYS law)
- Application fee: $20 cap (NYC DCWP)
- Rent defaults: citywide median $3,995/mo (StreetEasy March 2026), avg $3,583/mo (Zillow April 4, 2026)
- Sources: StreetEasy March 2026, Zillow April 2026, NYC DCWP FARE Act FAQ Aug 2025, NYS AG Tenants' Rights Guide, NerdWallet Jan 2026

---

## Cloudflare Workers configuration notes

- **Entrypoint:** `functions/[[path]].js`
- **Assets directory:** `public`
- **Compatibility date:** see `wrangler.toml`
- `run_worker_first = true` is required so host-based routing runs before static assets are served.
- `env.ASSETS` is the Workers Static Assets binding used by the Worker to serve files from `public`.

---

## Disclaimer

These calculators are for informational purposes only and do not constitute financial, legal, or mortgage advice. Tax rates, board requirements, and closing costs vary by building, lender, and transaction. Always verify all figures with a licensed mortgage professional and real estate attorney before making housing decisions.
