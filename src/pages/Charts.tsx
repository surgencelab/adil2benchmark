/**
 * Charts page: scatter + 90d trend + TVL leaderboard + heatmap.
 */
import type { Dataset, Metric, L2Row } from '../data/types';
import { fmtUSD, fmtX } from '../lib/format';
import { ScatterMcapVsTvl, McapTvlTrend } from '../components/Charts';

interface Props {
  data: Dataset;
  metric: Metric;
  setMetric: (m: Metric) => void;
  openDetail: (r: L2Row) => void;
}

export function ChartsPage({ data, metric, setMetric, openDetail }: Props) {
  const adi = data.adi;
  const yKey: 'fdv_usd' | 'chain_mcap' = metric === 'fdv' ? 'fdv_usd' : 'chain_mcap';
  const adiYval = metric === 'fdv' ? adi.fdv_usd ?? 0 : adi.token_mcap ?? 0;
  const adiMT = adiYval / adi.tvl_with_ddsc;
  const ratioLabel = metric === 'fdv' ? 'FDV/TVL' : 'Mcap/TVL';

  const heatChains = [
    ...data.rows
      .filter((r) => (r as any)[yKey] && r.tvl)
      .map((r) => ({ ...r, _mt: ((r as any)[yKey] as number) / r.tvl }))
      .sort((a, b) => ((b as any)[yKey] as number) - ((a as any)[yKey] as number))
      .slice(0, 18),
    {
      ...adi,
      name: 'ADI Chain', symbol: 'ADI', _mt: adiMT, _adi: true,
      chain_mcap: adi.token_mcap, fdv_usd: adi.fdv_usd, tvl: adi.tvl_with_ddsc,
    } as any,
  ];

  const tvlLeader = [...data.rows].filter((r) => r.tvl > 0).sort((a, b) => b.tvl - a.tvl).slice(0, 10);
  const maxTvl = Math.max(...tvlLeader.map((r) => r.tvl));

  const InlineMetric = () => (
    <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--border-bright)', borderRadius: 3, overflow: 'hidden' }}>
      <button onClick={() => setMetric('mcap')}
              style={{ padding: '3px 9px', fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                       background: metric === 'mcap' ? 'rgba(212,169,60,0.12)' : 'transparent',
                       color: metric === 'mcap' ? 'var(--accent-orange)' : 'var(--text-muted)',
                       border: 'none', cursor: 'pointer' }}>Mcap</button>
      <button onClick={() => setMetric('fdv')}
              style={{ padding: '3px 9px', fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                       background: metric === 'fdv' ? 'rgba(212,169,60,0.12)' : 'transparent',
                       color: metric === 'fdv' ? 'var(--accent-orange)' : 'var(--text-muted)',
                       border: 'none', borderLeft: '1px solid var(--border-bright)', cursor: 'pointer' }}>FDV</button>
    </div>
  );

  return (
    <div className="term-grid">
      <div className="widget w-12"
           title="Each dot is one L2. X = chain TVL. Y = Mcap or FDV (toggle with the pills). Log scale. Dots near the dashed y=x line are fairly priced; dots above are growth-priced; far above is outlier. Green shaded band = healthy 0.3-5×. ADI shown twice: solid = on-chain TVL incl. DDSC, dashed ring = DefiLlama-only view. Click any dot for detail.">
        <div className="widget-head">
          <span className="widget-title">{metric === 'fdv' ? 'FDV' : 'MCAP'} vs TVL · log-log</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <InlineMetric />
            <span className="widget-meta">{data.rows.filter((r) => r.tvl > 0 && ((r as any)[yKey] || 0) > 0).length + 1} chains · click any dot</span>
          </div>
        </div>
        <div className="widget-body flush">
          <ScatterMcapVsTvl rows={data.rows} adi={adi} openDetail={openDetail} metric={metric} />
        </div>
      </div>

      {data.history && (
        <div className="widget w-12"
             title="ADI's Mcap/TVL over 90 days vs each tier's median (shaded P25-P75 band per tier). The red ADI line shows the DefiLlama-visible view, which trends up as price drifts down on flat indexed TVL. The on-chain truth is much lower; this chart shows what external analysts see.">
          <div className="widget-head">
            <span className="widget-title">Mcap / TVL over time</span>
            <span className="widget-meta">{data.history.windowDays}d window · tier medians + P25-P75 bands</span>
          </div>
          <div className="widget-body flush">
            <McapTvlTrend history={data.history} adi={adi} />
          </div>
        </div>
      )}

      <div className="widget w-6"
           title="Top 10 L2s by TVL as horizontal bars. Click any bar for detail. ADI bar (red) at bottom for context.">
        <div className="widget-head">
          <span className="widget-title">TVL leaderboard</span>
          <span className="widget-meta">top 10 · click bar for detail</span>
        </div>
        <div className="widget-body">
          {tvlLeader.map((r, i) => {
            const pct = (r.tvl / maxTvl) * 100;
            return (
              <div key={r.name}
                   onClick={() => openDetail(r)}
                   style={{ display: 'grid', gridTemplateColumns: '14px 110px 1fr 80px', gap: 8, alignItems: 'center', padding: '4px 0', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
                <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>{i + 1}</span>
                <span>{r.name}<span style={{ color: 'var(--text-muted)', fontSize: 10, marginLeft: 4 }}>{r.symbol || '-'}</span></span>
                <div style={{ position: 'relative', height: 14, background: 'var(--tint-soft)', borderRadius: 2 }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent-orange), rgba(212,169,60,0.4))', borderRadius: 2, opacity: 0.85 }} />
                </div>
                <span style={{ textAlign: 'right', fontWeight: 600 }}>{fmtUSD(r.tvl)}</span>
              </div>
            );
          })}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)',
                        display: 'grid', gridTemplateColumns: '14px 110px 1fr 80px', gap: 8, alignItems: 'center',
                        fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--accent-red)', fontWeight: 600, cursor: 'pointer' }}
               onClick={() => openDetail({ ...adi, name: 'ADI Chain', symbol: 'ADI' } as unknown as L2Row)}>
            <span style={{ fontSize: 10 }}>·</span>
            <span>ADI Chain<span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>ADI</span></span>
            <div style={{ position: 'relative', height: 14, background: 'var(--tint-soft)', borderRadius: 2 }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(adi.tvl_with_ddsc / maxTvl) * 100}%`, background: 'var(--accent-red)', opacity: 0.7, borderRadius: 2 }} />
            </div>
            <span style={{ textAlign: 'right' }}>{fmtUSD(adi.tvl_with_ddsc)}</span>
          </div>
        </div>
      </div>

      <div className="widget w-6"
           title={`Each tile is one L2 colored by ${ratioLabel} intensity. Green = healthy (under 2x), yellow = growth-priced, amber = priced on expectation, red = outlier. ADI outlined in orange. Toggle Mcap/FDV with the inline pills. Click any tile for detail.`}>
        <div className="widget-head">
          <span className="widget-title">{ratioLabel} heatmap</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <InlineMetric />
            <span className="widget-meta">top 18 · click for detail</span>
          </div>
        </div>
        <div className="widget-body">
          <div className="heatmap">
            {heatChains.map((r) => {
              const mt = r._mt;
              let bg: string, fg: string;
              if (mt > 50) { bg = 'rgba(255,90,95,0.30)'; fg = 'var(--accent-red)'; }
              else if (mt > 10) { bg = 'rgba(245,181,68,0.22)'; fg = 'var(--accent-yellow)'; }
              else if (mt > 2) { bg = 'rgba(245,181,68,0.10)'; fg = 'var(--foreground)'; }
              else { bg = 'rgba(46,204,113,0.10)'; fg = 'var(--accent-green)'; }
              return (
                <div key={r.name}
                     className={`heat-cell ${r._adi ? 'adi' : ''}`}
                     style={{ background: bg }}
                     onClick={() => openDetail(r as L2Row)}
                     title={`${r.name} · ${fmtUSD(r.chain_mcap)} mcap · ${fmtUSD(r.tvl)} TVL`}>
                  <span className="hname">{r.name}</span>
                  <span className="hsym">{r.symbol || '-'}</span>
                  <span className="hval" style={{ color: fg }}>{fmtX(mt, 2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
