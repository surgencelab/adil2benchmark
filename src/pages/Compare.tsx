/**
 * Compare page: ADI Chain vs Canton, table format, mirrors L2 Universe shape.
 * Two rows, same columns as L2 Universe so reviewers can scan the difference
 * by column. Cells with no data show '-'.
 */
import type { Dataset } from '../data/types';
import { fmtUSD, fmtX, fmtNum, fmtPct } from '../lib/format';

interface Props { data: Dataset; }

export function ComparePage({ data }: Props) {
  const adi = data.adi;
  const canton = data.canton;

  const adiFDVTVL = adi.fdv_usd && adi.tvl_with_ddsc ? adi.fdv_usd / adi.tvl_with_ddsc : null;
  const cantonFDVTVL = canton?.fdv_tvl ?? null;
  const adiVolTVL   = adi.tvl_with_ddsc && adi.total_24h_vol_all_venues
    ? (adi.total_24h_vol_all_venues / adi.tvl_with_ddsc) * 100 : null;

  return (
    <>
      <div className="page-header">
        <div className="page-eyebrow">Compare</div>
        <h1 className="page-title">ADI Chain vs Canton</h1>
      </div>

      <div className="widget w-12">
        <div className="widget-head">
          <span className="widget-title">Head-to-head</span>
          <span className="widget-meta">DefiLlama + CoinGecko · {data.asOf}</span>
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
                  <th className="right">Max supply</th>
                  <th className="right">24h vol</th>
                  <th className="right">Vol / TVL</th>
                  <th className="right">Top 10 %</th>
                </tr>
              </thead>
              <tbody>
                <tr className="row-adi" style={{ cursor: 'default' }}>
                  <td><b>ADI Chain</b></td>
                  <td className="muted">ADI</td>
                  <td className="muted">RWAfi L1</td>
                  <td className="right">{fmtUSD(adi.tvl_with_ddsc)}</td>
                  <td className="right">{fmtUSD(adi.token_mcap)}</td>
                  <td className="right">{fmtUSD(adi.fdv_usd)}</td>
                  <td className="right"><span className="danger">{fmtX(adi.mcaptvl_with_ddsc, 2)}</span></td>
                  <td className="right"><span className="danger">{adiFDVTVL == null ? '-' : fmtX(adiFDVTVL, 1)}</span></td>
                  <td className="right">{fmtNum(adi.circulating_supply)}</td>
                  <td className="right">{fmtNum(adi.max_supply)}</td>
                  <td className="right">{fmtUSD(adi.total_24h_vol_all_venues, 2)}</td>
                  <td className="right">{adiVolTVL == null ? '-' : fmtPct(adiVolTVL, 2)}</td>
                  <td className="right"><span className="danger" style={{ fontWeight: 700 }}>99.28%</span></td>
                </tr>
                <tr style={{ cursor: 'default' }}>
                  <td><b>{canton?.name || 'Canton'}</b></td>
                  <td className="muted">{canton?.symbol || 'CC'}</td>
                  <td className="muted">Permissioned L1</td>
                  <td className="right">{fmtUSD(canton?.tvl)}</td>
                  <td className="right">{fmtUSD(canton?.token_mcap)}</td>
                  <td className="right">{fmtUSD(canton?.fdv_usd)}</td>
                  <td className="right">{canton?.mcaptvl == null ? '-' : <span className="danger">{fmtX(canton.mcaptvl, 0)}</span>}</td>
                  <td className="right">{cantonFDVTVL == null ? '-' : <span className="danger">{fmtX(cantonFDVTVL, 0)}</span>}</td>
                  <td className="right">{fmtNum(canton?.circulating_supply)}</td>
                  <td className="right muted">{canton?.max_supply ? fmtNum(canton.max_supply) : '-'}</td>
                  <td className="right">{fmtUSD(canton?.total_volume_usd, 2)}</td>
                  <td className="right muted">-</td>
                  <td className="right muted">-</td>
                </tr>
                <tr className="row-section"><td colSpan={13}>// ratio: Canton / ADI</td></tr>
                <tr style={{ cursor: 'default', color: 'var(--text-muted)' }}>
                  <td>Δ ratio</td>
                  <td className="muted">-</td>
                  <td className="muted">-</td>
                  <td className="right">{canton?.tvl && adi.tvl_with_ddsc ? fmtX(canton.tvl / adi.tvl_with_ddsc, 3) : '-'}</td>
                  <td className="right">{canton?.token_mcap && adi.token_mcap ? fmtX(canton.token_mcap / adi.token_mcap, 1) : '-'}</td>
                  <td className="right">{canton?.fdv_usd && adi.fdv_usd ? fmtX(canton.fdv_usd / adi.fdv_usd, 1) : '-'}</td>
                  <td className="right">{canton?.mcaptvl && adi.mcaptvl_with_ddsc ? fmtX(canton.mcaptvl / adi.mcaptvl_with_ddsc, 0) : '-'}</td>
                  <td className="right">{cantonFDVTVL && adiFDVTVL ? fmtX(cantonFDVTVL / adiFDVTVL, 0) : '-'}</td>
                  <td className="right">{canton?.circulating_supply && adi.circulating_supply ? fmtX(canton.circulating_supply / adi.circulating_supply, 1) : '-'}</td>
                  <td className="right">-</td>
                  <td className="right">{canton?.total_volume_usd && adi.total_24h_vol_all_venues ? fmtX(canton.total_volume_usd / adi.total_24h_vol_all_venues, 1) : '-'}</td>
                  <td className="right">-</td>
                  <td className="right">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="widget w-12" style={{ marginTop: 14 }}>
        <div className="widget-head">
          <span className="widget-title">Structural anchors</span>
          <span className="widget-meta">qualitative · public materials</span>
        </div>
        <div className="widget-body flush">
          <table className="data-table">
            <thead>
              <tr>
                <th>Dimension</th>
                <th>ADI Chain</th>
                <th>{canton?.name || 'Canton'}</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="muted">Launch year</td><td>2024</td><td>{canton?.launch_year || 2024}</td></tr>
              <tr><td className="muted">Native stablecoin</td><td>DDSC (1 AED peg, FAB)</td><td>{canton?.native_stable || '-'}</td></tr>
              <tr><td className="muted">Banking partners</td><td>First Abu Dhabi Bank (FAB)</td><td>{canton?.banking_partners || '-'}</td></tr>
              <tr><td className="muted">Regulator anchor</td><td>CBUAE</td><td>{canton?.regulator || '-'}</td></tr>
              <tr><td className="muted">Permissioning</td><td>Permissionless EVM</td><td>{canton?.permissioning || '-'}</td></tr>
              <tr><td className="muted">Token model</td><td>Fixed 1B max supply, ~10% circulating</td><td>{canton?.token_model || '-'}</td></tr>
              <tr><td className="muted">On-chain proof</td><td>IHC $30M DDSC settlement, 3 tx</td><td>{canton?.institutional_use || '-'}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
