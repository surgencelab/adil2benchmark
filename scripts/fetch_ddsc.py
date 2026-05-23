#!/usr/bin/env python3
"""Fetch DDSC totalSupply from ADI Chain RPC.

DDSC is ADI's CBUAE-licensed stablecoin (peg $1, 6 decimals). Its total
supply represents real bridged/minted capital on ADI Chain that DefiLlama
does not yet index. We report it directly from on-chain via eth_call.

Output: writes /tmp/ddsc_supply.json with {supply, tvl_usd, source, fetched_at}.
"""
import json
import subprocess
import datetime as dt

DDSC_ADDR = "0x1211f0cfe66739433c1330e21f4951B80E813479"
ADI_RPC   = "https://rpc.adifoundation.ai"
DECIMALS  = 6
# ERC-20 totalSupply() function selector
TOTAL_SUPPLY_SELECTOR = "0x18160ddd"


def eth_call(rpc: str, to: str, data: str) -> str:
    """Shells out to curl so it uses system certs — Python's framework install
    often lacks a working CA bundle. curl is universally available on macOS/Linux."""
    body = json.dumps({
        "jsonrpc": "2.0", "id": 1,
        "method": "eth_call",
        "params": [{"to": to, "data": data}, "latest"],
    })
    out = subprocess.check_output(
        ["curl", "-sS", "--max-time", "15",
         "-X", "POST", "-H", "Content-Type: application/json",
         "-d", body, rpc],
        stderr=subprocess.PIPE,
    )
    return json.loads(out)["result"]


def main():
    raw_hex = eth_call(ADI_RPC, DDSC_ADDR, TOTAL_SUPPLY_SELECTOR)
    raw = int(raw_hex, 16)
    supply = raw / (10 ** DECIMALS)
    tvl_usd = supply  # peg = $1, confirmed with team

    out = {
        "contract": DDSC_ADDR,
        "chain":    "ADI Chain",
        "rpc":      ADI_RPC,
        "decimals": DECIMALS,
        "peg_usd":  1.0,
        "raw_supply":      raw,
        "supply":          supply,
        "tvl_usd":         tvl_usd,
        "fetched_at":      dt.datetime.utcnow().isoformat() + "Z",
        "source":          f"eth_call totalSupply() on {ADI_RPC} (contract {DDSC_ADDR})",
    }
    with open("/tmp/ddsc_supply.json", "w") as f:
        json.dump(out, f, indent=2)
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
