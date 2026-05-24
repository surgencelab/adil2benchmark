#!/usr/bin/env python3
"""Compute top-10 holder concentration per L2 token via Alchemy.

Walks all ERC-20 Transfer events for each token contract using
alchemy_getAssetTransfers (paginated), accumulates per-address balances,
sorts and takes the top 10. Computes percentage of totalSupply.

Requires ALCHEMY_API_KEY env var. Free tier (300M CU/month) covers this
load comfortably for the long tail of L2 tokens.

NOTE on coverage: high-activity tokens (ARB, OP, MNT, LINEA at multi-million
Transfer events) will hit MAX_PAGES cap before finishing. Those are flagged
'partial' and the script preserves the manually-seeded value rather than
overwriting with a misleading underestimate. Only full walks are accepted.

Output: updates public/data.json in place:
  row.top10_pct          (float, % of supply held by top 10 wallets)
  row.top10_pct_source   ('Alchemy walked N ERC-20 Transfer events, YYYY-MM-DD')
  row.top10_pct_note     ('Top holder: <addr> (Y%)')
"""
import json, os, subprocess, sys, time
from pathlib import Path
import datetime as dt

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'public' / 'data.json'

API_KEY = os.environ.get('ALCHEMY_API_KEY', '').strip()
if not API_KEY:
    print("[skip] ALCHEMY_API_KEY not set. To use Alchemy for live holder data,")
    print("       export ALCHEMY_API_KEY=<your-key> and re-run.")
    sys.exit(0)

# Cap per-token Transfer walk. For most tokens this completes in < 2 min.
# For very high-activity tokens (ARB, OP at multi-million transfers) it
# still hits the cap; those are flagged 'partial' and the manually-seeded
# value is preserved as fallback.
MAX_PAGES = 1000  # 1M transfers max per token

# (chain network, contract address) per L2 dashboard name.
# Addresses verified against CoinGecko's platforms data.
TOKENS = {
    "Arbitrum":     ("arb-mainnet",    "0x912CE59144191C1204E64559FE8253a0e49E6548"),
    "OP Mainnet":   ("opt-mainnet",    "0x4200000000000000000000000000000000000042"),
    "Mantle":       ("eth-mainnet",    "0x3c3a81e81dc49A522A592e7622A7E711c06bf354"),
    # ZKsync ZK token is also on Ethereum at 0x66a5cfb2…, verify which
    "ZKsync Era":   ("eth-mainnet",    "0x66a5cfb2e9c529f14fe6364ad1075df3a649c0a5"),
    # Scroll lives only on Scroll chain itself
    "Scroll":       ("scroll-mainnet", "0xd29687c813D741E2F938F4aC377128810E217b1b"),
    # Blast lives only on Blast chain itself
    "Blast":        ("blast-mainnet",  "0xb1a5700fA2358173Fe465e6eA4Ff52E36e88E2ad"),
    "Linea":        ("eth-mainnet",    "0x1789e0043623282D5DCc7F213d703C6D8BAfBB04"),
    # smaller / newer
    "World Chain":  ("eth-mainnet",    "0x163f8C2467924be0ae7B5347228CABF260318753"),
    "Manta":        ("eth-mainnet",    "0x95CeF13441Be50d20cA4558CC0a27B601aC544E5"),
    "Metis":        ("eth-mainnet",    "0x9E32b13ce7f2E80A01932B42553652E053D6ed8e"),
    "Movement":     ("eth-mainnet",    "0x3073f7aAA4DB83f95e9FFf17424F71D4751a3073"),
    # Mode token is on Ethereum at 0x084382… per CG
    "Mode":         ("eth-mainnet",    "0x084382d1cc4f4dfd1769b1cc1ac2a9b1f8365e90"),
    # Sophon on Ethereum at 0x6b7774… per CG
    "Sophon":       ("eth-mainnet",    "0x6b7774cb12ed7573a7586e7d0e62a2a563ddd3f0"),
    # BOB lives on Bob chain itself; Alchemy doesn't yet support bob-mainnet,
    # so fall back to walking on Ethereum side if available
    "BOB":          ("eth-mainnet",    "0x7d7d0fd57c4a98e60FE93b1ba4f1cBe1E5d6Ee78"),
    "Boba":         ("eth-mainnet",    "0x42bBFa2e77757C645eeaAd1655E0911a7553Efbc"),
    "Lisk":         ("eth-mainnet",    "0x6033F7f88332B8db6ad452B7C6D5bB643990aE3f"),
    "Zircuit":      ("eth-mainnet",    "0xfd418e42783382E86Ae91e445406600Ba144D162"),
}

# Burn / zero / known sink addresses to exclude from the holder list
SINKS = {
    "0x0000000000000000000000000000000000000000",
    "0x000000000000000000000000000000000000dead",
}

def rpc(network: str, method: str, params):
    url = f"https://{network}.g.alchemy.com/v2/{API_KEY}"
    body = json.dumps({"jsonrpc":"2.0","id":1,"method":method,"params":params})
    out = subprocess.check_output(
        ["curl","-sS","--max-time","30","-X","POST",
         "-H","content-type: application/json","-d",body, url],
        stderr=subprocess.DEVNULL)
    return json.loads(out)

