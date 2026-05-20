# ADI L2 Benchmark Terminal

Single-page dashboard comparing ADI Chain against the 30 most active L2/rollup chains tracked by DefiLlama. Built for the Surgence Labs / ADI Foundation differentiator audit.

## What it shows

| Tab | Purpose |
|---|---|
| **Overview** | Headline KPIs (ADI TVL / Mcap / Mcap-TVL / 24h turnover), verdict callout, and ADI-vs-tier-median comparison table |
| **Tier Benchmarks** | Median TVL / Mcap / DEX vol / Mcap-TVL / Vol-TVL for Large (top 5), Mid (6–15), Small (16–30) tiers |
| **Mcap vs TVL** | Log–log scatter snapshot + 90-day trend chart with P25–P75 tier-median bands |
| **Full L2 Table** | All 48 rollup chains DefiLlama tracks, ADI pinned at top, with 7d/30d momentum columns |
| **Report** | 2-page plain-English brief on findings and implications |

## Run it

```bash
python3 -m http.server 5180
# open http://localhost:5180/
```

That's the whole stack — vanilla HTML + React via CDN + Babel Standalone. No build step.

## Refresh the data

`data.js` is a static JSON snapshot. To refresh from DefiLlama:

```bash
python3 scripts/fetch_l2.py            # snapshot: TVL / Mcap / DEX vol per L2
python3 scripts/fetch_l2_history.py    # 90d historical TVL + token price for trend chart
```

Both scripts hit free DefiLlama endpoints (no auth required) and write the merged dataset to `/tmp/adi_l2_benchmark_data.json`. Copy that into `data.js` as `window.ADI_L2_DATA = {...};`.

## Data sources

- **Chain TVL / Mcap / native token symbol** — `api.llama.fi/chains2/Rollup`
- **24h DEX volume per chain** — `api.llama.fi/overview/dexs/{slug}`
- **Token market cap** — `coins.llama.fi/mcaps` (POST)
- **Historical chain TVL** — `api.llama.fi/v2/historicalChainTvl/{name}`
- **Historical token price** — `coins.llama.fi/chart/coingecko:{slug}?span=90&period=1d`

ADI Token's CoinGecko slug is `adi-token`. ADI Chain isn't tracked on DefiLlama's chain list, so its TVL is treated as a constant ($2M, per the audit document's recognised Uniswap V3 liquidity).

## Design system

This dashboard is built on the [`@datumlabs/dashboard-kit`](https://github.com/datumlabs/datumlabs-sdk) Terminal UI design language. The tokens, panel chrome, chart wrapper, counter cards, data tables, and status bar are ported from `dashboard-kit/src/theme/globals.css` and `dashboard-kit/src/components/*.tsx`.

## Files

```
adi-l2-benchmark/
├── index.html              # the dashboard (vanilla HTML + React CDN)
├── data.js                 # exposes window.ADI_L2_DATA
├── branding/
│   ├── icon.png
│   └── logo-horizontal.png
├── scripts/
│   ├── fetch_l2.py         # snapshot fetch
│   └── fetch_l2_history.py # 90d history fetch
└── README.md
```

## License

Internal Surgence Labs / Datum Labs deliverable. Not for redistribution.
