/**
 * RWA page: ADI Chain vs the 6-chain RWA-native cohort.
 * Same column shape as L2 Universe but driven by data.rwa_rows and with
 * cohort medians computed from rwa_rows alone (not the L2 set).
 */
import type { Dataset, RwaRow } from '../data/types';
import { fmtUSD, fmtX, fmtNum } from '../lib/format';

interface Props { data: Dataset; }

function median(values: number[]): number | null {
  const v = values.filter((x) => x != null && isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 === 0 ? (v[m - 1] + v[m]) / 2 : v[m];
}

export function RwaPage({ data }: Props) {
  const adi = data.adi;
  const rows = data.rwa_rows || [];

  // Build the ADI row in the same shape as the RWA rows for display alongside.
  const adiAsRwa: RwaRow & { isAdi?: boolean } = {
    name: 'ADI Chain',
    symbol: 'ADI',
    category: 'rwa',
    distribution_note: 'CBUAE-licensed RWAfi L1, DDSC stablecoin (AED-pegged)',
    tvl: adi.tvl_with_ddsc,
    token_mcap: adi.token_mcap,
    fdv_usd: adi.fdv_usd,
    price_usd: adi.token_price,
    total_volume_usd: adi.total_volume_usd,
    max_supply: adi.max_supply,
    circulating_supply: adi.circulating_supply,
    total_supply: adi.total_supply_cg,
    mcaptvl: adi.mcaptvl_with_ddsc,
    fdv_tvl: adi.fdv_usd && adi.tvl_with_ddsc ? adi.fdv_usd / adi.tvl_with_ddsc : null,
  };

  // Cohort medians across RWA peers (excluding ADI to avoid self-reference)
  const medTVL    = median(rows.map((r) => r.tvl as number));
  const medMcap   = median(rows.map((r) => r.token_mcap as number));
  const medFDV    = median(rows.map((r) => r.fdv_usd as number));
  const medMT     = median(rows.map((r) => r.mcaptvl as number));
  const medFDVT   = median(rows.map((r) => r.fdv_tvl as number));

  return (
    <>
      <div className="page-header">
        <div className="page-eyebrow">RWA</div>
        <h1 className="page-title">ADI vs RWA-Native Chains</h1>
      </div>

      <div className="widget w-12">
        <div className="widget-head">
          <span className="widget-title">RWA cohort</span>
          <span className="widget-meta">DefiLlama + CoinGecko · n={rows.length} peers</span>
        </div>
        <div className="widget-body flush">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Chain</th>
                  <th>Symbol</th>
                  <th>Type</th>
                  <th className="right">TVL</th>
                  <th className="right">Mcap</th>
                  <th className="right">FDV</th>
                  <th className="right">Mcap / TVL</th>
                  <th className="right">FDV / TVL</th>
                  <th className="right">Circ supply</th>
                  <th className="right">24h vol</th>
                </tr>
              </thead>
              <tbody>
                <tr className="row-section"><td colSpan={10}>// ADI Chain · subject</td></tr>
                <tr className="row-adi" style={{ cursor: 'default' }}>
                  <td><b>{adiAsRwa.name}</b></td>
                  <td className="muted">{adiAsRwa.symbol}</td>
                  <td className="muted" title={adiAsRwa.distribution_note}>RWAfi L1</td>
                  <td className="right">{fmtUSD(adiAsRwa.tvl)}</td>
                  <td className="right">{fmtUSD(adiAsRwa.token_mcap)}</td>
                  <td className="right">{fmtUSD(adiAsRwa.fdv_usd)}</td>
                  <td className="right">{adiAsRwa.mcaptvl == null ? '-' : <span className={(adiAsRwa.mcaptvl as number) > 50 ? 'danger' : ''}>{fmtX(adiAsRwa.mcaptvl)}</span>}</td>
                  <td className="right">{adiAsRwa.fdv_tvl == null ? '-' : <span className={(adiAsRwa.fdv_tvl as number) > 100 ? 'danger' : ''}>{fmtX(adiAsRwa.fdv_tvl)}</span>}</td>
                  <td className="right">{fmtNum(adiAsRwa.circulating_supply)}</td>
                  <td className="right">{fmtUSD(adiAsRwa.total_volume_usd, 2)}</td>
                </tr>
                <tr className="row-section"><td colSpan={10}>// RWA peers (DefiLlama TVL desc)</td></tr>
                {rows.map((r) => (
                  <tr key={r.name} style={{ cursor: 'default' }}>
                    <td>{r.name}</td>
                    <td className="muted">{r.symbol || '-'}</td>
                    <td className="muted" title={r.distribution_note || ''}>{r.distribution_note?.split(' (')[0] || 'RWA chain'}</td>
                    <td className="right">{fmtUSD(r.tvl)}</td>
                    <td className="right">{fmtUSD(r.token_mcap)}</td>
                    <td className="right">{fmtUSD(r.fdv_usd)}</td>
                    <td className="right">{r.mcaptvl == null ? '-' : <span className={(r.mcaptvl as number) > 50 ? 'danger' : ''}>{fmtX(r.mcaptvl)}</span>}</td>
                    <td className="right">{r.fdv_tvl == null ? '-' : <span className={(r.fdv_tvl as number) > 100 ? 'danger' : ''}>{fmtX(r.fdv_tvl)}</span>}</td>
                    <td className="right">{fmtNum(r.circulating_supply)}</td>
                    <td className="right">{fmtUSD(r.total_volume_usd, 2)}</td>
                  </tr>
                ))}
                <tr className="row-section"><td colSpan={10}>// Cohort median (RWA peers, excl. ADI)</td></tr>
                <tr style={{ background: 'var(--tint-soft)', fontWeight: 600 }}>
                  <td>Median</td>
                  <td className="muted">-</td>
                  <td className="muted">n={rows.length}</td>
                  <td className="right">{fmtUSD(medTVL)}</td>
                  <td className="right">{fmtUSD(medMcap)}</td>
                  <td className="right">{fmtUSD(medFDV)}</td>
                  <td className="right">{medMT == null ? '-' : fmtX(medMT)}</td>
                  <td className="right">{medFDVT == null ? '-' : fmtX(medFDVT)}</td>
                  <td className="right">-</td>
                  <td className="right">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </>
  );
}
