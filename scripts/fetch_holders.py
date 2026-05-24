#!/usr/bin/env python3
"""Refresh top-10 holder concentration per L2 token via Moralis.

Requires MORALIS_API_KEY env var. Sign up free at moralis.io/.

If the key is not set, this script is a no-op: it warns and exits cleanly,
preserving any manually-seeded values already in public/data.json.

Output: updates public/data.json in place, setting:
  row.top10_pct          (rounded to 1 decimal)
  row.top10_pct_source   ('Moralis getTokenOwners, refreshed YYYY-MM-DD')
  row.top10_pct_note     (cleared — manual notes only useful for seed values)
"""
import json, os, subprocess, sys, time
from pathlib import Path
import datetime as dt

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'public' / 'data.json'

API_KEY = os.environ.get('MORALIS_API_KEY', '').strip()
if not API_KEY:
    print("[skip] MORALIS_API_KEY not set — keeping manually-seeded top10_pct values.")
    print("       Sign up free at https://moralis.io to get a key (40K req/month).")
    sys.exit(0)

# Chain name -> (moralis chain id, token contract on that chain)
# Moralis chain ids: eth, polygon, bsc, arbitrum, optimism, base, etc.
# Most L2 tokens are ERC-20 on Ethereum mainnet (the L2 itself doesn't host its own token).
TOKENS = {
    "Arbitrum":      ("eth",      "0x912CE59144191C1204E64559FE8253a0e49E6548"),  # ARB
    "OP Mainnet":    ("eth",      "0x4200000000000000000000000000000000000042"),  # OP (technically OP chain, but bridged)
    "Mantle":        ("eth",      "0x3c3a81e81dc49A522A592e7622A7E711c06bf354"),  # MNT
    "Linea":         ("eth",      "0xC2A38e0a4F1Ee0E69A6d3d3F32a85a3E0f6c12C7"),  # LINEA (placeholder, verify)
    "ZKsync Era":    ("eth",      "0x5A7d6b2F92C77FAD6CCaBd7EE0624E64907Eaf3E"),  # ZK
    "Scroll":        ("eth",      "0xd29687c813D741E2F938F4aC377128810E217b1b"),  # SCR
    "Blast":         ("eth",      "0xb1a5700fA2358173Fe465e6eA4Ff52E36e88E2ad"),  # BLAST
    "World Chain":   ("eth",      "0x163f8C2467924be0ae7B5347228CABF260318753"),  # WLD
    "Manta":         ("eth",      "0x95CeF13441Be50d20cA4558CC0a27B601aC544E5"),  # MANTA
    "Metis":         ("eth",      "0x9E32b13ce7f2E80A01932B42553652E053D6ed8e"),  # METIS
    "Mode":          ("eth",      "0xDFc7C877a950e49D2610114102175A06C2e3167a"),  # MODE
    "Boba":          ("eth",      "0x42bBFa2e77757C645eeaAd1655E0911a7553Efbc"),  # BOBA
    # ADI lives on Ethereum at 0x8b14...caea (chain L2 contract), but the ADI
    # *token* contract should be filled in by the team. Leaving blank for now.
}

def curl_json(url, headers):
    cmd = ["curl", "-sS", "--max-time", "20"]
    for k, v in headers.items():
        cmd += ["-H", f"{k}: {v}"]
    cmd.append(url)
    try:
        out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL)
        return json.loads(out)
    except Exception:
        return None

def top10_pct(chain, contract):
    """Returns the top-10 holders as % of supply, or None."""
    url = (f"https://deep-index.moralis.io/api/v2.2/erc20/{contract}/owners"
           f"?chain={chain}&limit=10&order=DESC")
    j = curl_json(url, {"accept": "application/json", "X-API-Key": API_KEY})
    if not j or 'result' not in j: return None
    # Need total supply too
    supply_url = (f"https://deep-index.moralis.io/api/v2.2/erc20/metadata"
                  f"?chain={chain}&addresses={contract}")
    s = curl_json(supply_url, {"accept": "application/json", "X-API-Key": API_KEY})
    if not s or not isinstance(s, list) or not s[0].get('total_supply_formatted'): return None
    total = float(s[0]['total_supply_formatted'])
    top10 = sum(float(o.get('balance_formatted', 0)) for o in j['result'])
    if total == 0: return None
    return round(top10 / total * 100, 1)

ds = json.loads(DATA.read_text())
today = dt.date.today().isoformat()
updated = 0
for row in ds['rows']:
    spec = TOKENS.get(row['name'])
    if not spec: continue
    chain, contract = spec
    pct = top10_pct(chain, contract)
    if pct is None:
        print(f"  {row['name']:18s} ... no data"); continue
    row['top10_pct']        = pct
    row['top10_pct_source'] = f"Moralis getTokenOwners ({chain}, {today})"
    row['top10_pct_note']   = ''
    print(f"  {row['name']:18s} ... {pct}%")
    updated += 1
    time.sleep(0.4)

DATA.write_text(json.dumps(ds, default=str))
print(f"\nUpdated top10_pct for {updated}/{len(TOKENS)} chains via Moralis.")
