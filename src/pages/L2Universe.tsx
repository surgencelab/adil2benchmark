/**
 * L2 Universe page: cohort summary strip + filter chips + full data table.
 * New: 'Missing CoinGecko data' filter + explainer.
 */
import type { Dataset, L2Row } from '../data/types';
import { fmtUSD, fmtX } from '../lib/format';
import { L2Table } from '../components/L2Table';

interface Filter {
  id: string;
  label: string;
  match: (r: L2Row) => boolean;
}

const FILTERS: Filter[] = [
  { id: 'all',          label: 'All L2s',                  match: () => true },
  { id: 'airdrop',      label: 'Airdrop',                  match: (r) => !!r.airdrop_distributed },
  { id: 'non-airdrop',  label: 'Non-airdrop (have token)', match: (r) => !!r.has_token && !r.airdrop_distributed },
  { id: 'no_token',     label: 'No token',                 match: (r) => !r.has_token },
  { id: 'fair_launch',  label: 'Fair launch',              match: (r) => r.distribution_model === 'fair_launch' },
  { id: 'token_swap',   label: 'Token swap',               match: (r) => r.distribution_model === 'token_swap' },
  { id: 'large',        label: 'Large tier (top 5)',       match: (r) => r.tier === 'Large' },
  { id: 'mid',          label: 'Mid tier (6-15)',          match: (r) => r.tier === 'Mid' },
  { id: 'small',        label: 'Small tier (16-30)',       match: (r) => r.tier === 'Small' },
  { id: 'has_fdv',      label: 'With FDV data',            match: (r) => !!r.fdv_usd },
  { id: 'missing_cg',   label: 'Missing CoinGecko data',   match: (r) => !!r.has_token && !r.fdv_usd },
  { id: 'on_growthepie',label: 'On Growthepie',            match: (r) => !!r.tx_per_day },
];

interface Props {
  data: Dataset;
  filterId: string;
  setFilterId: (id: string) => void;
  openDetail: (r: L2Row) => void;
}

export function L2UniversePage({ data, filterId, setFilterId, openDetail }: Props) {
  const filt = FILTERS.find((f) => f.id === filterId) ?? FILTERS[0];
  const filteredRows = data.rows.filter(filt.match);
  const C = data.cohorts;
  const adi = data.adi;
  const adiMT = adi.mcaptvl_with_ddsc;

  return (
    <>
      <div className="page-header" style={{ marginBottom: 10 }}>
        <div className="page-eyebrow">L2 Universe</div>
        <h1 className="page-title" style={{ fontSize: 22 }}>
          {filteredRows.length} chains
          <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 10, fontWeight: 400 }}>
            ({filt.label})
          </span>
        </h1>
      </div>

      <div className="section" style={{ marginBottom: 10 }}>
        <div className="meta-strip">
          <span className="kv"><span className="k">Airdrop ({C.Airdrop?.n})</span><span className="v">M/T med {fmtX(C.Airdrop?.mcap_tvl_med, 2)} · FDV med {fmtUSD(C.Airdrop?.fdv_med)}</span></span>
          <span className="kv" style={{ borderColor: 'var(--accent-red)' }}>
            <span className="k">Non-airdrop ({C.NonAirdrop?.n})</span>
            <span className="v" style={{ color: 'var(--accent-red)' }}>M/T med {fmtX(C.NonAirdrop?.mcap_tvl_med, 2)} · FDV med {fmtUSD(C.NonAirdrop?.fdv_med)}</span>
          </span>
          <span className="kv"><span className="k">No-token ({C.NoToken?.n})</span><span className="v">TVL med {fmtUSD(C.NoToken?.tvl_med)}</span></span>
          <span className="kv"><span className="k">ADI</span><span className="v" style={{ color: 'var(--accent-red)' }}>M/T {fmtX(adiMT, 2)} · {(adiMT / (C.NonAirdrop?.mcap_tvl_med || 1)).toFixed(1)}× non-airdrop median</span></span>
        </div>
      </div>

      <div className="section" style={{ marginBottom: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => {
          const count = data.rows.filter(f.match).length;
          return (
            <button
              key={f.id}
              onClick={() => setFilterId(f.id)}
              className={`time-pill ${filterId === f.id ? 'active' : ''}`}
              style={{ cursor: 'pointer' }}
            >
              {f.label} <span style={{ opacity: 0.6, marginLeft: 4 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {filterId === 'missing_cg' && (
        <div
          className="section"
          style={{
            marginBottom: 10, padding: '10px 14px',
            background: 'rgba(217,119,6,0.06)',
            border: '1px solid rgba(217,119,6,0.30)',
            borderRadius: 4, fontSize: 12.5, lineHeight: 1.5,
            color: 'var(--foreground)',
          }}
        >
          <strong style={{ color: 'var(--accent-yellow)' }}>Why is CoinGecko data missing?</strong>
          {' '}For these chains, one of three things is true:
          {' '}<b>(1)</b> the token doesn't exist publicly yet (Soneium, Ink, Abstract, Unichain, MegaETH, Plasma);
          {' '}<b>(2)</b> the token exists but CoinGecko has no market data because trading volume is too thin (Fraxtal, Taiko);
          {' '}<b>(3)</b> our slug was wrong (now corrected for Movement).
          {' '}The dashboard reports `-` honestly rather than fabricating numbers. To populate a row, the project needs to (a) list on a venue CoinGecko indexes, and (b) the slug must match CoinGecko's internal ID.
        </div>
      )}

      <div className="section"
           title="One row per L2/rollup. ADI pinned at top. Columns: name, token, distribution model, TVL, Mcap, FDV, Mcap/TVL, FDV/TVL, daily tx, active wallets, 24h DEX volume, Vol/TVL. Click any row for the full detail pane with a 30-day chart.">
        <div className="widget" style={{ position: 'relative' }}>
          <div className="widget-head">
            <span className="widget-title">L2 universe</span>
            <span className="widget-meta">{filteredRows.length} chains · click any row for detail</span>
          </div>
          <div className="widget-body flush">
            <L2Table rows={filteredRows} adi={adi} openDetail={openDetail} />
          </div>
        </div>
      </div>
    </>
  );
}
