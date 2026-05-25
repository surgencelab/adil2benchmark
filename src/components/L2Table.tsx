/**
 * Sortable / filterable L2 universe table.
 * Click any row to open the detail pane.
 */
import type { L2Row, AdiRow, DistributionModel } from '../data/types';
import { fmtUSD, fmtX, fmtPct, fmtNum } from '../lib/format';

const DIST_LABEL: Record<DistributionModel, string> = {
  airdrop: 'AIRDROP',
  no_token: 'NO TOKEN',
  token_swap: 'TOKEN SWAP',
  fair_launch: 'FAIR LAUNCH',
  private_only: 'PRIVATE',
};
const DIST_COLOR: Record<DistributionModel, string> = {
  airdrop: 'var(--accent-green)',
  no_token: 'var(--text-muted)',
  token_swap: 'var(--accent-blue)',
  fair_launch: 'var(--accent-cyan)',
  private_only: 'var(--accent-red)',
};

function DistChip({ kind }: { kind: DistributionModel | undefined }) {
  if (!kind) return null;
  return (
    <span
      style={{
        display: 'inline-block', padding: '1px 6px', fontSize: 9,
        fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.08em',
        border: `1px solid ${DIST_COLOR[kind]}`, borderRadius: 2,
        color: DIST_COLOR[kind], background: 'transparent',
      }}
    >
      {DIST_LABEL[kind]}
    </span>
  );
}

interface Props {
  rows: L2Row[];
  adi: AdiRow;
  openDetail: (r: L2Row) => void;
}

export function L2Table({ rows, adi, openDetail }: Props) {
  const grouped: Record<string, L2Row[]> = { Large: [], Mid: [], Small: [], Micro: [] };
  rows.forEach((r) => (grouped[r.tier] || grouped.Micro).push(r));

  const renderRow = (r: L2Row, isAdi = false) => {
    const tvl = isAdi ? (r as unknown as AdiRow).tvl_with_ddsc : r.tvl;
    const mcap = isAdi ? r.token_mcap : r.chain_mcap || r.token_mcap;
    const fdv = r.fdv_usd;
    const dex = r.dex_v24;
    const mcaptvl = isAdi
      ? (r as unknown as AdiRow).mcaptvl_with_ddsc
      : mcap != null && tvl > 0 ? mcap / tvl : null;
    const fdvtvl = fdv != null && tvl > 0 ? fdv / tvl : null;
    const voltvl = dex != null && tvl > 0 ? (dex / tvl) * 100 : null;
    return (
      <tr
        key={r.name + (isAdi ? '-adi' : '')}
        className={isAdi ? 'row-adi' : ''}
        onClick={() => openDetail(isAdi ? ({ ...adi, name: 'ADI Chain', symbol: 'ADI' } as L2Row) : r)}
        style={{ cursor: 'pointer' }}
      >
        <td>{r.name}</td>
        <td className="muted">{r.symbol || '-'}</td>
        <td title={r.distribution_note || ''}><DistChip kind={r.distribution_model} /></td>
        <td className="right">{fmtUSD(tvl)}</td>
        <td className="right">{fmtUSD(mcap)}</td>
        <td className="right">{fmtUSD(fdv)}</td>
        <td className="right">{mcaptvl == null ? '-' : <span className={mcaptvl > 50 ? 'danger' : ''}>{fmtX(mcaptvl)}</span>}</td>
        <td className="right">{fdvtvl == null ? '-' : <span className={fdvtvl > 100 ? 'danger' : ''}>{fmtX(fdvtvl)}</span>}</td>
        <td className="right">{fmtNum(r.tx_per_day)}</td>
        <td className="right" title={(() => {
          const single = r.active_wallets_per_day;
          const hist = r.daa_history;
          if (!hist || hist.length === 0) return single ? `Growthepie latest single-day: ${Math.round(single).toLocaleString()}` : 'Not tracked by Growthepie';
          const last7 = hist.slice(-7).filter((v): v is number => v != null);
          if (!last7.length) return single ? `single-day: ${Math.round(single).toLocaleString()}` : '';
          const avg = last7.reduce((s, v) => s + v, 0) / last7.length;
          return `7d avg (Growthepie): ${Math.round(avg).toLocaleString()} · latest single-day: ${single ? Math.round(single).toLocaleString() : '-'}`;
        })()}>
          {(() => {
            const hist = r.daa_history;
            const last7 = hist ? hist.slice(-7).filter((v): v is number => v != null) : [];
            if (last7.length >= 3) {
              const avg = last7.reduce((s, v) => s + v, 0) / last7.length;
              return fmtNum(avg);
            }
            return fmtNum(r.active_wallets_per_day);
          })()}
        </td>
        <td className="right">{fmtUSD(dex, 2)}</td>
        <td className="right">{voltvl == null ? '-' : <span className={voltvl === 0 ? 'danger' : ''}>{fmtPct(voltvl)}</span>}</td>
        <td className="right" title={r.top10_pct_note || ''}>
          {r.top10_pct == null ? '-' : (
            <span className={r.top10_pct > 90 ? 'danger' : r.top10_pct > 70 ? 'warn' : ''}
                  style={r.top10_pct > 90 ? { color: 'var(--accent-red)', fontWeight: 700 } :
                         r.top10_pct > 70 ? { color: 'var(--accent-yellow)', fontWeight: 600 } : {}}>
              {r.top10_pct.toFixed(0)}%
            </span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div style={{ maxHeight: 620, overflow: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Chain</th>
            <th>Token</th>
            <th>Distribution</th>
            <th className="right">TVL</th>
            <th className="right">Mcap</th>
            <th className="right">FDV</th>
            <th className="right">Mcap / TVL</th>
            <th className="right">FDV / TVL</th>
            <th className="right">Tx / day</th>
            <th className="right" title="Daily active wallets · 7-day rolling average from Growthepie (smooths quest-day / airdrop spikes). Falls back to latest single-day where 7-day history is unavailable. '-' = chain not tracked by Growthepie. Hover any cell for exact 7d avg and latest single-day side by side.">Active wallets · 7d</th>
            <th className="right">24h DEX</th>
            <th className="right">Vol / TVL</th>
            <th className="right" title="Concentration: % of supply held by the top 10 wallets. Higher = more centralised (red >90%, yellow >70%). 14/17 L2 tokens live from Moralis erc20/owners (indexed view, one call per token, pre-computed % of supply). Scroll, Blast, BOB keep manually-seeded values from Etherscan's public Token Holders page since Moralis does not index those chains. Bridge / treasury contracts count as holders, Linea 99% and Metis 84% reflect unbridged supply locked in the chain's bridge, not whale concentration. Hover any cell for per-row source + top-holder label.">Top 10 %</th>
          </tr>
        </thead>
        <tbody>
          <tr className="row-section"><td colSpan={13}>// ADI Chain · audit subject</td></tr>
          {renderRow(adi as unknown as L2Row, true)}
          {(['Large', 'Mid', 'Small', 'Micro'] as const).flatMap((tier) =>
            grouped[tier].length > 0
              ? [
                  <tr key={`hdr-${tier}`} className="row-section">
                    <td colSpan={13}>// {tier} L2s · {grouped[tier].length} chains</td>
                  </tr>,
                  ...grouped[tier].map((r) => renderRow(r)),
                ]
              : []
          )}
        </tbody>
      </table>
    </div>
  );
}
