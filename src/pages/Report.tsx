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

  return (
    <>
      <div className="page-header">
        <div className="page-eyebrow">Report</div>
        <h1 className="page-title">L2 benchmark · findings &amp; implications</h1>
        <p className="page-sub">A plain-English two-page brief on what we measured, what it shows about ADI, and what it means for the team.</p>
      </div>

      <div className="report-stack">
        <article className="report-page">
          <div className="report-meta">
            <span><span className="label">Page 1 of 2</span> · Findings</span>
            <span>Surgence Labs · ADI Foundation Audit · {data.asOf}</span>
          </div>

          <h2 className="report-h1">What we found</h2>
          <p className="report-lede">
            We measured ADI against the 30 most active Layer-2 chains tracked by DefiLlama, then verified ADI's on-chain TVL directly from its own RPC. The two views tell different stories. The dashboard reports both.
          </p>

          <h3 className="report-h2"><span className="num">01</span>How we measured it</h3>
          <p className="report-p">
            For the 30 peer L2s, we took every rollup chain DefiLlama tracks, sorted them by TVL, and split them into three groups: top 5 are Large, next 10 are Mid, next 15 are Small. For each group we found the median of four numbers: TVL, native token market cap, daily DEX volume, and the ratio between market cap and TVL.
          </p>
          <p className="report-p">
            For ADI specifically, we used two TVL definitions. <b>The DefiLlama-visible view</b> counts only what their adapters index today (Uniswap V3 LPs on Ethereum: <b>{fmtUSD(adi.tvl_defillama_visible)}</b>). <b>The on-chain view</b> adds the DDSC stablecoin supply minted on ADI Chain, verified live via <code className="inline">eth_call totalSupply()</code> on <code className="inline">{adi.ddsc_rpc.replace('https://', '')}</code>.
          </p>
          <p className="report-p">
            DDSC is pegged <b>1:1 to the UAE Dirham (AED)</b>, reserves custodied by <b>First Abu Dhabi Bank (FAB)</b>. The on-chain total of <b>{adi.ddsc_tvl_aed.toLocaleString()} DDSC</b> converts at the fixed peg of {adi.ddsc_aed_per_usd} AED/USD to <b>{fmtUSD(adi.ddsc_tvl_usd)}</b>.
          </p>

          <h3 className="report-h2"><span className="num">02</span>The headline numbers</h3>
          <div className="report-figures">
            <div className="report-fig"><div className="l">ADI TVL (on-chain)</div><div className="v">{fmtUSD(adi.tvl_with_ddsc)}</div><div className="s">incl. {fmtUSD(adi.ddsc_tvl_usd)} DDSC</div></div>
            <div className="report-fig"><div className="l">ADI Mcap</div><div className="v">{fmtUSD(adi.token_mcap)}</div><div className="s">vs $279M large-L2 median</div></div>
            <div className="report-fig"><div className="l">Mcap / TVL</div><div className="v">{fmtX(adiMT, 2)}</div><div className="s">growth-priced, above median</div></div>
            <div className="report-fig"><div className="l">Daily turnover</div><div className="v danger">{fmtPct(adi.turnover_vol_mc_pct)}</div><div className="s">vs &gt;1% liquid threshold</div></div>
          </div>

          <h3 className="report-h2"><span className="num">03</span>The two views, side by side</h3>
          <p className="report-p">
            <b>On-chain view (verified):</b> {fmtUSD(adi.tvl_with_ddsc)} TVL with DDSC counted, giving a Mcap/TVL of <b>{fmtX(adiMT, 2)}</b>. Growth-priced: above Mantle ({fmtX(5.83)}) and Manta ({fmtX(5.27)}), below World Chain ({fmtX(24.39)}).
          </p>
          <p className="report-p">
            <b>DefiLlama-visible view:</b> {fmtUSD(adi.tvl_defillama_visible)} TVL, Mcap/TVL <b>{fmtX(adi.mcaptvl, 0)}</b>. A 50×+ outlier alongside IOTA EVM. That's because DefiLlama's adapter for ADI Chain doesn't yet index DDSC.
          </p>

          <h3 className="report-h2"><span className="num">04</span>FDV lens (client preferred)</h3>
          <p className="report-p">
            FDV (price × max supply) is invariant to distribution timing, which makes it the apples-to-apples lens when comparing across L2s with different float widths. ADI's FDV/TVL is <b>{fmtX((adi.fdv_usd || 0) / adi.tvl_with_ddsc, 1)}</b> vs the non-airdrop cohort median of <b>{fmtX(C.NonAirdrop?.fdv_tvl_med, 2)}</b>: that's <b>{(((adi.fdv_usd || 0) / adi.tvl_with_ddsc) / (C.NonAirdrop?.fdv_tvl_med || 1)).toFixed(1)}× the peer median</b>. The Mcap view (2× the peer median) understates the gap because tight float flatters Mcap.
          </p>

          <div className="report-footer">
            <span>ADI · L2 Benchmark</span>
            <span>Sources: DefiLlama, rpc.adifoundation.ai, Growthepie, CoinGecko</span>
          </div>
        </article>

        <article className="report-page">
          <div className="report-meta">
            <span><span className="label">Page 2 of 2</span> · Implications</span>
            <span>Surgence Labs · ADI Foundation Audit · {data.asOf}</span>
          </div>

          <h2 className="report-h1">What it means</h2>
          <p className="report-lede">
            The audit's headline (Mcap/TVL 206×) reflects what DefiLlama indexes today, not what's on ADI Chain. On-chain it's {fmtX(adiMT, 2)} Mcap/TVL and {fmtX((adi.fdv_usd || 0) / adi.tvl_with_ddsc, 0)} FDV/TVL: growth-priced, above the L2 median, but defensible.
          </p>

          <h3 className="report-h2"><span className="num">01</span>The audit's outlier framing is overstated</h3>
          <p className="report-p">
            DefiLlama doesn't index DDSC; that single missing data point produces the 206× headline. Including DDSC drops the ratio to <b>{fmtX(adiMT, 2)}</b> Mcap/TVL. The capital exists. The indexer doesn't see it yet.
          </p>

          <h3 className="report-h2"><span className="num">02</span>The biggest fix is data-layer (Concern #7)</h3>
          <p className="report-p">
            Submit a DDSC adapter to defillama-adapters. Once merged, the public Mcap/TVL drops from 206× to {fmtX(adiMT, 2)} automatically for everyone, no slide deck required.
          </p>

          <h3 className="report-h2"><span className="num">03</span>DEX volume gap is real (separate issue)</h3>
          <p className="report-p">
            DDSC explains the TVL gap, not the volume gap. DefiLlama shows $0/day DEX volume on ADI Chain; cross-venue aggregate is $610K against $418M Mcap = 0.15% turnover. Either ADI's DEXes have real swaps that DefiLlama doesn't index (same fix as DDSC), or activity is genuinely thin. Each case has its own fix.
          </p>

          <h3 className="report-h2"><span className="num">04</span>IHC's $30M proof</h3>
          <p className="report-p">
            International Holding Company executed a $30M (110M AED) DDSC transaction on ADI Chain in partnership with FAB and Sirius. First major corporate-scale transfer of a UAE Central Bank-regulated digital currency. That's a verifiable counterexample to "the chain has no real activity."
          </p>

          <h3 className="report-h2"><span className="num">05</span>What can't be fixed with marketing</h3>
          <p className="report-p">
            Float concentration (top 10 = 99.28%) is structural and public. Turnover takes float to grow. Disclosure helps the narrative but doesn't change the math. The two-quarter task is: submit DefiLlama adapters (TVL + DEX), keep DDSC issuance growing (the IHC flow shows institutional appetite is real), and accept that float-driven liquidity remains the slowest-moving line item.
          </p>

          <div className="report-callout">
            <strong>Bottom line:</strong> ADI's on-chain Mcap/TVL is <strong>{fmtX(adiMT, 2)}</strong>; FDV/TVL is <strong>{fmtX((adi.fdv_usd || 0) / adi.tvl_with_ddsc, 0)}</strong>. Growth-priced and above the L2 median but defensible. The audit's 206× measures DefiLlama's adapter coverage, not ADI Chain. 90-day work: (a) submit the DDSC + DEX adapters to DefiLlama, (b) keep DDSC + real product TVL growing, (c) address the volume gap on its own track.
          </div>

          <div className="report-footer">
            <span>ADI · L2 Benchmark</span>
            <span>End of report · 2 pages</span>
          </div>
        </article>
      </div>
    </>
  );
}
