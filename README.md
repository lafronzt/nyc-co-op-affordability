# NYC Co-op Affordability Finder

A free, single-page calculator that reverse-engineers your maximum NYC co-op purchase price from your financial profile. Live at **[nyc-co-op-affordability.com](https://www.nyc-co-op-affordability.com/)**.

## What it does

NYC co-op purchases involve constraints that a standard mortgage calculator ignores: board-mandated post-close reserves, co-op-specific closing costs (flip tax, mansion tax), and strict debt-to-income limits set by the building's board. This tool solves for the *lower* of two binding constraints:

- **Cash / Reserves** — your liquid assets must cover the down payment, all closing costs, and a reserve cushion (typically 24 months of maintenance + mortgage payments)
- **DTI / Income** — your total monthly housing payment must stay within the board's debt-to-income limit (most NYC co-op boards use 25–30%)

## Features

- Account balances table with per-account liquidity percentages (for 401k, Roth IRA, brokerage, etc.)
- Income & existing debt inputs
- Configurable mortgage assumptions (rate, term, down payment %)
- Co-op-specific requirements (post-close reserve months, max DTI, monthly maintenance)
- Detailed closing cost breakdown (attorney fees, bank attorney, co-op application fee, variable costs)
- Live cash waterfall and monthly cost snapshot
- Feasibility indicators for Cash, DTI, and Reserves
- "Model a specific price" override to stress-test any target
- Fully client-side — no data leaves your browser
- Responsive layout, print-friendly

## Tech stack

- Pure HTML/CSS/JS — no build step, no dependencies, no frameworks
- Deployed on [Cloudflare Pages](https://pages.cloudflare.com/) via `wrangler.toml`

## Deploy

**Cloudflare Pages (recommended):**

1. Fork or clone this repo
2. In Cloudflare Pages → Create project → Connect repo
3. Leave build command blank; set build output directory to `/`
4. Deploy

**Local preview:**

```bash
npx wrangler pages dev .
```

Or just open `index.html` directly in a browser — it works offline with no server.

## Disclaimer

This calculator is for informational purposes only and does not constitute financial, legal, or mortgage advice. Co-op board requirements, tax rates, and closing costs vary by building and transaction. Always verify figures with a licensed mortgage professional and real estate attorney before making any purchase decisions.
