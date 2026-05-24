#!/usr/bin/env python3
"""Refresh the full dataset by running all fetchers and merging.
Writes public/data.json (used by the Vite app).

Order:
  1. fetch_l2.py             — DefiLlama snapshot (TVL, DEX vol, Mcap)
  2. fetch_l2_history.py     — DefiLlama 90d historical TVL+price tier bands
  3. fetch_activity.py       — Growthepie + CoinGecko (tx, DAA, FDV, vol)
  4. fetch_growthepie_history.py — Per-chain 30d series
  5. fetch_sparklines.py     — Per-token 30d CoinGecko price series
  6. fetch_ddsc.py           — On-chain DDSC totalSupply from ADI RPC
  7. merge into public/data.json
"""
import json, os, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / 'scripts'
PUBLIC = ROOT / 'public'
DATA_JSON = PUBLIC / 'data.json'

def run(script):
    print(f"\n▶  {script}")
    r = subprocess.run([sys.executable, str(SCRIPTS / script)], capture_output=False)
    if r.returncode != 0:
        print(f"   [warn] {script} returned {r.returncode}")
    return r.returncode

def main():
    # Run the fetchers. Each writes to /tmp/*.json.
    run('fetch_l2.py')
    run('fetch_l2_history.py')
    run('fetch_activity.py')
    run('fetch_growthepie_history.py')
    run('fetch_sparklines.py')
    run('fetch_ddsc.py')
    # fetch_holders_moralis.py is a no-op without MORALIS_API_KEY env var.
    # When set, queries Moralis erc20/owners (indexed view, single REST call
    # per token, returns top holders sorted with pre-computed % of supply).
    # Covers 14/17 L2 governance tokens; Scroll/Blast/BOB keep manual seeds
    # since Moralis does not index those chains.
    run('fetch_holders_moralis.py')

    # Merge: start from the existing data.json if present, then overlay
    # whatever the fetchers produced.
    if DATA_JSON.exists():
        data = json.loads(DATA_JSON.read_text())
    else:
        print("\n[err] public/data.json missing — run scripts/fetch_l2.py once to seed it")
        return 1

    # Merge activity
    act_path = Path('/tmp/l2_activity.json')
    if act_path.exists():
        act = json.loads(act_path.read_text())
        for row in data['rows']:
            a = act.get(row['name'])
            if not a: continue
            for k in ('tx_per_day','active_wallets_per_day','fees_paid_usd',
                       'stables_mcap_chain','max_supply','total_supply',
                       'fdv_usd','total_volume_usd','price_usd'):
                if k in a:
                    row['tx_per_day' if k == 'tx_per_day' else k] = a[k]

    # Merge sparklines
    sp_path = Path('/tmp/l2_sparklines.json')
    if sp_path.exists():
        sp = json.loads(sp_path.read_text())
        for row in data['rows']:
            if row['name'] in sp:
                row['sparkline_30d'] = sp[row['name']]
        data['adi']['sparkline_30d'] = sp.get('ADI Chain')
        data['sparklines'] = sp

    # Merge Growthepie history
    hist_path = Path('/tmp/l2_history.json')
    if hist_path.exists():
        hist = json.loads(hist_path.read_text())
        for row in data['rows']:
            h = hist.get(row['name'])
            if not h: continue
            row['tx_history']      = [p['v'] for p in (h.get('tx_history')      or [])]
            row['daa_history']     = [p['v'] for p in (h.get('daa_history')     or [])]
            row['stables_history'] = [p['v'] for p in (h.get('stables_history') or [])]
            row['fees_history']    = [p['v'] for p in (h.get('fees_history')    or [])]
            if h.get('tx_history'):
                row['history_timestamps'] = [p['t'] for p in h['tx_history']]

    # Merge DDSC totalSupply
    ddsc_path = Path('/tmp/ddsc_supply.json')
    if ddsc_path.exists():
        d = json.loads(ddsc_path.read_text())
        adi = data['adi']
        adi['ddsc_supply']   = d['supply']
        adi['ddsc_tvl_aed']  = d['tvl_aed']
        adi['ddsc_tvl_usd']  = d['tvl_usd']
        adi['ddsc_fetched_at'] = d['fetched_at']
        adi['tvl_with_ddsc'] = adi.get('tvl_defillama_visible', 2_028_000) + d['tvl_usd']
        adi['mcaptvl_with_ddsc'] = adi['token_mcap'] / adi['tvl_with_ddsc']

    # Bump asOf
    import datetime as dt
    data['asOf'] = dt.datetime.utcnow().date().isoformat()

    PUBLIC.mkdir(exist_ok=True)
    DATA_JSON.write_text(json.dumps(data))
    print(f"\n✓ wrote {DATA_JSON} ({DATA_JSON.stat().st_size:,} bytes)")
    return 0

if __name__ == '__main__':
    sys.exit(main())
