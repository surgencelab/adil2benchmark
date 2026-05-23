#!/usr/bin/env python3
"""Pull 30d daily history per chain from Growthepie for tx, DAA, stables, fees.
Used by the detail pane's per-chain charts in the dashboard.

Output: writes /tmp/l2_history.json keyed by chain name with arrays of last-30
daily values for each metric.
"""
import json, subprocess, time, sys

GROWTHEPIE_SLUG = {
    "Base":"base","Arbitrum":"arbitrum","OP Mainnet":"optimism","Mantle":"mantle",
    "Linea":"linea","Blast":"blast","World Chain":"worldchain","ZKsync Era":"zksync_era",
    "Scroll":"scroll","Manta":"manta","Taiko":"taiko","Metis":"metis","Mode":"mode",
    "Boba":"boba","opBNB":"opbnb","Polygon zkEVM":"polygon_zkevm",
    "Arbitrum Nova":"arbitrum_nova","Zora":"zora","Soneium":"soneium","Unichain":"unichain",
    "Ink":"ink","Abstract":"abstract","Sophon":"sophon","Cyber":"cyber","Lisk":"lisk",
    "Movement":"movement","BOB":"bob","MegaETH":"megaeth","Celo":"celo","Fraxtal":"fraxtal",
}

def curl_json(url):
    try:
        out = subprocess.check_output(
            ["curl", "-sS", "--max-time", "20", url],
            stderr=subprocess.DEVNULL,
        )
        return json.loads(out)
    except Exception:
        return None

def tail_series(daily_obj, n=30):
    """daily_obj: { types: [...], data: [[unix_ms, value, ...], ...] }
    Returns last n values as floats; None for missing samples."""
    if not daily_obj: return []
    data = daily_obj.get("data") if isinstance(daily_obj, dict) else daily_obj
    if not data: return []
    pts = [(row[0], row[1]) for row in data[-n:] if len(row) >= 2 and row[1] is not None]
    return [{"t": int(t/1000), "v": float(v)} for t, v in pts]

out = {}
for name, slug in GROWTHEPIE_SLUG.items():
    sys.stdout.write(f"  {name:18s} ({slug:18s}) ... ")
    sys.stdout.flush()
    d = curl_json(f"https://api.growthepie.xyz/v1/chains/{slug}.json")
    if not d or "data" not in d:
        print("FAIL")
        time.sleep(0.3); continue
    m = d["data"].get("metrics", {})
    rec = {
        "tx_history":      tail_series((m.get("txcount") or {}).get("daily")),
        "daa_history":     tail_series((m.get("daa") or {}).get("daily")),
        "stables_history": tail_series((m.get("stables_mcap") or {}).get("daily")),
        "fees_history":    tail_series((m.get("fees") or {}).get("daily")),
    }
    out[name] = rec
    flags = []
    if rec["tx_history"]:      flags.append(f"tx={len(rec['tx_history'])}")
    if rec["daa_history"]:     flags.append(f"daa={len(rec['daa_history'])}")
    if rec["stables_history"]: flags.append(f"st={len(rec['stables_history'])}")
    if rec["fees_history"]:    flags.append(f"f={len(rec['fees_history'])}")
    print(" ".join(flags) or "no series")
    time.sleep(0.4)

json.dump(out, open("/tmp/l2_history.json","w"))
ok = sum(1 for v in out.values() if any(v.values()))
print(f"\nGot history for {ok}/{len(GROWTHEPIE_SLUG)} chains")