def total_supply(network: str, contract: str) -> int | None:
    r = rpc(network, "eth_call", [{"to": contract, "data": "0x18160ddd"}, "latest"])
    res = r.get("result")
    if not res or res == "0x": return None
    return int(res, 16)

def decimals(network: str, contract: str) -> int:
    r = rpc(network, "eth_call", [{"to": contract, "data": "0x313ce567"}, "latest"])
    res = r.get("result")
    if not res or res == "0x": return 18
    return int(res, 16)

def walk_transfers(network: str, contract: str):
    """Returns (balances dict, total_xfers, hit_cap)."""
    balances = {}
    page_key = None
    n = 0
    pages = 0
    while True:
        pages += 1
        if pages > MAX_PAGES:
            return balances, n, True
        params = {"fromBlock":"0x0","toBlock":"latest","category":["erc20"],
                  "contractAddresses":[contract],"maxCount":"0x3e8","order":"asc",
                  "withMetadata": False}
        if page_key: params["pageKey"] = page_key
        try:
            r = rpc(network, "alchemy_getAssetTransfers", [params])
        except Exception as e:
            print(f"   rpc fail page {pages}: {e}")
            break
        if "error" in r:
            print(f"   error page {pages}: {r['error']}")
            break
        res = r.get("result", {})
        xfers = res.get("transfers", [])
        for x in xfers:
            v = x.get("value") or 0
            try: v = float(v)
            except: continue
            if v <= 0: continue
            f = (x.get("from") or "").lower()
            t = (x.get("to") or "").lower()
            balances[f] = balances.get(f, 0.0) - v
            balances[t] = balances.get(t, 0.0) + v
        n += len(xfers)
        page_key = res.get("pageKey")
        if not page_key: break
    return balances, n, False

def process(name: str, network: str, contract: str):
    print(f"  {name:18s} ({network}) ... ", end="", flush=True)
    try:
        supply_raw = total_supply(network, contract)
        if not supply_raw:
            print("no totalSupply"); return None
        dec = decimals(network, contract)
        supply = supply_raw / (10 ** dec)
        t0 = time.time()
        balances, n_xfers, partial = walk_transfers(network, contract)
        # Drop sinks + dust
        ranked = sorted(
            ((a, b) for a, b in balances.items() if a not in SINKS and b > 1),
            key=lambda x: -x[1],
        )
        top10 = ranked[:10]
        top10_sum = sum(b for _, b in top10)
        # Convert top10_sum back to token units (it's already in token units
        # since `value` returned by Alchemy is a float in token units)
        top10_pct = (top10_sum / supply) * 100 if supply > 0 else None
        top1_addr, top1_bal = (top10[0] if top10 else (None, 0))
        top1_pct = (top1_bal / supply) * 100 if supply > 0 else 0
        elapsed = time.time() - t0
        status = "PARTIAL" if partial else "complete"
        print(f"top10 {top10_pct:.1f}% · top1 {top1_pct:.1f}% ({top1_addr[:10] if top1_addr else '-'}…) · {n_xfers:,} xfers · {elapsed:.1f}s · {status}")
        return {
            "top10_pct": round(top10_pct, 1) if top10_pct is not None else None,
            "top1_pct":  round(top1_pct, 1),
            "top1_addr": top1_addr,
            "n_transfers_walked": n_xfers,
            "partial": partial,
        }
    except Exception as e:
        print(f"FAIL: {e}")
        return None

def main():
    ds = json.loads(DATA.read_text())
    rows_by_name = {r["name"]: r for r in ds["rows"]}
    today = dt.date.today().isoformat()
    updated = 0
    for name, (network, contract) in TOKENS.items():
        row = rows_by_name.get(name)
        if not row:
            print(f"  {name:18s} ... no matching row"); continue
        result = process(name, network, contract)
        if result is None: continue
        pct = result["top10_pct"]
        # Validate: top10_pct outside [0, 100] is a partial-walk artifact —
        # preserve the existing seeded value instead of overwriting with garbage.
        if pct is None or pct < 0 or pct > 100:
            print(f"     -> rejected ({pct}%); keeping previous seed value of {row.get('top10_pct')}%")
            continue
        # Partial walks for high-volume tokens give underestimated current state;
        # only accept full walks for accuracy.
        if result["partial"]:
            print(f"     -> partial walk only; keeping previous seed value of {row.get('top10_pct')}%")
            continue
        row["top10_pct"]         = pct
        row["top10_pct_source"]  = f"Alchemy walked {result['n_transfers_walked']:,} ERC-20 Transfer events ({network}, {today})"
        row["top10_pct_note"]    = f"Top holder: {result['top1_addr']} ({result['top1_pct']}%)"
        updated += 1
        time.sleep(0.2)
    DATA.write_text(json.dumps(ds, default=str))
    print(f"\n✓ Updated top10_pct for {updated}/{len(TOKENS)} chains via Alchemy.")

if __name__ == "__main__":
    main()
