# NYC Affordability

A suite of free, single-page NYC housing affordability calculators, each deployed as its own custom domain via a Cloudflare Pages multi-domain routing setup.

| Calculator | Domain | Path |
|---|---|---|
| Landing page | [nyc-affordability.com](https://www.nyc-affordability.com/) | `/` |
| Co-op Affordability | [nyc-affordability.com/coop](https://www.nyc-affordability.com/coop/) | `/coop/` |
| Condo Affordability | [nyc-condo-affordability.com](https://www.nyc-condo-affordability.com/) | `/condo/` |
| Rent Affordability | [nyc-rent-affordability.com](https://www.nyc-rent-affordability.com/) | `/rent/` |

---

## How domain routing works

A single Cloudflare Pages Function at [`/functions/[[path]].js`](functions/%5B%5Bpath%5D%5D.js) intercepts every request and routes based on the incoming `hostname`:

```
nyc-affordability.com              →  / (hub landing page, pass through)
nyc-affordability.com/coop/        →  /coop/ (co-op calculator)
nyc-co-op-affordability.com        →  localStorage migration page, then https://www.nyc-affordability.com/coop/
nyc-condo-affordability.com        →  /condo/[path]
nyc-rent-affordability.com         →  /rent/[path]
default Pages URL / unknown        →  pass through (serves /index.html at root)
```

Full **path preservation** is enabled for active section domains: a request to `nyc-condo-affordability.com/some/path` is rewritten to `/condo/some/path`. If the asset is not found (HTTP 404), the function falls back to the section's `index.html` so deep links always work. The legacy co-op domain preserves paths while migrating saved browser inputs, so `www.nyc-co-op-affordability.com/details` lands on `https://www.nyc-affordability.com/coop/details`.

The co-op migration has to run in the browser because `localStorage` is scoped by domain. The legacy domain serves a short noindex migration page that copies `nyc_coop_inputs` and `nyc_shared_profile` into a URL fragment, opens the canonical `/coop/` page, and the canonical page immediately imports those values and removes the fragment from browser history. Non-HTML requests still receive a normal 301 redirect.

The default Pages domain also serves all paths directly by file-system structure:
- `[pages-url]/` → landing page
- `[pages-url]/coop/` → co-op calculator
- `[pages-url]/condo/` → condo calculator
- `[pages-url]/rent/` → rent calculator

### Adding a new domain

1. Add entries to `DOMAIN_ROUTES` in `functions/[[path]].js`:
   ```js
   'example.com':     '/example',
   'www.example.com': '/example',
   ```
   To retire a standalone calculator domain in favor of the hub, add it to `DOMAIN_REDIRECTS` instead.
2. Create the static page at `/example/index.html`.
3. In Cloudflare Pages → your project → **Custom domains**, add the domain.
4. Update DNS (CNAME or ALIAS to the Pages project URL).
5. Add cross-links in the footer of each existing page and on `/index.html`.

---

## Repository structure

```
/
├── index.html               ← Landing page (NYC Affordability hub)
├── coop/
│   └── index.html           ← NYC Co-op Affordability calculator
├── condo/
│   └── index.html           ← NYC Condo Affordability calculator
├── rent/
│   └── index.html           ← NYC Rent Affordability calculator
├── functions/
│   └── [[path]].js          ← Cloudflare Pages routing function
├── wrangler.toml
└── README.md
```

All calculators are **pure HTML/CSS/JS** — no build step, no dependencies, no frameworks.

---

## Deploy

### Cloudflare Pages (recommended)

1. Fork or clone this repo.
2. In **Cloudflare Pages → Create project → Connect repo**.
3. Leave the build command blank; set the build output directory to `/` (or leave as default).
4. Deploy.
5. Add each custom domain under **Settings → Custom domains** and configure DNS.

### Local preview

```bash
npx wrangler pages dev .
```

This runs the Pages Function locally so host-based routing works. You can test it by passing a custom `Host` header:

```bash
curl -H "Host: nyc-condo-affordability.com" http://localhost:8788/
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

## Cloudflare Pages configuration notes

- **Build command:** *(leave blank)*
- **Build output directory:** `/` (root of the repo)
- **Compatibility date:** see `wrangler.toml`
- The `[[path]]` function filename uses double brackets — this is a Cloudflare Pages catch-all route pattern, not a typo.
- `context.env.ASSETS` is the Cloudflare Pages asset-binding. It is only available in Pages Functions, not standalone Workers.

---

## Disclaimer

These calculators are for informational purposes only and do not constitute financial, legal, or mortgage advice. Tax rates, board requirements, and closing costs vary by building, lender, and transaction. Always verify all figures with a licensed mortgage professional and real estate attorney before making housing decisions.
