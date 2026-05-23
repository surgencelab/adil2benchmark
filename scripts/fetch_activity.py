#!/usr/bin/env python3
"""Fetch per-chain activity metrics from Growthepie + per-token FDV from
CoinGecko's public API. Merges into the existing L2 dataset.

Sources:
- Growthepie: https://api.growthepie.xyz/v1/chains/{slug}.json
  -> daily tx count, daily active addresses (DAA), gas fees paid USD
- CoinGecko: https://api.coingecko.com/api/v3/coins/{id}
  -> max_supply, total_supply, FDV (USD), 24h total trading volume

Output: writes /tmp/l2_activity.json keyed by chain name with the new fields.
"""
import json, subprocess, time, sys

# Slug map: dashboard chain name -> growthepie slug
GROWTHEPIE_SLUG = {
    "Base":"base","Arbitrum":"arbitrum","OP Mainnet":"optimism","Mantle":"mantle",
    "Linea":"linea","Blast":"blast","World Chain":"worldchain","ZKsync Era":"zksync_era",
    "Scroll":"scroll","Manta":"manta","Taiko":"taiko","Metis":"metis","Mode":"mode",
    "Boba":"boba","opBNB":"opbnb","Polygon zkEVM":"polygon_zkevm",
    "Arbitrum Nova":"arbitrum_nova","Zora":"zora","Soneium":"soneium","Unichain":"unichain",
    "Ink":"ink","Abstract":"abstract","Sophon":"sophon","Cyber":"cyber","Lisk":"lisk",
    "Movement":"movement","BOB":"bob","MegaETH":"megaeth","Celo":"celo","Fraxtal":"fraxtal",
}

# Slug map: dashboard chain name -> coingecko coin id (verified against coingecko.com)
COINGECKO_ID = {
    "Arbitrum":     "arbitrum",
    "OP Mainnet":   "optimism",
    "Mantle":       "mantle",
    "Linea":        "linea",
    "World Chain":  "worldcoin-wld",
    "ZKsync Era":   "zksync",
    "Scroll":       "scroll",
    "Manta":        "manta-network",
    "Metis":        "metis-token",
    "Mode":         "mode",
    "Boba":         "boba-network",
    "Movement":     "movement",          # was movement-network
    "Polygon zkEVM": None,
    "Arbitrum Nova": None,
    "Blast":        "blast",
    "Celo":         "celo",
    "Fraxtal":      "fraxtal",
    "MegaETH":      "megaeth",
    "Sophon":       "sophon",
    "Lisk":         "lisk",
    "Cyber":        "cyber",
    "BOB":          "bob-build-on-bitcoin",
    "Taiko":        None,
    "Cronos zkEVM": "cronos-zkevm-cro",
    # User-provided CG slugs (fix for previously-missing data)
    "Fuel Ignition": "fuel-network",
    "IOTA EVM":     "iota",
    "LightLink":    "lightlink",
    "Superseed":    "superseed",
    "Pepu":         "pepe-unchained",
    "Moonchain":    "moonchain-2",
    "Mind Network": "mind-network",
}

def curl_json(url):
    try:
        out = subprocess.check_output(
            ["curl", "-sS", "--max-time", "15", "-A", "Mozilla/5.0", url],
            stderr=subprocess.DEVNULL,
        )
        return json.loads(out)
    except Exception as e:
        return None

def last_value(daily):
    """Growthepie daily series shape: [[unix_ms, value, ...], ...]"""
    if not daily or "data" not in daily and not isinstance(daily, list):
        return None
    series = daily["data"] if isinstance(daily, dict) and "data" in daily else daily
    if not series: return None
    last = series[-1]
    return last[1] if isinstance(last, (list, tuple)) and len(last) > 1 else None

def growthepie_chain(slug):
    """Returns {tx_per_day, active_wallets_per_day, fees_paid_usd, stables_mcap}"""
    d = curl_json(f"https://api.growthepie.xyz/v1/chains/{slug}.json")
    if not d or "data" not in d:
        return {}
    m = d["data"].get("metrics", {})
    out = {}
    if "txcount" in m:    out["tx_per_day"] = last_value(m["txcount"].get("daily"))
    if "daa" in m:        out["active_wallets_per_day"] = last_value(m["daa"].get("daily"))
    if "fees" in m:       out["fees_paid_usd"] = last_value(m["fees"].get("daily"))
    if "stables_mcap" in m: out["stables_mcap"] = last_value(m["stables_mcap"].get("daily"))
    return out

def coingecko_supply(coin_id):
    """Returns {max_supply, total_supply, fdv_usd, total_volume_usd, price_usd}"""
    if not coin_id: return {}
    d = curl_json(f"https://api.coingecko.com/api/v3/coins/{coin_id}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false")
    if not d: return {}
    md = d.get("market_data", {})
    return {
        "max_supply":       md.get("max_supply"),
        "total_supply":     md.get("total_supply"),
        "circulating_supply": md.get("circulating_supply"),
        "fdv_usd":          (md.get("fully_diluted_valuation") or {}).get("usd"),
        "price_usd":        (md.get("current_price") or {}).get("usd"),
        "total_volume_usd": (md.get("total_volume") or {}).get("usd"),
    }

def main():
    # Load existing dataset to know which chains to process
    DATA_FILE = "/Users/olusegunaborode/Data Projects/DatumLabs/Datum Data/adi-l2-benchmark/data.js"
    import re
    src = open(DATA_FILE).read()
    m = re.match(r'^window\.ADI_L2_DATA = (.*?);\s*$', src, re.DOTALL)
    dataset = json.loads(m.group(1))

    out = {}
    for row in dataset["rows"]:
        name = row["name"]
        sys.stdout.write(f"  {name:22s} ... ")
        sys.stdout.flush()
        info = {}
        g = growthepie_chain(GROWTHEPIE_SLUG.get(name, name.lower().replace(" ","_")))
        info.update(g)
        c = coingecko_supply(COINGECKO_ID.get(name))
        info.update(c)
        out[name] = info
        flags = []
        if info.get("tx_per_day"):           flags.append(f"tx={info['tx_per_day']:.0f}")
        if info.get("active_wallets_per_day"): flags.append(f"daa={info['active_wallets_per_day']:.0f}")
        if info.get("fdv_usd"):              flags.append(f"fdv=${info['fdv_usd']/1e6:.0f}M")
        if info.get("max_supply"):           flags.append(f"supply={info['max_supply']/1e6:.0f}M")
        print(" ".join(flags) or "no data")
        time.sleep(2.0)   # respect CoinGecko free rate limit

    with open("/tmp/l2_activity.json", "w") as f:
        json.dump(out, f, indent=2)
    print(f"\nWrote {len(out)} rows to /tmp/l2_activity.json")

if __name__ == "__main__":
    main()
