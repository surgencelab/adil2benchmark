#!/usr/bin/env python3
"""Fetch RWA-chain comparison data: TVL from DefiLlama, Mcap/FDV from CoinGecko.

Same data shape as scripts/fetch_l2.py + scripts/fetch_activity.py but for a
hand-picked set of RWA-native L1/L2 chains. ADI's own row is composed elsewhere
(scripts/fetch_ddsc.py + the main merge) and is referenced from the dashboard
directly; we don't duplicate it here.

Output: writes /tmp/rwa_chains.json which the main merger overlays into
public/data.json under the `rwa_rows` key. Also writes /tmp/canton.json with
the Canton-specific snapshot used by the Compare page.
"""
import json, subprocess, sys, time
from pathlib import Path
import datetime as dt

ROOT = Path(__file__).resolve().parent.parent
OUT_RWA    = Path('/tmp/rwa_chains.json')
OUT_CANTON = Path('/tmp/canton.json')

# (dashboard name, DefiLlama chain name, CoinGecko id, symbol, native asset / token note)
# Strict RWA-native set; Polymesh dropped because DefiLlama does not index its TVL.
CHAINS = [
    # name              DefiLlama chain   CoinGecko id              symbol  note
    ('Canton',          'Canton',         'canton-network',         'CC',   'Permissioned L1 (Digital Asset)'),
    ('Provenance',      'Provenance',     'hash-2',                 'HASH', 'RWA L1 (Figure Tech)'),
    ('Plume',           'Plume Mainnet',  'plume',                  'PLUME','RWAfi L2'),
    ('MANTRA',          'MANTRA',         'mantra',                 'OM',   'RWA L1 (Cosmos SDK)'),
    ('XDC',             'XDC',            'xdce-crowd-sale',        'XDC',  'Trade-finance L1'),
    ('Redbelly',        'Redbelly',       'redbelly-network-token', 'RBNT', 'Permissioned-public L1'),
]

def curl_json(url, data=None):
    args = ['curl', '-sS', '--max-time', '30', url]
    if data is not None:
        args = ['curl', '-sS', '--max-time', '30', '-X', 'POST',
                '-H', 'content-type: application/json', '-d', json.dumps(data), url]
    try:
        out = subprocess.check_output(args, stderr=subprocess.DEVNULL)
        return json.loads(out)
    except Exception as e:
        print(f"   curl fail: {e}")
        return None

def defillama_chain_tvl(name):
    """Latest TVL for one chain from DefiLlama's /v2/chains list."""
    d = curl_json('https://api.llama.fi/v2/chains') or []
    for c in d:
        if c.get('name', '').lower() == name.lower():
            return float(c.get('tvl') or 0)
    return None

def coingecko_token(coin_id):
    """Returns market_data for one coin."""
    url = (f"https://api.coingecko.com/api/v3/coins/{coin_id}"
           "?localization=false&tickers=false&community_data=false"
           "&developer_data=false&sparkline=false")
    d = curl_json(url)
    if not d or 'market_data' not in d:
        return None
    md = d['market_data']
    return {
        'price_usd':           (md.get('current_price') or {}).get('usd'),
        'token_mcap':          (md.get('market_cap') or {}).get('usd'),
        'fdv_usd':             (md.get('fully_diluted_valuation') or {}).get('usd'),
        'total_volume_usd':    (md.get('total_volume') or {}).get('usd'),
        'max_supply':          md.get('max_supply'),
        'circulating_supply':  md.get('circulating_supply'),
        'total_supply':        md.get('total_supply'),
    }

def main():
    print("Fetching all DefiLlama chain TVLs once...")
    all_chains = curl_json('https://api.llama.fi/v2/chains') or []
    tvl_by_name = {c.get('name', '').lower(): float(c.get('tvl') or 0) for c in all_chains}

    rows = []
    canton_full = None

    for dash_name, llama_name, gecko_id, symbol, note in CHAINS:
        print(f"  {dash_name:14s} ... ", end='', flush=True)
        tvl = tvl_by_name.get(llama_name.lower())
        cg  = coingecko_token(gecko_id)
        time.sleep(0.2)  # CG free-tier courtesy

        if tvl is None and not cg:
            print("no data; skipped")
            continue

        row = {
            'name':                 dash_name,
            'symbol':               symbol,
            'gecko_id':             gecko_id,
            'category':             'rwa',
            'distribution_note':    note,
            'tvl':                  tvl,
            'token_mcap':           cg.get('token_mcap') if cg else None,
            'fdv_usd':              cg.get('fdv_usd') if cg else None,
            'price_usd':            cg.get('price_usd') if cg else None,
            'total_volume_usd':     cg.get('total_volume_usd') if cg else None,
            'max_supply':           cg.get('max_supply') if cg else None,
            'circulating_supply':   cg.get('circulating_supply') if cg else None,
            'total_supply':         cg.get('total_supply') if cg else None,
        }
        # Derived
        if row['tvl'] and row['token_mcap']:
            row['mcaptvl'] = row['token_mcap'] / row['tvl']
        if row['tvl'] and row['fdv_usd']:
            row['fdv_tvl'] = row['fdv_usd'] / row['tvl']

        rows.append(row)
        flags = []
        if row.get('tvl') is not None:    flags.append(f"tvl=${row['tvl']/1e6:.1f}M")
        if row.get('token_mcap'):         flags.append(f"mcap=${row['token_mcap']/1e6:.0f}M")
        if row.get('fdv_usd'):            flags.append(f"fdv=${row['fdv_usd']/1e6:.0f}M")
        if row.get('mcaptvl'):            flags.append(f"M/T={row['mcaptvl']:.1f}x")
        if row.get('fdv_tvl'):            flags.append(f"FDV/T={row['fdv_tvl']:.1f}x")
        print(' · '.join(flags))

        if dash_name == 'Canton':
            canton_full = row.copy()
            # Canton-specific qualitative anchors used by the Compare page.
            # These do not change daily, so they are hand-curated here rather
            # than scraped (Canton public infrastructure status is fragile to
            # parse). Sourced from Digital Asset / Canton public materials.
            canton_full.update({
                'banking_partners':   'Goldman Sachs, Cumberland (DRW), HQLAx, BNP Paribas, ASX',
                'regulator':          'No single primary; participants under NY DFS, FINRA, US OCC, FCA, MAS',
                'native_stable':      'No native stablecoin (Canton Coin = network fee unit)',
                'institutional_use':  'Goldman bond settlement, Cumberland market-making, HQLAx collateral swaps',
                'token_model':        'No fixed max supply; ~38.7B CC circulating, mcap = FDV',
                'permissioning':      'Permissioned with privacy-preserving public layer',
                'launch_year':        2024,
            })

    rows.sort(key=lambda r: -(r.get('tvl') or 0))

    today = dt.date.today().isoformat()
    OUT_RWA.write_text(json.dumps({'asOf': today, 'rows': rows}, default=str, indent=2))
    print(f"\n✓ Wrote {len(rows)} rows to {OUT_RWA}")

    if canton_full:
        OUT_CANTON.write_text(json.dumps(canton_full, default=str, indent=2))
        print(f"✓ Wrote Canton snapshot to {OUT_CANTON}")

if __name__ == '__main__':
    main()
