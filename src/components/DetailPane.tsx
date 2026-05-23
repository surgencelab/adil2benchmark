/**
 * Right-side detail pane that slides in when a chain is clicked.
 * Includes the multi-metric ChainChart.
 */
import { useState } from 'react';
import type { L2Row } from '../data/types';
import { fmtUSD, fmtX, fmtNum } from '../lib/format';

interface ChainChartProps {
  chain: L2Row & { fdv_usd?: number | null };
}

function ChainChart({ chain: r }: ChainChartProps) {
  type MetricOpt = {
    id: string;
    label: string;
    data: number[] | null | undefined;
    fmt: (v: number) => string;
  };
  const metrics: MetricOpt[] = [
    { id: 'price',   label: 'Price',           data: r.sparkline_30d,    fmt: (v) => `$${v < 1 ? v.toFixed(4) : v.toFixed(2)}` },
    { id: 'tx',      label: 'Tx / day',        data: r.tx_history,       fmt: (v) => Math.round(v).toLocaleString() },
    { id: 'daa',     label: 'Active wallets',  data: r.daa_history,      fmt: (v) => Math.round(v).toLocaleString() },
    { id: 'stables', label: 'Stables on chain', data: r.stables_history, fmt: (v) => fmtUSD(v) },
    { id: 'fees',    label: 'Fees paid (USD)', data: r.fees_history,     fmt: (v) => fmtUSD(v, 2) },
  ];
  const available = metrics.filter((m): m is MetricOpt & { data: number[] } =>
    Array.isArray(m.data) && m.data.length > 1);
  const [activeId, setActiveId] = useState<string>(available[0]?.id ?? '');
  const [hover, setHover] = useState<{ i: number; v: number } | null>(null);

  if (available.length === 0) {
    return (
      <div style={{ padding: 12, fontSize: 11.5, color: 'var(--text-muted)' }}>
        No time-series available for this chain.
        {r.name === 'ADI Chain' && (
          <div style={{ marginTop: 4 }}>ADI Chain not yet on Growthepie · submit at growthepie.xyz</div>
        )}
      </div>
    );
  }

  const m = available.find((x) => x.id === activeId) ?? available[0];
  const data = m.data;
  const W = 420, H = 140;
  const P = { l: 50, r: 8, t: 10, b: 22 };
  const inner = { w: W - P.l - P.r, h: H - P.t - P.b };
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const sx = (i: number) => P.l + (i / (data.length - 1)) * inner.w;
  const sy = (v: number) => P.t + inner.h - ((v - min) / range) * (inner.h - 2) - 1;
  const trend = data[data.length - 1] - data[0];
  const trendPct = data[0] ? (trend / data[0]) * 100 : 0;
  const stroke = trend >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  const fill = trend >= 0 ? 'rgba(46,204,113,0.14)' : 'rgba(255,90,95,0.14)';
  const pts = data.map((v, i) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(' ');
  const areaPts = `${sx(0).toFixed(1)},${(P.t + inner.h).toFixed(1)} ${pts} ${sx(data.length - 1).toFixed(1)},${(P.t + inner.h).toFixed(1)}`;
  const ts = r.history_timestamps;
  const tsAt = (i: number) =>
    ts && ts[i] ? new Date(ts[i] * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : `d-${data.length - 1 - i}`;
  const ticks = [0, Math.floor(data.length * 0.5), data.length - 1];

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    if (x < P.l || x > P.l + inner.w) return setHover(null);
    const i = Math.round(((x - P.l) / inner.w) * (data.length - 1));
    setHover({ i, v: data[i] });
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
        {available.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setActiveId(opt.id)}
            className={`time-pill ${activeId === opt.id ? 'active' : ''}`}
            style={{ padding: '3px 8px', fontSize: 9.5 }}
          >{opt.label}</button>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block', width: '100%', height: 'auto', cursor: 'crosshair' }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`g-${r.name}-${m.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.30" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((p) => {
          const y = P.t + p * inner.h;
          return <line key={p} x1={P.l} y1={y} x2={P.l + inner.w} y2={y} stroke="var(--tint-soft)" />;
        })}
        <text x={P.l - 6} y={P.t + 4} textAnchor="end" fontSize="9" fill="var(--text-muted)" fontFamily="var(--font-mono)">{m.fmt(max)}</text>
        <text x={P.l - 6} y={P.t + inner.h + 3} textAnchor="end" fontSize="9" fill="var(--text-muted)" fontFamily="var(--font-mono)">{m.fmt(min)}</text>
        {ticks.map((i) => (
          <text key={i} x={sx(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--text-muted)" fontFamily="var(--font-mono)">{tsAt(i)}</text>
        ))}
        <polygon points={areaPts} fill={`url(#g-${r.name}-${m.id})`} stroke="none" />
        <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        {hover && (
          <g>
            <line x1={sx(hover.i)} y1={P.t} x2={sx(hover.i)} y2={P.t + inner.h} stroke="var(--text-muted)" strokeDasharray="2 2" />
            <circle cx={sx(hover.i)} cy={sy(hover.v)} r="3" fill={stroke} stroke="var(--card)" strokeWidth="1.5" />
            <rect x={sx(hover.i) + 6} y={sy(hover.v) - 18} width="100" height="32" rx="2" fill="var(--card)" stroke="var(--border-bright)" />
            <text x={sx(hover.i) + 12} y={sy(hover.v) - 5} fontSize="10" fill="var(--text-muted)" fontFamily="var(--font-mono)">{tsAt(hover.i)}</text>
            <text x={sx(hover.i) + 12} y={sy(hover.v) + 8} fontSize="11" fill="var(--foreground)" fontFamily="var(--font-mono)" fontWeight="700">{m.fmt(hover.v)}</text>
          </g>
        )}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
        <span>{data.length}d window</span>
        <span>
          Current <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>{m.fmt(data[data.length - 1])}</span>
          {' · '}
          <span style={{ color: stroke, fontWeight: 600 }}>{trendPct >= 0 ? '+' : ''}{trendPct.toFixed(1)}%</span>
        </span>
      </div>
    </div>
  );
}

