/**
 * Overview page: ADI key metrics + TVL composition + Where ADI sits + nav cards.
 * Includes the small ADI Mcap/TVL sparkline that fills the previously-empty space.
 */
import type { Dataset, Route, L2Row } from '../data/types';
import { fmtUSD, fmtX, fmtPct } from '../lib/format';
import { Spark } from '../components/Spark';

interface Props {
  data: Dataset;
  setRoute: (r: Route) => void;
  openDetail: (r: L2Row) => void;
}

export function OverviewPage({ data, setRoute, openDetail }: Props) {
  const adi = data.adi;
  const sum = data.tierSummary;
  const C = data.cohorts;
  const adiMT = adi.mcaptvl_with_ddsc;
  const adiFDVTVL = adi.fdv_usd && adi.tvl_with_ddsc ? adi.fdv_usd / adi.tvl_with_ddsc : 0;
  const peers = data.rows
    .filter((r) => r.has_token && !r.airdrop_distributed && r.chain_mcap && r.tvl)
    .map((r) => ({ ...r, _mt: (r.chain_mcap as number) / r.tvl }))
    .sort((a, b) => Math.abs(a._mt - adiMT) - Math.abs(b._mt - adiMT))
    .slice(0, 3);

  // Historical M/T sparkline for ADI to fill bottom space.
  const adiHistory: number[] = (data.history?.adi || []).filter((v): v is number => v != null);

  return (
    <div className="term-grid">
      {/* Row 1: KPIs full width */}
      <div
        className="widget w-12"
        title="ADI's six headline numbers. Mcap is the public token cap (price × circulating). TVL is the dollar value on ADI Chain, including $33.2M of DDSC stablecoin verified live via RPC. FDV is fully-diluted. Mcap/TVL and FDV/TVL show how expensive the token is vs real usage; healthy L2 range is 0.3-5×. Turnover is 24h volume / Mcap; below 1%/day is conventionally illiquid."
      >
        <div className="widget-head">
          <span className="widget-title">ADI · key metrics</span>
          <span className="widget-meta">On-chain · verified · hover header to learn</span>
        </div>
        <div className="widget-body">
          <div className="stat-row" style={{ justifyContent: 'space-between' }}>
            <div className="stat"><div className="l">Mcap</div><div className="v">{fmtUSD(adi.token_mcap)}</div><div className="s">CG · Kraken</div></div>
            <div className="stat"><div className="l">TVL (on-chain)</div><div className="v">{fmtUSD(adi.tvl_with_ddsc)}</div><div className="s">incl. DDSC</div></div>
            <div className="stat"><div className="l">FDV</div><div className="v">{fmtUSD(adi.fdv_usd)}</div><div className="s">1B max supply</div></div>
            <div className="stat"><div className="l">Mcap / TVL</div><div className="v warn">{fmtX(adiMT, 2)}</div><div className="s">Mid med {fmtX(sum.Mid.mcap_tvl_med, 2)}</div></div>
            <div className="stat"><div className="l">FDV / TVL</div><div className="v warn">{fmtX(adiFDVTVL, 1)}</div><div className="s">unlock overhang</div></div>
            <div className="stat"><div className="l">24h turnover</div><div className="v down">{fmtPct(adi.turnover_vol_mc_pct, 2)}</div><div className="s">below 1% illiquid</div></div>
          </div>
        </div>
      </div>

      {/* Row 2: TVL composition + Where ADI sits */}
      <div
        className="widget w-6"
        title="What makes up ADI's $35.2M TVL. The Uniswap LP figure is what DefiLlama indexes today. The DDSC figure is the on-chain totalSupply() of the CBUAE-licensed DDSC stablecoin (1 DDSC = 1 AED, reserves at FAB), converted to USD at the 3.6725 peg."
      >
        <div className="widget-head">
          <span className="widget-title">TVL composition</span>
          <span className="widget-meta">rpc.adifoundation.ai · hover to learn</span>
        </div>
        <div className="widget-body flush">
          <table className="data-table">
            <thead><tr><th>Component</th><th className="right">USD</th><th>Verification</th></tr></thead>
            <tbody>
              <tr><td>Uniswap V3 LP</td><td className="right">{fmtUSD(adi.tvl_defillama_visible)}</td><td className="muted">DefiLlama</td></tr>
              <tr><td>DDSC (1 AED peg, FAB)</td><td className="right">{fmtUSD(adi.ddsc_tvl_usd)}</td><td className="muted">eth_call</td></tr>
              <tr style={{ background: 'rgba(255,139,77,0.08)', fontWeight: 600 }}>
                <td>Total</td><td className="right">{fmtUSD(adi.tvl_with_ddsc)}</td><td className="muted">sum</td>
              </tr>
              <tr><td className="muted">DefiLlama view (no DDSC)</td><td className="right" style={{ color: 'var(--accent-red)' }}>{fmtUSD(adi.tvl_defillama_visible)}</td><td className="muted">audit ref</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        className="widget w-6"
        title="Plain-English read of where ADI lands across the L2 universe, side-by-side under both lenses."
      >
        <div className="widget-head">
          <span className="widget-title">Where ADI sits</span>
          <span className="widget-meta">peer + tier + audit lens</span>
        </div>
        <div className="widget-body">
          <div className="position-read" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="pr-cell">
              <div className="pr-label">Mcap lens (price × circulating)</div>
              <div className="pr-value">
                ADI's <b>M/T {fmtX(adiMT, 2)}</b> vs non-airdrop cohort median <b>{fmtX(C.NonAirdrop?.mcap_tvl_med, 2)}</b>.
                That's <span className="warn">{(adiMT / (C.NonAirdrop?.mcap_tvl_med || 1)).toFixed(1)}× the cohort median</span>.
                Tight float (~10% circulating) flatters the number.
              </div>
            </div>
            <div className="pr-cell" style={{ background: 'rgba(255,139,77,0.04)', borderRadius: 3 }}>
              <div className="pr-label" style={{ color: 'var(--accent-orange)' }}>FDV lens · client preferred</div>
              <div className="pr-value">
                ADI's <b>FDV/TVL {fmtX(adiFDVTVL, 1)}</b> vs non-airdrop cohort median <b>{fmtX(C.NonAirdrop?.fdv_tvl_med, 2)}</b>.
                That's <span className="danger">{(adiFDVTVL / (C.NonAirdrop?.fdv_tvl_med || 1)).toFixed(1)}× the cohort median</span>.
                FDV doesn't depend on distribution; it's the apples-to-apples lens.
              </div>
            </div>
          </div>
          <div className="position-read" style={{ marginTop: 10 }}>
            <div className="pr-cell">
              <div className="pr-label">Nearest peers (by Mcap/TVL)</div>
              <div className="pr-value">
                {peers.map((p) => (
                  <div key={p.name}>
                    <b>{p.name}</b> M/T {fmtX(p._mt, 2)} · FDV/TVL {p.fdv_usd ? fmtX(p.fdv_usd / p.tvl, 2) : '-'}
                  </div>
                ))}
              </div>
            </div>
            <div className="pr-cell">
              <div className="pr-label">Cohort medians (n)</div>
              <div className="pr-value">
                Airdrop ({C.Airdrop?.n}) · M/T <b>{fmtX(C.Airdrop?.mcap_tvl_med, 2)}</b> · FDV/TVL <b>{fmtX(C.Airdrop?.fdv_tvl_med, 2)}</b><br />
                Non-airdrop ({C.NonAirdrop?.n}) · M/T <b>{fmtX(C.NonAirdrop?.mcap_tvl_med, 2)}</b> · FDV/TVL <b>{fmtX(C.NonAirdrop?.fdv_tvl_med, 2)}</b><br />
                No-token ({C.NoToken?.n}) · TVL med <b>{fmtUSD(C.NoToken?.tvl_med)}</b>
              </div>
            </div>
            <div className="pr-cell">
              <div className="pr-label">Audit-view gap</div>
              <div className="pr-value">
                DefiLlama M/T <span className="danger">{fmtX(adi.mcaptvl, 0)}</span> (no DDSC indexed).
                On-chain M/T is <b>{fmtX(adiMT, 2)}</b>. The gap is a data-layer problem.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: ADI 90d Mcap/TVL trend mini-chart (fills the dead space below) */}
      {adiHistory.length > 0 && (
        <div
          className="widget w-6"
          title="ADI's Mcap/TVL ratio over the last 90 days (DefiLlama view, since the on-chain reframe is recent). Trending up = price drifting down on flat indexed TVL."
        >
          <div className="widget-head">
            <span className="widget-title">ADI Mcap/TVL · 90d (DefiLlama view)</span>
            <span className="widget-meta">{adiHistory.length}d</span>
          </div>
          <div className="widget-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Spark data={adiHistory} width={400} height={80} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase' }}>last value</div>
              <div style={{ color: 'var(--accent-red)', fontWeight: 700, fontSize: 18 }}>{fmtX(adiHistory[adiHistory.length - 1], 0)}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 4 }}>
                from {fmtX(adiHistory[0], 0)} 90d ago
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className="widget w-6"
        title="DDSC stablecoin supply over time would normally appear here. The contract is verified live from rpc.adifoundation.ai. Historical series will populate as scheduled refreshes accumulate."
      >
        <div className="widget-head">
          <span className="widget-title">DDSC on-chain proof</span>
          <span className="widget-meta">{adi.ddsc_rpc.replace('https://', '')}</span>
        </div>
        <div className="widget-body">
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.7, color: 'var(--text-muted)' }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Contract</span> <span style={{ color: 'var(--foreground)' }}>{adi.ddsc_contract.slice(0, 12)}…{adi.ddsc_contract.slice(-6)}</span></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Peg</span> <span style={{ color: 'var(--foreground)' }}>1 DDSC = 1 AED · {adi.ddsc_aed_per_usd} AED/USD</span></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Reserves</span> <span style={{ color: 'var(--foreground)' }}>{adi.ddsc_reserve_bank}</span></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Supply (AED)</span> <span style={{ color: 'var(--accent-orange)', fontWeight: 700 }}>{Number(adi.ddsc_tvl_aed).toLocaleString()} AED</span></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Supply (USD)</span> <span style={{ color: 'var(--accent-orange)', fontWeight: 700 }}>{fmtUSD(adi.ddsc_tvl_usd)}</span></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Method</span> <span style={{ color: 'var(--foreground)' }}>eth_call totalSupply()</span></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Last fetched</span> <span style={{ color: 'var(--foreground)' }}>{adi.ddsc_fetched_at}</span></div>
          </div>
        </div>
      </div>

      {/* Row 4: Nav cards to other pages */}
      <div className="w-12">
        <div className="nav-cards">
          <div className="nav-card" onClick={() => setRoute('table')}>
            <span className="nc-eyebrow">3 · L2 Universe</span>
            <span className="nc-title">Compare ADI to {data.rows.length} chains</span>
            <span className="nc-sub">Filter by distribution model, tier, FDV status. Click any row for full chain detail with a 30-day chart.</span>
            <span className="nc-arrow">Open table →</span>
          </div>
          <div className="nav-card" onClick={() => setRoute('scatter')}>
            <span className="nc-eyebrow">2 · Charts</span>
            <span className="nc-title">Where ADI sits on the map</span>
            <span className="nc-sub">Mcap vs TVL scatter (both ADI views shown) + Mcap/TVL trend over 90 days vs tier-median bands.</span>
            <span className="nc-arrow">Open charts →</span>
          </div>
          <div className="nav-card" onClick={() => setRoute('report')}>
            <span className="nc-eyebrow">4 · Report</span>
            <span className="nc-title">Two-page findings &amp; implications</span>
            <span className="nc-sub">Methodology, headline numbers, what the data-layer gap means, IHC institutional proof point.</span>
            <span className="nc-arrow">Read report →</span>
          </div>
        </div>
      </div>
    </div>
  );
}
