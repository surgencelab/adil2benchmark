#!/usr/bin/env python3
"""Compute top-10 holder concentration per L2 token via Moralis.

Single REST call per token to GET /api/v2.2/erc20/{addr}/owners — Moralis
maintains an indexed view of token balances, so the response is sorted
by balance descending with pre-computed percentage_relative_to_total_supply.
No event walking, no partial-walk artifacts. Sub-second per token.

Free tier: 40K compute units/day. erc20/owners is ~30 CU; one full refresh
of ~17 tokens uses ~510 CU, well under the daily budget.

Requires MORALIS_API_KEY env var. Output: updates public/data.json in place:
  row.top10_pct          (float, % of supply held by top 10 wallets)
  row.top10_pct_source   ('Moralis erc20/owners API ({chain}, YYYY-MM-DD)')
  row.top10_pct_note     ('Top holder: <label/addr> (Y%)')
"""
import json, os, subprocess, sys, time
from pathlib import Path
import datetime as dt

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'public' / 'data.json'

API_KEY = os.environ.get('MORALIS_API_KEY', '').strip()
if not API_KEY:
    print("[skip] MORALIS_API_KEY not set. To use Moralis for live holder data,")
    print("       export MORALIS_API_KEY=<your-key> and re-run.")
    sys.exit(0)

# (moralis chain id, contract address) per L2 dashboard name.
# Moralis chain identifiers: eth, arbitrum, optimism, polygon, base, bsc,
# linea, mantle, scroll, blast, opbnb, zksync, gnosis, etc.
# Token contracts verified against CoinGecko platforms data.
TOKENS = {
    "Arbitrum":     ("arbitrum",  "0x912CE59144191C1204E64559FE8253a0e49E6548"),
    "OP Mainnet":   ("optimism",  "0x4200000000000000000000000000000000000042"),
    "Mantle":       ("eth",       "0x3c3a81e81dc49A522A592e7622A7E711c06bf354"),
    "ZKsync Era":   ("eth",       "0x66a5cfb2e9c529f14fe6364ad1075df3a649c0a5"),
    "Scroll":       ("scroll",    "0xd29687c813D741E2F938F4aC377128810E217b1b"),
    "Blast":        ("blast",     "0xb1a5700fA2358173Fe465e6eA4Ff52E36e88E2ad"),
    "Linea":        ("eth",       "0x1789e0043623282D5DCc7F213d703C6D8BAfBB04"),
    "World Chain":  ("eth",       "0x163f8C2467924be0ae7B5347228CABF260318753"),
    "Manta":        ("eth",       "0x95CeF13441Be50d20cA4558CC0a27B601aC544E5"),
    "Metis":        ("eth",       "0x9E32b13ce7f2E80A01932B42553652E053D6ed8e"),
    "Movement":     ("eth",       "0x3073f7aAA4DB83f95e9FFf17424F71D4751a3073"),
    "Mode":         ("eth",       "0x084382d1cc4f4dfd1769b1cc1ac2a9b1f8365e90"),
    "Sophon":       ("eth",       "0x6b7774cb12ed7573a7586e7d0e62a2a563ddd3f0"),
    "BOB":          ("eth",       "0x7d7d0fd57c4a98e60FE93b1ba4f1cBe1E5d6Ee78"),
    "Boba":         ("eth",       "0x42bBFa2e77757C645eeaAd1655E0911a7553Efbc"),
    "Lisk":         ("eth",       "0x6033F7f88332B8db6ad452B7C6D5bB643990aE3f"),
    "Zircuit":      ("eth",       "0xfd418e42783382E86Ae91e445406600Ba144D162"),
}

# Burn / zero / dead addresses to filter from the top-10 holders list.
# Moralis returns these as "owners" since they hold non-zero balance, but
# they should not count toward concentration.
SINKS = {
    "0x0000000000000000000000000000000000000000",
    "0x000000000000000000000000000000000000dead",
}

def fetch_owners(chain: str, contract: str, limit: int = 20):
    """Top holders for one token. We pull 20 so we can filter sinks and still have 10."""
    url = (f"https://deep-index.moralis.io/api/v2.2/erc20/{contract}/owners"
           f"?chain={chain}&limit={limit}&order=DESC")
    out = subprocess.check_output([
        "curl", "-sS", "--max-time", "30",
        "-H", "accept: application/json",
        "-H", f"X-API-Key: {API_KEY}",
        url], stderr=subprocess.DEVNULL)
    return json.loads(out)

def process(name: str, chain: str, contract: str):
    print(f"  {name:18s} ({chain:10s}) ... ", end="", flush=True)
    try:
        d = fetch_owners(chain, contract, 20)
        if "result" not in d:
            msg = d.get("message") or d.get("error") or str(d)[:120]
            print(f"FAIL: {msg}")
            return None
        holders = d.get("result", [])
        if not holders:
            print("empty result")
            return None
        # Filter sinks before slicing the top 10
        filtered = [h for h in holders
                    if (h.get("owner_address") or "").lower() not in SINKS]
        top10 = filtered[:10]
        if not top10:
            print("no non-sink holders")
            return None
        top10_pct = sum(float(h.get("percentage_relative_to_total_supply") or 0)
                        for h in top10)
        top1 = top10[0]
        top1_pct = float(top1.get("percentage_relative_to_total_supply") or 0)
        top1_addr = top1.get("owner_address") or ""
        top1_label = top1.get("owner_address_label") or (top1_addr[:10] + "…" if top1_addr else "?")
        print(f"top10 {top10_pct:.1f}% · top1 {top1_pct:.1f}% ({top1_label})")
        return {
            "top10_pct": round(top10_pct, 1),
            "top1_pct":  round(top1_pct, 1),
            "top1_label": top1_label,
            "top1_addr": top1_addr,
        }
    except Exception as e:
        print(f"FAIL: {e}")
        return None

def main():
    ds = json.loads(DATA.read_text())
    rows_by_name = {r["name"]: r for r in ds["rows"]}
    today = dt.date.today().isoformat()
    updated = 0
    failed  = []
    for name, (chain, contract) in TOKENS.items():
        row = rows_by_name.get(name)
        if not row:
            print(f"  {name:18s} ... no matching row")
            continue
        result = process(name, chain, contract)
        if result is None:
            failed.append(name)
            continue
        pct = result["top10_pct"]
        if pct is None or pct < 0 or pct > 100:
            print(f"     -> rejected ({pct}%); keeping previous seed value of {row.get('top10_pct')}%")
            failed.append(name)
            continue
        row["top10_pct"]        = pct
        row["top10_pct_source"] = f"Moralis erc20/owners API ({chain}, {today})"
        row["top10_pct_note"]   = f"Top holder: {result['top1_label']} ({result['top1_pct']}%)"
        updated += 1
        time.sleep(0.15)  # gentle rate-limit cushion
    DATA.write_text(json.dumps(ds, default=str))
    print(f"\n✓ Updated top10_pct for {updated}/{len(TOKENS)} chains via Moralis.")
    if failed:
        print(f"  Kept seed values for: {', '.join(failed)}")

if __name__ == "__main__":
    main()
