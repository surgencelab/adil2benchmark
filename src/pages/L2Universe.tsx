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
  { id: 'large',        label: 'Large tier (top 5)',       match: (r) => r.tier === 'Large' },
  { id: 'mid',          label: 'Mid tier (6-15)',          match: (r) => r.tier === 'Mid' },
  { id: 'small',        label: 'Small tier (16-30)',       match: (r) => r.tier === 'Small' },
  { id: 'has_fdv',      label: 'With FDV data',            match: (r) => !!r.fdv_usd },
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
