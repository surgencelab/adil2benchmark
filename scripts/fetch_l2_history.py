#!/usr/bin/env python3
"""Fetch 90d historical TVL + token price per L2, compute Mcap/TVL series + tier medians + momentum."""
import subprocess, json, urllib.parse, statistics, time, sys

def curl_json(url):
    try:
        out = subprocess.check_output(["curl", "-sS", "--max-time", "30", url], stderr=subprocess.DEVNULL)
        return json.loads(out)
    except Exception as e:
        return None

# Load existing dataset
with open("/tmp/adi_l2_benchmark_data.json") as f:
    base = json.load(f)

# Pick the L2s we care about for the chart — Large + Mid + Small tiers only (skip Micro)
TIER_KEEP = {"Large", "Mid", "Small"}
chains_to_fetch = [r for r in base["rows"] if r["tier"] in TIER_KEEP]
print(f"Fetching history for {len(chains_to_fetch)} chains across 3 tiers", file=sys.stderr)

# Always include ADI (handled separately at end)
DAYS = 90
NOW_TS = 1779321600  # last known timestamp from earlier probe
# Daily timestamps backward 90d
day_seconds = 86400
days = [NOW_TS - (DAYS - 1 - i) * day_seconds for i in range(DAYS)]

def to_daily(series, key_t="date", key_v="tvl"):
    """Bucket {date, value} series to per-day map (UTC date floor)."""
    bucket = {}
    for p in series:
        t = p[key_t]
        day = (t // day_seconds) * day_seconds
        bucket[day] = p[key_v]
    return bucket

def value_at_or_before(daily_map, target_day):
    """Get the last known value at or before target_day."""
    keys = [k for k in daily_map.keys() if k <= target_day]
    if not keys: return None
    return daily_map[max(keys)]

# Per-chain series collector
series = {}  # name -> { tvl: [day -> tvl], price: [day -> price], supply: float }
for i, c in enumerate(chains_to_fetch):
    name = c["name"]
    print(f"  [{i+1}/{len(chains_to_fetch)}] {name}", file=sys.stderr)
    # TVL history
    tvl_resp = curl_json(f"https://api.llama.fi/v2/historicalChainTvl/{urllib.parse.quote(name)}")
    tvl_daily = to_daily(tvl_resp, "date", "tvl") if tvl_resp else {}
    # Price history (if gecko_id known)
    gid = c.get("gecko_id")
    price_daily = {}
    if gid:
        p_resp = curl_json(f"https://coins.llama.fi/chart/coingecko:{gid}?span={DAYS}&period=1d")
        if p_resp and "coins" in p_resp:
            key = f"coingecko:{gid}"
            prices = (p_resp["coins"].get(key) or {}).get("prices", [])
            price_daily = to_daily(prices, "timestamp", "price")
    # Estimate constant supply from current_mcap / current_price
    cur_mcap = c.get("chain_mcap") or c.get("token_mcap")
    cur_price = c.get("token_price")
    supply = (cur_mcap / cur_price) if (cur_mcap and cur_price) else None
    series[name] = {"tvl_daily": tvl_daily, "price_daily": price_daily, "supply": supply, "tier": c["tier"]}
    time.sleep(0.08)

# Pull ADI token history
adi_resp = curl_json(f"https://coins.llama.fi/chart/coingecko:adi-token?span={DAYS}&period=1d")
adi_prices = []
if adi_resp and "coins" in adi_resp:
    adi_prices = (adi_resp["coins"].get("coingecko:adi-token") or {}).get("prices", [])
adi_price_daily = to_daily(adi_prices, "timestamp", "price")
# ADI circulating supply ~ 107.27M from base data
adi_cur_price = (adi_prices[-1]["price"]) if adi_prices else 3.90
adi_supply = base["adi"]["token_mcap"] / adi_cur_price  # ~107.27M
adi_tvl_constant = base["adi"]["tvl"]  # $2M per audit doc (no DefiLlama history for ADI Chain)

# Build per-day Mcap/TVL series per chain
ratio_series = {}  # name -> [ratio per day or None]
for name, s in series.items():
    if not s["supply"]:
        continue
    out = []
    for d in days:
        tvl = value_at_or_before(s["tvl_daily"], d)
        price = value_at_or_before(s["price_daily"], d)
        if tvl and price and tvl > 100_000:  # skip degenerate days
            mcap = price * s["supply"]
            out.append(mcap / tvl)
        else:
            out.append(None)
    ratio_series[name] = {"values": out, "tier": s["tier"]}

# Per-day tier-median + P25/P75 bands
def percentile(xs, p):
    xs = sorted([x for x in xs if x is not None])
    if not xs: return None
    k = int(len(xs) * p)
    k = max(0, min(len(xs)-1, k))
    return xs[k]

tier_bands = {}
for tier in ("Large", "Mid", "Small"):
    bands = []
    for di in range(DAYS):
        vals = [r["values"][di] for r in ratio_series.values() if r["tier"] == tier and r["values"][di] is not None]
        bands.append({
            "p25":  percentile(vals, 0.25),
            "med":  percentile(vals, 0.50),
            "p75":  percentile(vals, 0.75),
            "n":    len(vals),
        })
    tier_bands[tier] = bands

# ADI line — try pulled history, fall back to constant 206x
adi_line = []
for d in days:
    price = value_at_or_before(adi_price_daily, d)
    if price:
        mcap = price * adi_supply
        adi_line.append(mcap / adi_tvl_constant)
    else:
        adi_line.append(base["adi"]["mcaptvl"])  # fallback to constant

# 7d / 30d momentum per chain (added to rows)
def pct_change(now, then):
    if now is None or then is None or then == 0: return None
    return (now/then - 1) * 100

momentum_by_chain = {}
for name, s in series.items():
    if not s["tvl_daily"]: continue
    now_tvl  = value_at_or_before(s["tvl_daily"], days[-1])
    d7_tvl   = value_at_or_before(s["tvl_daily"], days[-1] - 7*day_seconds)
    d30_tvl  = value_at_or_before(s["tvl_daily"], days[-1] - 30*day_seconds)
    now_p    = value_at_or_before(s["price_daily"], days[-1])
    d7_p     = value_at_or_before(s["price_daily"], days[-1] - 7*day_seconds)
    d30_p    = value_at_or_before(s["price_daily"], days[-1] - 30*day_seconds)
    momentum_by_chain[name] = {
        "tvl_chg_7d":  pct_change(now_tvl, d7_tvl),
        "tvl_chg_30d": pct_change(now_tvl, d30_tvl),
        "price_chg_7d":  pct_change(now_p, d7_p),
        "price_chg_30d": pct_change(now_p, d30_p),
    }

# Merge momentum into base rows
for r in base["rows"]:
    m = momentum_by_chain.get(r["name"], {})
    r.update(m)

# ADI momentum (real prices, flat TVL)
adi_now_p = value_at_or_before(adi_price_daily, days[-1])
adi_d7_p  = value_at_or_before(adi_price_daily, days[-1] - 7*day_seconds)
adi_d30_p = value_at_or_before(adi_price_daily, days[-1] - 30*day_seconds)
base["adi"]["tvl_chg_7d"]  = 0  # flat assumption
base["adi"]["tvl_chg_30d"] = 0
base["adi"]["price_chg_7d"]  = pct_change(adi_now_p, adi_d7_p)
base["adi"]["price_chg_30d"] = pct_change(adi_now_p, adi_d30_p)

# Attach time series + bands to dataset
base["history"] = {
    "days":  days,
    "tierBands": tier_bands,
    "adi": adi_line,
    "windowDays": DAYS,
}
base["asOf"] = "2026-05-20"

with open("/tmp/adi_l2_benchmark_data.json","w") as f:
    json.dump(base, f, default=str, indent=2)

# Print summary
print("\n── Summary ──", file=sys.stderr)
for t in ("Large","Mid","Small"):
    last = tier_bands[t][-1]
    first = tier_bands[t][0]
    print(f"  {t}: P25={first['p25']:.2f}→{last['p25']:.2f}  med={first['med']:.2f}→{last['med']:.2f}  P75={first['p75']:.2f}→{last['p75']:.2f}  n={last['n']}", file=sys.stderr)
print(f"  ADI: line[0]={adi_line[0]:.0f}x  line[-1]={adi_line[-1]:.0f}x", file=sys.stderr)
print(f"  ADI price 7d:  {base['adi']['price_chg_7d']:.1f}%  30d: {base['adi']['price_chg_30d']:.1f}%", file=sys.stderr)
print(f"\n  Wrote /tmp/adi_l2_benchmark_data.json with history", file=sys.stderr)