interface DetailPaneProps {
  chain: L2Row | (L2Row & Record<string, unknown>) | null;
  onClose: () => void;
}

export function DetailPane({ chain, onClose }: DetailPaneProps) {
  if (!chain) return null;
  const r = chain as L2Row & Record<string, unknown>;
  const mt = r.chain_mcap && r.tvl ? r.chain_mcap / r.tvl : null;
  const fdvtvl = r.fdv_usd && r.tvl ? r.fdv_usd / r.tvl : null;
  const isAdi = r.name === 'ADI Chain';

  return (
    <>
      <div className="detail-overlay" onClick={onClose} />
      <div className="detail-pane">
        <div className="detail-head">
          <div>
            <h3>
              {r.name}
              {isAdi && <span style={{ color: 'var(--accent-red)', marginLeft: 8, fontSize: 11 }}>AUDIT SUBJECT</span>}
            </h3>
            <div className="sub">{r.symbol || 'no token'} · {r.distribution_model || '-'} · {r.tier || 'tier-tbd'}</div>
          </div>
          <button className="detail-close" onClick={onClose}>×</button>
        </div>
        <div className="detail-body">
          <div className="detail-section-label">Core metrics</div>
          <div className="detail-row"><span className="k">TVL</span><span className="v">{fmtUSD(isAdi ? (r as any).tvl_with_ddsc : r.tvl)}</span></div>
          <div className="detail-row"><span className="k">Token Mcap</span><span className="v">{fmtUSD(r.chain_mcap || r.token_mcap)}</span></div>
          <div className="detail-row"><span className="k">FDV</span><span className="v">{fmtUSD(r.fdv_usd)}</span></div>
          <div className="detail-row"><span className="k">Max supply</span><span className="v">{r.max_supply ? Number(r.max_supply).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '-'}</span></div>
          <div className="detail-row"><span className="k">Circulating</span><span className="v">{fmtNum(r.circulating_supply)}</span></div>
          <div className="detail-row"><span className="k">Mcap / TVL</span>
            <span className={`v ${
              (isAdi ? (r as any).mcaptvl_with_ddsc : mt) > 50 ? 'down' :
              (isAdi ? (r as any).mcaptvl_with_ddsc : mt) > 10 ? 'warn' : ''
            }`}>
              {fmtX(isAdi ? (r as any).mcaptvl_with_ddsc : mt, 2)}
            </span>
          </div>
          <div className="detail-row"><span className="k">FDV / TVL</span>
            <span className={`v ${(fdvtvl || 0) > 50 ? 'down' : (fdvtvl || 0) > 10 ? 'warn' : ''}`}>
              {fmtX(isAdi
                ? ((r as any).fdv_usd && (r as any).tvl_with_ddsc ? (r as any).fdv_usd / (r as any).tvl_with_ddsc : null)
                : fdvtvl, 2)}
            </span>
          </div>

          <div className="detail-section-label">Activity</div>
          <div className="detail-row"><span className="k">Tx / day</span><span className="v">{fmtNum(r.tx_per_day)}</span></div>
          <div className="detail-row"><span className="k">Active wallets / day</span><span className="v">{fmtNum(r.active_wallets_per_day)}</span></div>
          <div className="detail-row"><span className="k">24h DEX volume</span><span className="v">{fmtUSD(r.dex_v24, 2)}</span></div>
          <div className="detail-row"><span className="k">24h total volume</span><span className="v">{fmtUSD(r.total_volume_usd, 2)}</span></div>
          <div className="detail-row"><span className="k">Stables on chain</span><span className="v">{fmtUSD(r.stables_mcap_chain)}</span></div>
          <div className="detail-row"><span className="k">Protocols</span><span className="v">{r.protocols ?? '-'}</span></div>

          <div className="detail-section-label">Momentum</div>
          <div className="detail-row"><span className="k">TVL 7d</span><span className={`v ${(r.tvl_chg_7d || 0) > 0 ? 'up' : (r.tvl_chg_7d || 0) < 0 ? 'down' : ''}`}>{r.tvl_chg_7d != null ? `${r.tvl_chg_7d > 0 ? '+' : ''}${r.tvl_chg_7d.toFixed(2)}%` : '-'}</span></div>
          <div className="detail-row"><span className="k">TVL 30d</span><span className={`v ${(r.tvl_chg_30d || 0) > 0 ? 'up' : (r.tvl_chg_30d || 0) < 0 ? 'down' : ''}`}>{r.tvl_chg_30d != null ? `${r.tvl_chg_30d > 0 ? '+' : ''}${r.tvl_chg_30d.toFixed(2)}%` : '-'}</span></div>
          <div className="detail-row"><span className="k">Price 7d</span><span className={`v ${(r.price_chg_7d || 0) > 0 ? 'up' : (r.price_chg_7d || 0) < 0 ? 'down' : ''}`}>{r.price_chg_7d != null ? `${r.price_chg_7d > 0 ? '+' : ''}${r.price_chg_7d.toFixed(2)}%` : '-'}</span></div>
          <div className="detail-row"><span className="k">Price 30d</span><span className={`v ${(r.price_chg_30d || 0) > 0 ? 'up' : (r.price_chg_30d || 0) < 0 ? 'down' : ''}`}>{r.price_chg_30d != null ? `${r.price_chg_30d > 0 ? '+' : ''}${r.price_chg_30d.toFixed(2)}%` : '-'}</span></div>

          <div className="detail-section-label">30d chart</div>
          <ChainChart chain={r as L2Row} />

          <div className="detail-section-label">Distribution</div>
          <div className="detail-row"><span className="k">Model</span><span className="v">{r.distribution_model || '-'}</span></div>
          <div className="detail-row"><span className="k">Airdrop %</span><span className="v">{r.airdrop_pct_of_supply ? `${r.airdrop_pct_of_supply}%` : '-'}</span></div>
          <div className="detail-row"><span className="k">Has token</span><span className="v">{r.has_token === false ? 'no' : 'yes'}</span></div>

          {isAdi && (
            <>
              <div className="detail-section-label">ADI-specific</div>
              <div className="detail-row"><span className="k">DDSC supply (AED)</span><span className="v">{Number((r as any).ddsc_tvl_aed).toLocaleString()} AED</span></div>
              <div className="detail-row"><span className="k">DDSC supply (USD)</span><span className="v">{fmtUSD((r as any).ddsc_tvl_usd)}</span></div>
              <div className="detail-row"><span className="k">DDSC reserve bank</span><span className="v">{(r as any).ddsc_reserve_bank}</span></div>
              <div className="detail-row"><span className="k">DDSC contract</span><span className="v" style={{ fontSize: 10 }}>{(r as any).ddsc_contract?.slice(0,10)}…{(r as any).ddsc_contract?.slice(-4)}</span></div>
              <div className="detail-row"><span className="k">Top 10 hold</span><span className="v down">{(r as any).top10_concentration_pct}%</span></div>
              <div className="detail-row"><span className="k">Gini</span><span className="v down">{(r as any).gini}</span></div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
