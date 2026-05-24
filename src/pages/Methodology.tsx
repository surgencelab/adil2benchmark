/**
 * Methodology page: complete documentation of data sources, computations,
 * classifications, and known limitations. Auditable by anyone reading the dashboard.
 */
import type { Dataset } from '../data/types';

interface Props { data: Dataset; }

export function MethodologyPage({ data }: Props) {
  const adi = data.adi;

  return (
    <>
      <div className="page-header">
        <div className="page-eyebrow">Methodology</div>
        <h1 className="page-title">How we built every number on this dashboard</h1>
        <p className="page-sub">Every cell on the L2 Universe table, every dot on the scatter, and every line in the Report traces back to one of the sources listed here. The intent is that a reviewer can reproduce any value with the listed endpoint and a free API key.</p>
      </div>

      <div className="report-stack">

        {/* ─────────────────────────────────────────── Page 1: Data sources */}
        <article className="report-page">
          <div className="report-meta">
            <span><span className="label">Page 1 of 4</span> · Data sources</span>
            <span>Surgence Labs · ADI Foundation Audit · {data.asOf}</span>
          </div>

          <h2 className="report-h1">Sources we pull from</h2>
          <p className="report-lede">
            Five external APIs plus one ADI-native RPC. Each fetcher script writes
            to <code className="inline">/tmp/*.json</code>; <code className="inline">scripts/refresh_all.py</code> merges
            them into <code className="inline">public/data.json</code> which the React app reads on load.
          </p>

          <h3 className="report-h2"><span className="num">01</span>DefiLlama — chain TVL, token Mcap, DEX volume</h3>
          <p className="report-p">
            Free, no API key. Endpoints used:
          </p>
          <ul className="report-list">
            <li><code className="inline">api.llama.fi/protocols</code> — current TVL per protocol, summed per chain to build the L2 list</li>
            <li><code className="inline">api.llama.fi/v2/historicalChainTvl/&#123;chain&#125;</code> — 90-day TVL history for tier bands</li>
            <li><code className="inline">api.llama.fi/overview/dexs/&#123;chain&#125;</code> — 24h / 7d / 30d DEX volume</li>
            <li><code className="inline">coins.llama.fi/prices/current/&#123;chain&#125;:&#123;addr&#125;</code> — chain-native token price (fallback to CoinGecko)</li>
          </ul>
          <p className="report-p muted">
            We treat DefiLlama as ground truth for TVL — they index protocol contracts directly
            from on-chain calls. We do not re-verify their adapter outputs per chain.
          </p>

          <h3 className="report-h2"><span className="num">02</span>CoinGecko — FDV, max supply, 30d sparklines</h3>
          <p className="report-p">
            Free public API, no key. Endpoints used:
          </p>
          <ul className="report-list">
            <li><code className="inline">api.coingecko.com/api/v3/coins/&#123;id&#125;</code> — market_data (price, mcap, fdv, circulating + max supply, 24h volume)</li>
            <li><code className="inline">api.coingecko.com/api/v3/coins/&#123;id&#125;/market_chart?days=30</code> — 30-day price series for sparklines</li>
          </ul>
          <p className="report-p">
            The mapping from dashboard chain name → CoinGecko slug lives in <code className="inline">scripts/fetch_activity.py</code>.
            Five chains have no CG coverage (Cyber, Swellchain, Polynomial, GateLayer, MegaETH) — their FDV / token-price cells show "–".
          </p>

          <h3 className="report-h2"><span className="num">03</span>Growthepie — tx/day, daily active wallets, fees, stables</h3>
          <p className="report-p">
            Free public API, no key. One call per chain:
          </p>
          <ul className="report-list">
            <li><code className="inline">api.growthepie.xyz/v1/chains/&#123;slug&#125;.json</code> — full metric suite with daily history</li>
          </ul>
          <p className="report-p">
            Growthepie tracks <b>31 L2 chains</b>. The 26 long-tail chains we list (Cyber,
            Swellchain, Polynomial, Pepu, Moonchain, Matchain, Mind Network, etc.) are
            not on their list, so their activity columns show "–" — that's a coverage
            gap, not missing data.
          </p>
          <p className="report-p muted">
            The displayed value is the <b>latest single-day</b> from Growthepie's series. This makes spikes
            (airdrop campaigns, quest days, sybil bursts) show up unbuffered. Example: Linea's typical
            DAA is ~6K; a single-day spike to 31K we observed during testing is one such artifact.
          </p>

          <h3 className="report-h2"><span className="num">04</span>Moralis — top-10 holder concentration</h3>
          <p className="report-p">
            Requires an API key (free tier 40K compute units/day). Single endpoint:
          </p>
          <ul className="report-list">
            <li><code className="inline">deep-index.moralis.io/api/v2.2/erc20/&#123;addr&#125;/owners?chain=&#123;c&#125;&amp;limit=20&amp;order=DESC</code> — top holders sorted by balance, with pre-computed <code className="inline">percentage_relative_to_total_supply</code> per holder, plus owner labels (e.g. "Arbitrum: DAO Treasury", "Binance: Cold Wallet")</li>
          </ul>
          <p className="report-p">
            We pull 20, filter out two burn-sink addresses
            (<code className="inline">0x0…0</code>, <code className="inline">0x0…dEaD</code>),
            then sum the percentages of the remaining top 10.
          </p>
          <p className="report-p">
            <b>Coverage:</b> 14 of 17 tracked L2 tokens get live data each refresh. The
            other 3 (Scroll, Blast, BOB) keep manually-seeded values from each chain's
            public Etherscan / Blockscout "Token Holders" page, because Moralis does
            not yet index those chains. Each row's tooltip shows its actual source.
          </p>

          <h3 className="report-h2"><span className="num">05</span>ADI RPC + ADI Explorer — DDSC and IHC verification</h3>
          <p className="report-p">
            Direct on-chain reads against ADI Foundation's own infrastructure.
            No third-party intermediary — these are the proof points.
          </p>
          <ul className="report-list">
            <li><code className="inline">{adi.ddsc_rpc.replace('https://', '')}</code> — JSON-RPC <code className="inline">eth_call</code> to DDSC contract <code className="inline">{adi.ddsc_contract}</code>, selector <code className="inline">0x18160ddd</code> (<code className="inline">totalSupply()</code>)</li>
            <li><code className="inline">explorer-api.adifoundation.ai/api/v2/...</code> — transaction-trail walk to verify the IHC $30M settlement (mint → treasury hop → final)</li>
          </ul>
        </article>

        {/* ─────────────────────────────────────────── Page 2: What we compute */}
        <article className="report-page">
          <div className="report-meta">
            <span><span className="label">Page 2 of 4</span> · What we compute</span>
            <span>Formulas + worked examples</span>
          </div>

          <h2 className="report-h1">Computations</h2>
          <p className="report-lede">
            Every derived field has a single deterministic formula. Worked examples
            below use ADI's own numbers so each value matches what you see on the dashboard today.
          </p>

          <h3 className="report-h2"><span className="num">01</span>Mcap / TVL and FDV / TVL</h3>
          <p className="report-p">
            Direct ratios. We surface both because Mcap (circulating × price) and FDV
            (max supply × price) tell different stories — the team prefers FDV because it
            captures locked / vesting supply.
          </p>
          <ul className="report-list">
            <li><code className="inline">mcap_tvl = token_mcap ÷ chain_tvl</code></li>
            <li><code className="inline">fdv_tvl  = fdv_usd ÷ chain_tvl</code></li>
          </ul>

          <h3 className="report-h2"><span className="num">02</span>DDSC AED → USD conversion</h3>
          <p className="report-p">
            DDSC is pegged 1:1 to UAE Dirham (AED). To compare against USD-denominated
            TVL we apply the fixed peg <code className="inline">{adi.ddsc_aed_per_usd} AED/USD</code>:
          </p>
          <ul className="report-list">
            <li><code className="inline">ddsc_supply_aed = totalSupply() ÷ 10^{adi.ddsc_decimals}</code> (decimals from on-chain <code className="inline">decimals()</code> call)</li>
            <li><code className="inline">ddsc_tvl_usd = ddsc_supply_aed ÷ {adi.ddsc_aed_per_usd}</code></li>
            <li>Current values: <b>{adi.ddsc_tvl_aed.toLocaleString()} DDSC</b> ÷ {adi.ddsc_aed_per_usd} = <b>${adi.ddsc_tvl_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD</b></li>
          </ul>

          <h3 className="report-h2"><span className="num">03</span>TVL with DDSC (on-chain view)</h3>
          <p className="report-p">
            DefiLlama's adapter for ADI Chain does not index DDSC yet. The
            on-chain view adds the live verified supply:
          </p>
          <ul className="report-list">
            <li><code className="inline">tvl_with_ddsc = tvl_defillama_visible + ddsc_tvl_usd</code></li>
            <li>Current: ${adi.tvl_defillama_visible.toLocaleString()} + ${adi.ddsc_tvl_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })} = <b>${adi.tvl_with_ddsc.toLocaleString(undefined, { maximumFractionDigits: 0 })}</b></li>
            <li><code className="inline">mcaptvl_with_ddsc = token_mcap ÷ tvl_with_ddsc</code></li>
          </ul>

          <h3 className="report-h2"><span className="num">04</span>Tier bucketing</h3>
          <p className="report-p">
            All peer L2s are sorted by current TVL (descending), then sliced:
          </p>
          <ul className="report-list">
            <li><b>Large</b> — ranks 1-5 (currently: Base, Arbitrum, OP, Mantle, Linea)</li>
            <li><b>Mid</b> — ranks 6-15</li>
            <li><b>Small</b> — ranks 16-30</li>
            <li><b>Micro</b> — rest of the long tail</li>
            <li><b>ADI</b> — special tier, never bucketed with peers</li>
          </ul>
          <p className="report-p muted">
            Tier membership is recomputed on every refresh, so a chain can move between
            tiers if its TVL rank shifts. The 90-day trend chart uses fixed tier membership
            from the dataset's <code className="inline">asOf</code> date.
          </p>

          <h3 className="report-h2"><span className="num">05</span>Cohort medians (airdrop vs non-airdrop vs no-token)</h3>
          <p className="report-p">
            Each L2 is classified into one of three cohorts (see Page 3 for the rules).
            For each cohort we compute the median of these metrics across its members:
            TVL, Mcap, FDV, 24h DEX volume, Mcap/TVL, FDV/TVL, tx/day, daily active wallets.
            The "Non-airdrop (have token)" cohort is what we benchmark ADI against —
            same lifecycle stage, no inflated DAA from airdrop-day spikes.
          </p>

          <h3 className="report-h2"><span className="num">06</span>Top-10 holder concentration</h3>
          <p className="report-p">
            For each tracked token, sum the percentages of the 10 largest non-sink holders:
          </p>
          <ul className="report-list">
            <li>Fetch top 20 owners (Moralis), filter out burn-sink addresses</li>
            <li><code className="inline">top10_pct = Σ first 10 holders' percentage_relative_to_total_supply</code></li>
            <li>Reject if outside [0, 100] (defensive guard for indexer staleness)</li>
          </ul>
          <p className="report-p muted">
            We deliberately do <b>not</b> filter out treasury / bridge / DAO multisig contracts.
            That choice means Linea (97.6% in its TokenBridge proxy) and Metis (65% in its
            Andromeda Bridge) appear "concentrated" even though that supply is bridge-locked,
            not whale-held. The per-row tooltip surfaces the top-holder label so the distinction is visible.
          </p>
        </article>

        {/* ─────────────────────────────────────────── Page 3: Classifications */}
        <article className="report-page">
          <div className="report-meta">
            <span><span className="label">Page 3 of 4</span> · Classifications</span>
            <span>How we tag distribution model + audit views</span>
          </div>

          <h2 className="report-h1">Distribution model classification</h2>
          <p className="report-lede">
            Every L2 row carries a <code className="inline">distribution_model</code> tag.
            These are <b>manually classified</b> by us from each token's public history,
            not pulled from any API. The full per-row tagging is in <code className="inline">public/data.json</code>;
            the rules we used to assign them are below.
          </p>

          <h3 className="report-h2"><span className="num">01</span>airdrop</h3>
          <p className="report-p">
            Token launched in 2021+ with a defined airdrop event to early users / bridgers / testnet
            participants. Most modern L2s (Arbitrum, Optimism, ZKsync, Starknet, Linea, Scroll,
            Blast, World Chain, Manta, Mode, etc.) sit here. Distribution rewards <i>usage</i>,
            not equal-opportunity buying.
          </p>

          <h3 className="report-h2"><span className="num">02</span>fair_launch</h3>
          <p className="report-p">
            Token issued at <b>one publicly-known price, simultaneously available to all
            participants</b>, with no insider allocation, no team vesting cliff, no investor
            lockup. All four of our fair-launch chains are 2015-2021 era:
          </p>
          <ul className="report-list">
            <li><b>IOTA</b> (2015) — Bitcointalk-forum ICO at $0.00001/MIOTA</li>
            <li><b>Lisk</b> (2016) — 25-day BTC contribution window, one price for all</li>
            <li><b>Celo</b> (2020) — CoinList public sale, no separate insider tier</li>
            <li><b>Metis</b> (2021) — Polis token swap, no pre-mine, no VC round</li>
          </ul>

          <h3 className="report-h2"><span className="num">03</span>token_swap</h3>
          <p className="report-p">
            Current token isn't a fresh launch — holders inherited it via 1:1 conversion
            from a predecessor token. No new distribution event, no new opportunity for outsiders.
            The <i>least</i> democratic of the four categories.
          </p>
          <ul className="report-list">
            <li><b>Mantle (MNT)</b> — BitDAO's BIT token (2021) → MNT 1:1 in May 2023. Top holder is "BitDAO: Treasury" with 46.6%</li>
            <li><b>Cronos zkEVM (ZKCRO)</b> — Cronos chain's CRO distribution mirrored to ZKCRO; Crypto.com dominant</li>
          </ul>

          <h3 className="report-h2"><span className="num">04</span>no_token</h3>
          <p className="report-p">
            Chain has no native gas / governance token yet. Common for younger L2s that have
            signalled an airdrop is coming but haven't TGE'd (Base, MegaETH, Ink, Unichain, Abstract, etc.).
          </p>

          <h3 className="report-h2"><span className="num">05</span>private_only</h3>
          <p className="report-p">
            Token exists but was distributed only through private / strategic rounds, no
            public sale, no broad airdrop. ADI Chain itself falls here — distribution is
            allocated rather than public-priced.
          </p>

          <h2 className="report-h1" style={{ marginTop: 28 }}>Two ADI views (Mcap / TVL)</h2>
          <p className="report-p">
            We report two Mcap/TVL ratios for ADI to be transparent about the data gap:
          </p>
          <ul className="report-list">
            <li><b>DefiLlama-visible view</b> — uses ${adi.tvl_defillama_visible.toLocaleString()} TVL (Uniswap V3 LPs on Ethereum only). Mcap/TVL = <b>{adi.mcaptvl?.toFixed(0)}×</b>. Looks like an outlier alongside IOTA EVM.</li>
            <li><b>On-chain view</b> — adds the verified DDSC supply for ${adi.tvl_with_ddsc.toLocaleString(undefined, { maximumFractionDigits: 0 })} TVL. Mcap/TVL = <b>{adi.mcaptvl_with_ddsc.toFixed(2)}×</b>. Above large-L2 median but in a defensible range.</li>
          </ul>
          <p className="report-p">
            Both numbers are correct — they answer different questions ("what does the
            generic aggregator see?" vs "what is actually on-chain?"). The gap is a
            data-layer problem (DefiLlama hasn't built an adapter for DDSC yet), not a
            disagreement about the underlying facts.
          </p>
        </article>

        {/* ─────────────────────────────────────────── Page 4: Refresh + limits */}
        <article className="report-page">
          <div className="report-meta">
            <span><span className="label">Page 4 of 4</span> · Refresh + limitations</span>
            <span>What we do not measure</span>
          </div>

          <h2 className="report-h1">Refresh cadence</h2>
          <p className="report-lede">
            All numbers update via one entry-point script that chains the fetchers and
            merges into <code className="inline">public/data.json</code>. Two trigger paths:
          </p>
          <ul className="report-list">
            <li><b>GitHub Action</b> (<code className="inline">.github/workflows/refresh-data.yml</code>) — manual trigger from the Actions tab. Runs all fetchers, commits the refreshed JSON, pushes to <code className="inline">main</code>. Vercel auto-redeploys on push. Full cycle ~5 minutes.</li>
            <li><b>Local dev</b> (<code className="inline">npm run dev</code>) — Vite middleware exposes <code className="inline">POST /api/refresh</code> which spawns the same Python pipeline. The dashboard's "↻ Refresh" button calls this.</li>
          </ul>
          <p className="report-p">
            Two API keys are required for the full refresh to run end-to-end:
            <code className="inline"> MORALIS_API_KEY</code> (free tier, 40K CU/day) for live holder data,
            and (optionally) <code className="inline">ALCHEMY_API_KEY</code> as fallback for the
            Alchemy walker. Without keys, the merge preserves the previously-committed
            holder values — the rest of the dashboard refreshes normally.
          </p>

          <h2 className="report-h1" style={{ marginTop: 28 }}>What we do not measure (caveats)</h2>
          <p className="report-lede">
            Where the numbers stop being trustworthy and what would be required to close each gap.
          </p>

          <h3 className="report-h2"><span className="num">01</span>Daily-active-wallets is a single-day snapshot</h3>
          <p className="report-p">
            Growthepie publishes a daily series; we display the latest value. A 7-day rolling
            average would smooth spikes (e.g. quest days, airdrop campaigns). We have not
            implemented that yet.
          </p>

          <h3 className="report-h2"><span className="num">02</span>Bridge / treasury contracts count as holders</h3>
          <p className="report-p">
            By design, but worth knowing. Linea's 99% top-10 is 97.6% in the canonical TokenBridge
            proxy — that's unbridged supply, not concentrated whales. The tooltip surfaces the
            top-holder label, but the chart bar still reads "99%."
          </p>

          <h3 className="report-h2"><span className="num">03</span>Three chains keep manually-seeded holder values</h3>
          <p className="report-p">
            Scroll, Blast, BOB — Moralis does not index those chains. We use the figure from
            each chain's public Etherscan / Blockscout "Token Holders" page, refreshed by hand
            quarterly. The row's <code className="inline">top10_pct_source</code> field shows whether the value is live or seeded.
          </p>

          <h3 className="report-h2"><span className="num">04</span>We do not re-verify DefiLlama's TVL per protocol</h3>
          <p className="report-p">
            DefiLlama's protocol-level adapter outputs are taken as ground truth. We do not
            independently sum bridge balances, lending-pool deposits, or LP TVL per chain.
            The ADI exception is the only place we go to the underlying RPC directly (to verify DDSC).
          </p>

          <h3 className="report-h2"><span className="num">05</span>Distribution-model tags are our manual judgment</h3>
          <p className="report-p">
            No API publishes "this token was a fair launch" as a structured field — that's our
            classification from each token's public history. Tags should be reviewed before
            being cited externally. Page 3 lists the per-tag definitions.
          </p>

          <h3 className="report-h2"><span className="num">06</span>Activity columns are missing for 26 long-tail chains</h3>
          <p className="report-p">
            Growthepie only tracks 31 L2s. The 26 chains in our table without DAA / tx /
            fees data (Cyber, Swellchain, Polynomial, Pepu, Moonchain, Matchain, Mind Network,
            Moonchain, Kroma, etc.) show "–" — they're listed because DefiLlama indexes
            their TVL, but Growthepie doesn't publish daily metrics for them.
          </p>

          <div className="report-callout">
            <strong>Repro instructions:</strong> Clone <code className="inline">github.com/surgencelab/adil2benchmark</code>, copy <code className="inline">.env.example</code> to <code className="inline">.env</code> with your Moralis key, run <code className="inline">python3 scripts/refresh_all.py</code>. The new <code className="inline">public/data.json</code> drives the dashboard. Any number you see should be reproducible this way.
          </div>

          <p className="report-footer">
            ADI L2 Benchmark · Surgence Labs / ADI Foundation · data as-of {data.asOf}
          </p>
        </article>
      </div>
    </>
  );
}
