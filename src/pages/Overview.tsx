/**
 * Overview page: ADI key metrics + TVL composition + Where ADI sits + nav cards.
 * Includes the small ADI Mcap/TVL sparkline that fills the previously-empty space.
 */
import type { Dataset, Route, L2Row } from '../data/types';
import { fmtUSD, fmtX, fmtPct } from '../lib/format';

interface Props {
  data: Dataset;
  setRoute: (r: Route) => void;
  // openDetail kept on the signature for future use (e.g., clicking a tile)
  openDetail?: (r: L2Row) => void;
}

export function OverviewPage({ data, setRoute }: Props) {
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

  return (
    <div className="term-grid">
      {/* Row 1: KPIs full width */}
      <div
        className="widget w-12"
        title="Mcap = price × circulating · TVL on-chain incl. DDSC · FDV = price × max supply · M/T and FDV/T ratios (healthy L2 range 0.3-5×) · 24h turnover (below 1% = illiquid)"
      >
        <div className="widget-head">
          <span className="widget-title">ADI · key metrics</span>
          <span className="widget-meta">on-chain · verified {data.asOf}</span>
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
        title="Uniswap V3 LP: DefiLlama-indexed · DDSC: on-chain totalSupply() via rpc.adifoundation.ai, peg 3.6725 AED/USD, reserves at FAB"
      >
        <div className="widget-head">
          <span className="widget-title">TVL composition</span>
          <span className="widget-meta">rpc.adifoundation.ai · eth_call totalSupply()</span>
        </div>
        <div className="widget-body flush">
          <table className="data-table">
            <thead><tr><th>Component</th><th className="right">USD</th><th>Verification</th></tr></thead>
            <tbody>
              <tr><td>Uniswap V3 LP</td><td className="right">{fmtUSD(adi.tvl_defillama_visible)}</td><td className="muted">DefiLlama</td></tr>
              <tr><td>DDSC (1 AED peg, FAB)</td><td className="right">{fmtUSD(adi.ddsc_tvl_usd)}</td><td className="muted">eth_call</td></tr>
              <tr style={{ background: 'rgba(212,169,60,0.08)', fontWeight: 600 }}>
                <td>Total</td><td className="right">{fmtUSD(adi.tvl_with_ddsc)}</td><td className="muted">sum</td>
              </tr>
              <tr><td className="muted">DefiLlama view (no DDSC)</td><td className="right" style={{ color: 'var(--accent-red)' }}>{fmtUSD(adi.tvl_defillama_visible)}</td><td className="muted">audit ref</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="widget w-6">
        <div className="widget-head">
          <span className="widget-title">ADI vs cohort medians</span>
          <span className="widget-meta">Mcap + FDV lenses · non-airdrop benchmark</span>
        </div>
        <div className="widget-body flush">
          <table className="data-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th className="right">ADI</th>
                <th className="right">Cohort</th>
                <th className="right">x median</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Mcap / TVL</td>
                <td className="right">{fmtX(adiMT, 2)}</td>
                <td className="right">{fmtX(C.NonAirdrop?.mcap_tvl_med, 2)}</td>
                <td className="right"><span className="warn">{(adiMT / (C.NonAirdrop?.mcap_tvl_med || 1)).toFixed(1)}x</span></td>
              </tr>
              <tr>
                <td>FDV / TVL</td>
                <td className="right">{fmtX(adiFDVTVL, 1)}</td>
                <td className="right">{fmtX(C.NonAirdrop?.fdv_tvl_med, 2)}</td>
                <td className="right"><span className="danger">{(adiFDVTVL / (C.NonAirdrop?.fdv_tvl_med || 1)).toFixed(1)}x</span></td>
              </tr>
              <tr>
                <td>M/T DefiLlama view</td>
                <td className="right"><span className="danger">{fmtX(adi.mcaptvl, 0)}</span></td>
                <td className="right muted">no DDSC indexed</td>
                <td className="right muted">data gap</td>
              </tr>
              <tr className="row-section"><td colSpan={4}>// cohort medians (n)</td></tr>
              <tr>
                <td>Airdrop ({C.Airdrop?.n})</td>
                <td className="right">M/T {fmtX(C.Airdrop?.mcap_tvl_med, 2)}</td>
                <td className="right">FDV/T {fmtX(C.Airdrop?.fdv_tvl_med, 2)}</td>
                <td className="right">-</td>
              </tr>
              <tr>
                <td>Non-airdrop ({C.NonAirdrop?.n})</td>
                <td className="right">M/T {fmtX(C.NonAirdrop?.mcap_tvl_med, 2)}</td>
                <td className="right">FDV/T {fmtX(C.NonAirdrop?.fdv_tvl_med, 2)}</td>
                <td className="right">-</td>
              </tr>
              <tr>
                <td>No-token ({C.NoToken?.n})</td>
                <td className="right">TVL med</td>
                <td className="right">{fmtUSD(C.NoToken?.tvl_med)}</td>
                <td className="right">-</td>
              </tr>
              <tr className="row-section"><td colSpan={4}>// nearest peers (by M/T)</td></tr>
              {peers.map((p) => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td className="right">M/T {fmtX(p._mt, 2)}</td>
                  <td className="right">FDV/T {p.fdv_usd ? fmtX(p.fdv_usd / p.tvl, 2) : '-'}</td>
                  <td className="right">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 3: Holder concentration comparison, ADI vs peer cohort */}
      <div
        className="widget w-12"
        title="Top-10 wallet concentration (% supply) · 14/17 live via Moralis erc20/owners · Scroll/Blast/BOB seeded · ADI from audit · bridge/treasury contracts count as holders (Linea 97.6% in TokenBridge, Metis 65% in Bridge)"
      >
        <div className="widget-head">
          <span className="widget-title">Holder concentration · top 10 wallets</span>
          <span className="widget-meta">% of supply · live via Moralis (14/17), Etherscan-page seed for Scroll / Blast / BOB</span>
        </div>
        <div className="widget-body">
          {(() => {
            const peers = data.rows
              .filter((r) => r.top10_pct != null)
              .map((r) => ({ name: r.name, sym: r.symbol, pct: r.top10_pct as number, note: r.top10_pct_note || '' }))
              .sort((a, b) => b.pct - a.pct);
            const adiPct = adi.top10_pct ?? adi.top10_concentration_pct ?? 0;
            const allWithAdi = [{ name: 'ADI Chain', sym: 'ADI', pct: adiPct, note: adi.top10_pct_note || '', isAdi: true }, ...peers.map((p) => ({ ...p, isAdi: false }))];
            const max = 100;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {allWithAdi.map((p) => {
                  const barColor = p.isAdi ? 'var(--accent-red)' : p.pct > 80 ? 'var(--accent-yellow)' : p.pct > 60 ? 'var(--accent-orange)' : 'var(--accent-green)';
                  const labelColor = p.isAdi ? 'var(--accent-red)' : 'var(--foreground)';
                  return (
                    <div key={p.name} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 50px', gap: 10, alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 11 }} title={p.note}>
                      <span style={{ color: labelColor, fontWeight: p.isAdi ? 700 : 500 }}>{p.name}<span style={{ color: 'var(--text-muted)', marginLeft: 4, fontSize: 10 }}>{p.sym}</span></span>
                      <div style={{ position: 'relative', height: 14, background: 'var(--tint-soft)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(p.pct / max) * 100}%`, background: barColor, opacity: p.isAdi ? 0.95 : 0.78, borderRadius: 2 }} />
                      </div>
                      <span style={{ textAlign: 'right', fontWeight: p.isAdi ? 700 : 600, color: labelColor }}>{p.pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', lineHeight: 1.55 }}>
                  ADI's <b style={{ color: 'var(--accent-red)' }}>99.28%</b> top-10 concentration is the audit's <b>Concern #1</b>. Among public L2s with tokens, the highest is <b>{peers[0]?.name}</b> at <b>{peers[0]?.pct}%</b>. Watch the labelled rows: Linea sits at 99% because the TokenBridge proxy holds 97.6% of supply (unbridged, not whale-held); Metis is similar. The genuinely-distributed peers (Manta, Mode, Zircuit, Arbitrum) sit 36-47%. <em style={{ color: 'var(--text-muted)' }}>Hover any row for the top-holder label.</em><br />
                  <span style={{ fontSize: 10, opacity: 0.8 }}>
                    <b>Sourcing:</b> 14/17 L2 tokens live from Moralis <code>erc20/owners</code> (indexed view, refreshed each cycle). Scroll, Blast, BOB keep manual Etherscan-page seeds since Moralis does not index those chains.
                  </span>
                </div>
              </div>
            );
          })()}
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
