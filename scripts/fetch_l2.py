#!/usr/bin/env python3
"""Fetch L2 chain + token data from DefiLlama using curl (system certs)."""
import subprocess, json, sys

def curl_json(url, data=None):
    cmd = ["curl", "-sS", "--max-time", "20", url]
    if data is not None:
        cmd = ["curl", "-sS", "--max-time", "20", "-X", "POST",
               "-H", "Content-Type: application/json", "-d", json.dumps(data), url]
    out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL)
    try:
        return json.loads(out)
    except Exception:
        return None

# 1) Canonical rollup chain list with TVL + mcap
rollup = curl_json("https://api.llama.fi/chains2/Rollup")
chains = rollup["chainTvls"]

# Map of DefiLlama-chain-name -> DEX-overview-slug (matches the URL path used in /overview/dexs/<slug>)
# Defaults to lower-case with hyphens; explicit overrides for known irregulars.
SLUG_OVERRIDES = {
    "OP Mainnet": "optimism",
    "ZKsync Era": "era",
    "World Chain": "world-chain",
    "Polygon zkEVM": "polygon-zkevm",
    "Arbitrum Nova": "arbitrum-nova",
    "Cronos zkEVM": "cronos-zkevm",
    "Astar zkEVM": "astar-zkevm",
    "Silicon zkEVM": "silicon-zkevm",
    "Fuel Ignition": "fuel-ignition",
    "Mind Network": "mind-network",
    "IOTA EVM": "iota-evm",
    "Form Network": "form-network",
    "Zero Network": "zero-network",
    "Derive Chain": "derive",
    "ZKsync Lite": "zksync-lite",
    "Milkomeda A1": "milkomeda-a1",
    "SX Network": "sx-network",
    "Sei V2": "sei",
}

def slug_for(name):
    if name in SLUG_OVERRIDES: return SLUG_OVERRIDES[name]
    return name.lower().replace(" ", "-")

# 2) Per-chain DEX volume
dex = {}
for c in chains:
    slug = slug_for(c["name"])
    d = curl_json(f"https://api.llama.fi/overview/dexs/{slug}?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true")
    if d and "total24h" in d:
        dex[c["name"]] = {
            "slug": slug,
            "v24": d.get("total24h") or 0,
            "v7":  d.get("total7d") or 0,
            "v30": d.get("total30d") or 0,
            "change_1d": d.get("change_1d"),
            "change_7d": d.get("change_7d"),
        }
    else:
        dex[c["name"]] = {"slug": slug, "v24": 0, "v7": 0, "v30": 0, "change_1d": None, "change_7d": None}

# 3) Token mcap via coins.llama.fi using gecko_ids from /v2/chains (gecko_id lives there, not in chainTvls)
v2chains = curl_json("https://api.llama.fi/v2/chains")
gecko_by_name = {c["name"]: c.get("gecko_id") for c in v2chains if c.get("gecko_id")}
coin_keys = [f"coingecko:{gid}" for n, gid in gecko_by_name.items() if n in {c["name"] for c in chains}]
mcaps = curl_json("https://coins.llama.fi/mcaps", data={"coins": coin_keys}) or {}
prices = curl_json(f"https://coins.llama.fi/prices/current/{','.join(coin_keys)}") or {}
prices = prices.get("coins", {})

# 4) Compose merged dataset
merged = []
for c in chains:
    name = c["name"]
    gid = gecko_by_name.get(name)
    coin_key = f"coingecko:{gid}" if gid else None
    mcap = (mcaps.get(coin_key) or {}).get("mcap") if coin_key else None
    price = (prices.get(coin_key) or {}).get("price") if coin_key else None
    merged.append({
        "name": name,
        "symbol": c.get("symbol"),
        "tvl": c.get("tvl") or 0,
        "tvl_prev_day": c.get("tvlPrevDay") or 0,
        "tvl_prev_week": c.get("tvlPrevWeek") or 0,
        "change_1d": c.get("change_1d"),
        "change_7d": c.get("change_7d"),
        "chain_mcap": c.get("mcap"),
        "mcaptvl": c.get("mcaptvl"),
        "protocols": c.get("protocols"),
        "gecko_id": gid,
        "token_mcap": mcap,
        "token_price": price,
        "dex_v24": dex.get(name, {}).get("v24", 0),
        "dex_v7":  dex.get(name, {}).get("v7", 0),
        "dex_v30": dex.get(name, {}).get("v30", 0),
        "dex_change_1d": dex.get(name, {}).get("change_1d"),
        "dex_change_7d": dex.get(name, {}).get("change_7d"),
        "dex_slug": dex.get(name, {}).get("slug"),
    })

merged.sort(key=lambda r: r["tvl"], reverse=True)
json.dump(merged, open("/tmp/l2_dataset.json", "w"), indent=2, default=str)

# Print compact summary
print(f"{'chain':<20}{'tvl_$M':>10}{'mcap_$M':>10}{'dex24h_$M':>12}{'mcap/tvl':>10}{'vol/tvl_%':>11}")
for r in merged[:30]:
    tvl = r["tvl"]/1e6
    mc = (r["chain_mcap"] or 0)/1e6
    v24 = r["dex_v24"]/1e6
    mtv = (r["chain_mcap"]/r["tvl"]) if (r["chain_mcap"] and r["tvl"]) else 0
    vol_tvl = (r["dex_v24"]/r["tvl"]*100) if r["tvl"] else 0
    print(f"{r['name']:<20}{tvl:>10,.1f}{mc:>10,.1f}{v24:>12,.2f}{mtv:>10.2f}{vol_tvl:>10.2f}%")

print(f"\nTotal chains: {len(merged)}")
print(f"With token: {sum(1 for r in merged if r['token_mcap'])}")
print(f"With DEX vol: {sum(1 for r in merged if r['dex_v24'])}")
