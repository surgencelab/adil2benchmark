/**
 * Report page: 2-page narrative findings + implications.
 */
import type { Dataset } from '../data/types';
import { fmtUSD, fmtX, fmtPct } from '../lib/format';

interface Props { data: Dataset; }

export function ReportPage({ data }: Props) {
  const adi = data.adi;
  const C = data.cohorts;
  const sum = data.tierSummary;
  const adiMT = adi.mcaptvl_with_ddsc;

  // Live holder concentration peer slice (sourced from Moralis on each refresh).
  // We use an explicit hand-curated peer set rather than trying to algorithmically
  // separate "genuinely distributed" from "bridge-locked" or "treasury-heavy"
  // tokens, the cohort is too noisy for clean auto-classification (Sophon's
  // unlabelled 96% top holder, Lisk's single whale at 78%, etc.). The five chains
  // below are all airdropped L2s with clean Moralis data and labelled top holders.
  const CLEAN_PEERS = new Set(['Arbitrum', 'OP Mainnet', 'Manta', 'Mode', 'Zircuit']);
  const liveByName: Record<string, number> = {};
  for (const r of data.rows) {
    if (r.top10_pct != null && /moralis/i.test(r.top10_pct_source || '')) {
      liveByName[r.name] = r.top10_pct;
    }
  }
  const livePeerCount = Object.keys(liveByName).length;
  const cleanPeers = [...CLEAN_PEERS]
    .map((n) => ({ name: n, pct: liveByName[n] }))
    .filter((p) => p.pct != null)
    .sort((a, b) => a.pct - b.pct);
  const cleanMin = cleanPeers[0];
  const cleanMax = cleanPeers[cleanPeers.length - 1];

  return (
    <>
      <div className="page-header">
        <div className="page-eyebrow">Report</div>
        <h1 className="page-title">L2 Benchmark · Findings &amp; Implications</h1>
      </div>

      <div className="report-stack">
        <article className="report-page">
          <div className="report-meta">
            <span><span className="label">Page 1 of 2</span> · Findings</span>
            <span>Surgence Labs · ADI Foundation Audit · {data.asOf}</span>
          </div>

          <p className="report-lede">
            ADI benchmarked against the 30 most active Layer-2 chains tracked by DefiLlama, with on-chain TVL verified directly from the ADI RPC. Two views; both reported.
          </p>

          <h3 className="report-h2">Method</h3>
          <p className="report-p">
            Peer set: 30 rollups from DefiLlama, ranked by TVL and bucketed Large (top 5), Mid (next 10), Small (next 15). Per-bucket medians computed for TVL, native-token Mcap, DEX volume, FDV, daily active wallets, and Mcap/TVL. Top-10 holder concentration sourced from Moralis <code className="inline">erc20/owners</code>. Full source / formula list on Methodology (key <kbd style={{ fontFamily: 'var(--font-mono)', padding: '1px 5px', border: '1px solid var(--border)', borderRadius: 2, fontSize: 10 }}>5</kbd>).
          </p>
          <p className="report-p">
            ADI uses two TVL definitions. <b>DefiLlama-visible</b> counts only what their adapters index today: Uniswap V3 LPs on Ethereum, <b>{fmtUSD(adi.tvl_defillama_visible)}</b>. <b>On-chain</b> adds the DDSC stablecoin supply minted on ADI Chain, verified live via <code className="inline">eth_call totalSupply()</code> against <code className="inline">{adi.ddsc_rpc.replace('https://', '')}</code>.
          </p>
          <p className="report-p">
            DDSC is pegged 1:1 to UAE Dirham (AED), reserves custodied by First Abu Dhabi Bank (FAB). On-chain total of <b>{adi.ddsc_tvl_aed.toLocaleString()} DDSC</b> at the fixed {adi.ddsc_aed_per_usd} AED/USD peg = <b>{fmtUSD(adi.ddsc_tvl_usd)}</b>.
          </p>

          <h3 className="report-h2">Headline</h3>
          <div className="report-figures">
            <div className="report-fig"><div className="l">TVL · on-chain</div><div className="v">{fmtUSD(adi.tvl_with_ddsc)}</div><div className="s">incl. {fmtUSD(adi.ddsc_tvl_usd)} DDSC</div></div>
            <div className="report-fig"><div className="l">Mcap</div><div className="v">{fmtUSD(adi.token_mcap)}</div><div className="s">vs $279M Large median</div></div>
            <div className="report-fig"><div className="l">Mcap / TVL</div><div className="v">{fmtX(adiMT, 2)}</div><div className="s">above median</div></div>
            <div className="report-fig"><div className="l">24h turnover</div><div className="v danger">{fmtPct(adi.turnover_vol_mc_pct)}</div><div className="s">vs 1% liquid threshold</div></div>
          </div>

          <h3 className="report-h2">Two-view comparison</h3>
          <p className="report-p">
            <b>On-chain:</b> {fmtUSD(adi.tvl_with_ddsc)} TVL with DDSC, Mcap/TVL <b>{fmtX(adiMT, 2)}</b>. Above Mantle ({fmtX(5.83)}) and Manta ({fmtX(5.27)}), below World Chain ({fmtX(24.39)}).
          </p>
          <p className="report-p">
            <b>DefiLlama-visible:</b> {fmtUSD(adi.tvl_defillama_visible)} TVL, Mcap/TVL <b>{fmtX(adi.mcaptvl, 0)}</b>. A 50×+ outlier alongside IOTA EVM, because DefiLlama's adapter does not yet index DDSC.
          </p>

          <h3 className="report-h2">FDV lens</h3>
          <p className="report-p">
            FDV (price × max supply) is invariant to distribution timing, so it is the apples-to-apples lens across L2s with different float widths. ADI FDV/TVL <b>{fmtX((adi.fdv_usd || 0) / adi.tvl_with_ddsc, 1)}</b> vs non-airdrop cohort median <b>{fmtX(C.NonAirdrop?.fdv_tvl_med, 2)}</b>: <b>{(((adi.fdv_usd || 0) / adi.tvl_with_ddsc) / (C.NonAirdrop?.fdv_tvl_med || 1)).toFixed(1)}× the peer median</b>. The Mcap view (2× peer median) understates the gap because tight float flatters Mcap.
          </p>

          <h3 className="report-h2">Holder concentration · live peer data</h3>
          <p className="report-p">
            Top-10 wallet concentration for <b>{livePeerCount}/17 L2 tokens</b> live from Moralis on each refresh; one indexed call per token, labelled holders, pre-computed % of supply.
          </p>
          <ul className="report-list">
            <li><b>Apples-to-apples airdropped L2s sit {cleanMin?.pct.toFixed(0)}-{cleanMax?.pct.toFixed(0)}%.</b> Across our five cleanest comparators ({cleanPeers.map((p) => `${p.name} ${p.pct.toFixed(0)}%`).join(', ')}) the median sits around <b>{cleanPeers[Math.floor(cleanPeers.length / 2)]?.pct.toFixed(0)}%</b>. This is what "post-airdrop, tradeable float, real public ownership" actually looks like on-chain.</li>
            <li><b>Two peers look extreme but are bridge-locked.</b> Linea reads 99% top-10 because its top holder is "Linea: TokenBridge (Proxy)" at 97.6%, unbridged supply, not whale concentration. Metis is the same pattern (Andromeda Bridge holds 65%). The Moralis labels make this self-evident; the per-row tooltip on the L2 Universe table shows the top-holder identity for every row.</li>
            <li><b>Other live readings are not clean comparators.</b> Sophon (99.9% with an unlabelled top wallet), Lisk (93% with one whale at 78%), Mantle (87%, BitDAO treasury 47%), Movement (81%): all real Moralis numbers, but each reflects a treasury-concentration story (or pre-distribution state), not "ADI-like allocated distribution." We show them in the table; we don't average them into the comparator.</li>
            <li><b>ADI's 99.28% is at the absolute ceiling.</b> No public L2, bridge-locked, treasury-heavy, or genuinely distributed, sits above it. The audit's Concern #1 is real, and the live-peer data sharpens rather than softens it.</li>
          </ul>
          <p className="report-p muted">
            What does this mean operationally? The {cleanMin?.pct.toFixed(0)}-{cleanMax?.pct.toFixed(0)}% range for clean comparators (DAO treasury + exchanges + public holders) is what "decentralised governance + tradable float" looks like in practice. ADI's allocated-distribution model has produced a structurally different ownership pattern that no marketing fix can address, it has to dilute through real public distribution events.
          </p>

          <div className="report-footer">
            <span>ADI · L2 Benchmark</span>
            <span>Sources: DefiLlama, rpc.adifoundation.ai, Growthepie, CoinGecko, Moralis</span>
          </div>
        </article>

        <article className="report-page">
          <div className="report-meta">
            <span><span className="label">Page 2 of 2</span> · Implications</span>
            <span>Surgence Labs · ADI Foundation Audit · {data.asOf}</span>
          </div>

          <p className="report-lede">
            The audit's 206× headline reflects DefiLlama's adapter coverage, not ADI Chain. On-chain: {fmtX(adiMT, 2)} Mcap/TVL, {fmtX((adi.fdv_usd || 0) / adi.tvl_with_ddsc, 0)} FDV/TVL.
          </p>

          <h3 className="report-h2">Outlier framing is overstated</h3>
          <p className="report-p">
            DefiLlama does not index DDSC; that single missing data point produces the 206× headline. Including DDSC drops the ratio to <b>{fmtX(adiMT, 2)}</b> Mcap/TVL. The capital exists; the indexer does not see it yet.
          </p>

          <h3 className="report-h2">Biggest fix is data-layer (Concern #7)</h3>
          <p className="report-p">
            Submit a DDSC adapter to defillama-adapters. Once merged, the public Mcap/TVL drops from 206× to {fmtX(adiMT, 2)} for everyone, no narrative required.
          </p>

          <h3 className="report-h2">DEX volume gap is separate</h3>
          <p className="report-p">
            DDSC explains the TVL gap, not the volume gap. DefiLlama shows $0/day DEX volume on ADI Chain; cross-venue aggregate is $610K against $418M Mcap = 0.15% turnover. Either ADI's DEXes have real swaps DefiLlama does not index (same fix as DDSC) or activity is genuinely thin. Each case has its own remediation.
          </p>

          <h3 className="report-h2">IHC $30M settlement · on-chain proof</h3>
          <p className="report-p">
            International Holding Company executed a $30M (110.175M AED) DDSC settlement on ADI Chain on <b>14 Apr 2026</b>, in partnership with FAB and Sirius. Verified directly against the ADI explorer: three sequential transactions, identical amount, two-hour window.
          </p>
          {adi.ihc_tx && (
            <table className="data-table" style={{ margin: '8px 0 16px', fontSize: 11 }}>
              <thead><tr><th style={{ width: 60 }}>Step</th><th>Time (UTC)</th><th>Flow</th><th className="right">Block</th><th>Tx</th></tr></thead>
              <tbody>
                {adi.ihc_tx.steps.map((s, i) => (
                  <tr key={s.hash}>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{(i + 1).toString().padStart(2, '0')} · {s.label}</td>
                    <td className="muted" style={{ fontFamily: 'var(--font-mono)' }}>{new Date(s.time).toUTCString().slice(5, 22)}</td>
                    <td className="muted" style={{ fontFamily: 'var(--font-mono)' }}>{s.from.slice(0, 8)}… → {s.to.slice(0, 8)}…</td>
                    <td className="right" style={{ fontFamily: 'var(--font-mono)' }}>{s.block.toLocaleString()}</td>
                    <td><a href={`${adi.ihc_tx!.explorer}/tx/${s.hash}`} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>{s.hash.slice(0, 10)}…{s.hash.slice(-6)}</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="report-p">
            Pattern (mint → treasury hop → settlement) is the canonical regulator-aligned stablecoin issuance flow. Counterexample to "no on-chain activity"; hashes auditable against the ADI explorer.
          </p>

          <h3 className="report-h2">What cannot be fixed with narrative</h3>
          <p className="report-p">
            Float concentration. With live Moralis numbers across {livePeerCount} L2 tokens, ADI's <b>99.28%</b> top-10 is the highest reading on the board, above bridge-locked Linea (99.3%, 97.6% in TokenBridge) and Metis (84%, 65% in Andromeda Bridge). Apples-to-apples comparators ({cleanPeers.map((p) => `${p.name} ${p.pct.toFixed(0)}%`).join(', ')}) sit at roughly half ADI's level.
          </p>
          <p className="report-p">
            Structural, not narrative. Float needs distribution events. Two-quarter workplan, in parallel: <b>(a)</b> submit DefiLlama adapters (TVL + DEX); <b>(b)</b> continue DDSC issuance growth, the IHC flow shows institutional appetite is real; <b>(c)</b> begin staged distribution events to dilute the top-10. (a) and (b) are this-quarter work. (c) is the slowest line item.
          </p>

          <div className="report-callout">
            ADI on-chain Mcap/TVL <strong>{fmtX(adiMT, 2)}</strong>; FDV/TVL <strong>{fmtX((adi.fdv_usd || 0) / adi.tvl_with_ddsc, 0)}</strong>. Above L2 median but defensible. The audit's 206× measures DefiLlama coverage, not ADI Chain. Top-10 concentration of <strong>99.28%</strong> is the dashboard's most defensible finding, standing against live peer data re-pulled each refresh. 90-day work: ship DDSC + DEX adapters, sustain DDSC + product TVL growth, start staged distribution events.
          </div>

          <p className="report-p muted" style={{ marginTop: 18, fontSize: 11 }}>
            Every number above traces to a source documented on the <b>Methodology</b> tab (sidebar item 5).
            For holder data, hover any row on the L2 Universe table to see the top-holder label and provenance.
          </p>

          <div className="report-footer">
            <span>ADI · L2 Benchmark</span>
            <span>End of report · 2 pages</span>
          </div>
        </article>
      </div>
    </>
  );
}
