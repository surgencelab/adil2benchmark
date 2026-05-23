/**
 * Chart primitives: ChartWrapper (toolbar + watermark + footer + expand)
 * and the two main visualisations — ScatterMcapVsTvl and McapTvlTrend.
 */
import { useRef, useState, type ReactNode, useCallback } from 'react';
import type { L2Row, AdiRow, Dataset, Metric } from '../data/types';
import { fmtUSD, fmtX } from '../lib/format';

/* ─── Icons ───────────────────────────────────────────── */
const IconCamera = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);
const IconExpand = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);
const IconCollapse = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" />
    <line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

/* ─── Reusable ChartWrapper ───────────────────────────── */
interface ChartWrapperProps {
  timeRanges?: number[];
  activeRange?: number;
  onRangeChange?: (r: number) => void;
  watermarkText?: string;
  screenshotName?: string;
  legend?: ReactNode;
  note?: ReactNode;
  children: ReactNode;
}

export function ChartWrapper({
  timeRanges,
  activeRange,
  onRangeChange,
  watermarkText = 'ADI · L2 BENCHMARK',
  screenshotName,
  legend,
  note,
  children,
}: ChartWrapperProps) {
  const [expanded, setExpanded] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const screenshot = useCallback(async () => {
    if (!bodyRef.current) return;
    try {
      const mod = await import('https://esm.sh/html-to-image@1.11.13' as string);
      const toPng: (n: HTMLElement, opts?: Record<string, unknown>) => Promise<string> =
        (mod as { toPng: (n: HTMLElement, opts?: Record<string, unknown>) => Promise<string> }).toPng;
      const dataUrl = await toPng(bodyRef.current, {
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        pixelRatio: 2,
        cacheBust: true,
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      const today = new Date().toISOString().slice(0, 10);
      a.download = `${screenshotName || 'chart'}-${today}.png`;
      a.click();
    } catch (e) {
      console.error('Chart screenshot failed:', e);
    }
  }, [screenshotName]);

  const toolbar = (
    <div className="chart-toolbar">
      <div className="time-pills">
        {(timeRanges || []).map((r) => (
          <button
            key={r}
            className={`time-pill ${activeRange === r ? 'active' : ''}`}
            onClick={() => onRangeChange?.(r)}
          >
            {r}D
          </button>
        ))}
      </div>
      <div className="chart-actions">
        <button className="chart-action-btn" onClick={screenshot} title="Download chart as PNG"><IconCamera /></button>
        <button className="chart-action-btn" onClick={() => setExpanded((v) => !v)} title={expanded ? 'Collapse' : 'Expand'}>
          {expanded ? <IconCollapse /> : <IconExpand />}
        </button>
      </div>
    </div>
  );

  const body = (
    <div className="chart-canvas" ref={bodyRef} style={{ padding: '18px 14px 6px', position: 'relative', flex: expanded ? 1 : 'unset' }}>
      {watermarkText && <div className="chart-watermark" style={{ fontSize: expanded ? 96 : 64 }}>{watermarkText}</div>}
      {children}
    </div>
  );

  if (expanded) {
    return (
      <>
        <div className="chart-expanded-bg" onClick={() => setExpanded(false)} />
        <div className="chart-expanded">
          {toolbar}
          {body}
          {legend}
          {note}
        </div>
      </>
    );
  }
  return <>{toolbar}{body}{legend}{note}</>;
}

/* ─── Mcap vs TVL scatter ────────────────────────────── */
interface ScatterProps {
  rows: L2Row[];
  adi: AdiRow;
  metric: Metric;
  openDetail: (r: L2Row) => void;
}

export function ScatterMcapVsTvl({ rows, adi, metric, openDetail }: ScatterProps) {
  const [hover, setHover] = useState<{ p: any; x: number; y: number } | null>(null);
  const yKey: 'fdv_usd' | 'chain_mcap' = metric === 'fdv' ? 'fdv_usd' : 'chain_mcap';
  const yLabel = metric === 'fdv' ? 'FDV (LOG SCALE)' : 'MCAP (LOG SCALE)';
  const refLabel = metric === 'fdv' ? 'FDV = TVL' : 'Mcap = TVL';
  const W = 960, H = 440;
  const P = { l: 60, r: 28, t: 22, b: 40 };
  const inner = { w: W - P.l - P.r, h: H - P.t - P.b };

  const distColor: Record<string, string> = {
    airdrop: 'var(--accent-green)',
    no_token: 'var(--text-muted)',
    token_swap: 'var(--accent-blue)',
    fair_launch: 'var(--accent-cyan)',
    private_only: 'var(--accent-orange)',
  };

  const pts = rows
    .filter((r) => r.tvl > 0 && ((r as any)[yKey] || 0) > 0)
    .map((r) => ({
      row: r,
      name: r.name,
      x: r.tvl,
      y: (r as any)[yKey] as number,
      mt: ((r as any)[yKey] as number) / r.tvl,
      dist: r.distribution_model,
      color: distColor[r.distribution_model || ''] || 'var(--text-muted)',
      adi: false,
      ghost: false,
    }));

  const adiY = metric === 'fdv' ? (adi.fdv_usd ?? 0) : adi.token_mcap ?? 0;
  pts.push({
    row: { ...adi, name: 'ADI Chain', symbol: 'ADI' } as L2Row,
    name: 'ADI Chain', x: adi.tvl_with_ddsc, y: adiY, mt: adiY / adi.tvl_with_ddsc,
    dist: 'private_only', color: 'var(--accent-red)', adi: true, ghost: false,
  } as any);
  const adiGhost = {
    row: { ...adi, name: 'ADI Chain (DefiLlama view)', symbol: 'ADI' } as any,
    name: 'ADI (DefiLlama view)', x: adi.tvl_defillama_visible, y: adiY,
    mt: adiY / adi.tvl_defillama_visible,
    dist: 'private_only', color: 'var(--accent-red)', adi: false, ghost: true,
  };

  const xs = [...pts.map((p) => Math.log10(p.x)), Math.log10(adiGhost.x)];
  const ys = pts.map((p) => Math.log10(p.y));
  const xMin = Math.floor(Math.min(...xs));
  const xMax = Math.ceil(Math.max(...xs));
  const yMin = Math.floor(Math.min(...ys));
  const yMax = Math.ceil(Math.max(...ys));
  const sx = (v: number) => P.l + (Math.log10(v) - xMin) / (xMax - xMin) * inner.w;
  const sy = (v: number) => P.t + inner.h - (Math.log10(v) - yMin) / (yMax - yMin) * inner.h;

  const mcLogs = pts.map((p) => Math.log10(p.y));
  const mcMin = Math.min(...mcLogs), mcMax = Math.max(...mcLogs);
  const radius = (mcap: number, isAdi: boolean) => {
    if (isAdi) return 9;
    const t = (Math.log10(mcap) - mcMin) / (mcMax - mcMin || 1);
    return 4 + t * 7;
  };

  const xTicks: number[] = []; for (let i = xMin; i <= xMax; i++) xTicks.push(i);
  const yTicks: number[] = []; for (let i = yMin; i <= yMax; i++) yTicks.push(i);
  const tickFmt = (t: number) => (t >= 9 ? `$${10 ** (t - 9)}B` : t >= 6 ? `$${10 ** (t - 6)}M` : `$${10 ** (t - 3)}K`);

  const bandPts = [
    { x: 10 ** xMin, y: 10 ** xMin * 0.3 },
    { x: 10 ** xMax, y: 10 ** xMax * 0.3 },
    { x: 10 ** xMax, y: 10 ** xMax * 5 },
    { x: 10 ** xMin, y: 10 ** xMin * 5 },
  ];
  const bandPath = bandPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x).toFixed(1)} ${sy(Math.max(p.y, 10 ** yMin)).toFixed(1)}`).join(' ') + ' Z';

  const ALWAYS_LABEL = new Set(['Base', 'Arbitrum', 'OP Mainnet', 'Mantle', 'World Chain', 'ZKsync Era', 'Linea', 'MegaETH', 'IOTA EVM', 'Manta', 'Sophon', 'Scroll', 'Blast', 'Movement']);

  const svg = (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
         style={{ display: 'block', width: '100%', height: 'auto', cursor: hover ? 'pointer' : 'default' }}>
      <path d={bandPath} fill="rgba(46,204,113,0.07)" stroke="rgba(46,204,113,0.18)" strokeDasharray="2 4" />
      <text x={sx(10 ** (xMin + (xMax - xMin) * 0.05))} y={sy(10 ** (xMin + (xMax - xMin) * 0.05) * 5) - 4}
            fontSize="9" fill="var(--accent-green)" fontFamily="var(--font-mono)" fontStyle="italic" opacity="0.7">
        healthy band ({metric === 'fdv' ? 'FDV' : 'Mcap'}/TVL 0.3-5×)
      </text>
      {yTicks.map((t) => (
        <line key={`gy${t}`} x1={P.l} y1={sy(10 ** t)} x2={P.l + inner.w} y2={sy(10 ** t)} stroke="var(--border)" strokeDasharray="3 3" />
      ))}
      {xTicks.map((t) => (
        <line key={`gx${t}`} x1={sx(10 ** t)} y1={P.t} x2={sx(10 ** t)} y2={P.t + inner.h} stroke="var(--tint-soft)" strokeDasharray="3 3" />
      ))}
      <line x1={P.l} y1={P.t} x2={P.l} y2={P.t + inner.h} stroke="var(--border-bright)" />
      <line x1={P.l} y1={P.t + inner.h} x2={P.l + inner.w} y2={P.t + inner.h} stroke="var(--border-bright)" />
      {yTicks.map((t) => (
        <text key={`yl${t}`} x={P.l - 8} y={sy(10 ** t) + 3} fontSize="10" textAnchor="end" fill="var(--text-muted)" fontFamily="var(--font-mono)">{tickFmt(t)}</text>
      ))}
      {xTicks.map((t) => (
        <text key={`xl${t}`} x={sx(10 ** t)} y={P.t + inner.h + 18} fontSize="10" textAnchor="middle" fill="var(--text-muted)" fontFamily="var(--font-mono)">{tickFmt(t)}</text>
      ))}
      <text x={P.l + inner.w / 2} y={H - 4} fontSize="10" textAnchor="middle" fill="var(--text-muted)" fontFamily="var(--font-mono)" letterSpacing="0.1em">TVL (LOG SCALE)</text>
      <text x={14} y={P.t + inner.h / 2} fontSize="10" textAnchor="middle" fill="var(--text-muted)" fontFamily="var(--font-mono)" letterSpacing="0.1em"
            transform={`rotate(-90 14 ${P.t + inner.h / 2})`}>{yLabel}</text>

      <line x1={sx(10 ** xMin)} y1={sy(10 ** xMin)} x2={sx(10 ** xMax)} y2={sy(10 ** xMax)} stroke="var(--tint-strong)" strokeDasharray="4 4" />
      <text x={sx(10 ** (xMin + (xMax - xMin) * 0.88))} y={sy(10 ** (xMin + (xMax - xMin) * 0.88)) - 6}
            fontSize="10" fill="var(--text-muted)" textAnchor="middle" fontStyle="italic" fontFamily="var(--font-mono)">{refLabel}</text>

      {(() => {
        const cx = sx(adiGhost.x), cy = sy(adiGhost.y);
        return (
          <g style={{ cursor: 'pointer' }}
             onMouseEnter={() => setHover({ p: adiGhost, x: cx, y: cy })}
             onMouseLeave={() => setHover(null)}
             onClick={() => openDetail(adiGhost.row as L2Row)}>
            <circle cx={cx} cy={cy} r="7" fill="none" stroke="var(--accent-red)" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.7" />
          </g>
        );
      })()}
      {(() => {
        const adiPt = pts.find((p) => p.adi);
        if (!adiPt) return null;
        return <line x1={sx(adiGhost.x)} y1={sy(adiGhost.y)} x2={sx(adiPt.x)} y2={sy(adiPt.y)} stroke="var(--accent-red)" strokeDasharray="2 2" opacity="0.5" />;
      })()}

      {pts.map((p, i) => {
        const cx = sx(p.x), cy = sy(p.y);
        const r = radius(p.y, p.adi);
        const nearRight = cx > P.l + inner.w - 90;
        const showLabel = p.adi || ALWAYS_LABEL.has(p.name);
        return (
          <g key={`${p.name}-${i}`}
             style={{ cursor: 'pointer' }}
             onMouseEnter={() => setHover({ p, x: cx, y: cy })}
             onMouseLeave={() => setHover(null)}
             onClick={() => openDetail(p.row)}>
            <circle cx={cx} cy={cy} r={r} fill={p.color} fillOpacity={p.adi ? 1 : 0.72}
                    stroke={p.adi ? 'var(--accent-red)' : 'var(--card)'} strokeWidth={p.adi ? 2 : 1} />
            {showLabel && (
              <text x={nearRight ? cx - r - 4 : cx + r + 4} y={cy + 3} fontSize="10.5"
                    fill={p.adi ? 'var(--accent-red)' : 'var(--foreground)'}
                    fontWeight={p.adi ? 700 : 500}
                    fontFamily="var(--font-mono)"
                    textAnchor={nearRight ? 'end' : 'start'}>{p.name}</text>
            )}
          </g>
        );
      })}

      {hover && (() => {
        const { p, x, y } = hover;
        const labelLines = [
          p.name,
          `TVL ${fmtUSD(p.x)}  ·  ${metric === 'fdv' ? 'FDV' : 'Mcap'} ${fmtUSD(p.y)}`,
          `${metric === 'fdv' ? 'FDV/TVL' : 'M/T'} ${fmtX(p.mt, 2)}  ·  ${p.dist || '-'}${p.ghost ? '  (DefiLlama-only view)' : ''}`,
        ];
        const tipW = 250, tipH = 52;
        const flipX = x > W - tipW - 10;
        const tx = flipX ? x - tipW - 10 : x + 10;
        const ty = Math.max(P.t + 4, y - tipH - 6);
        return (
          <g pointerEvents="none">
            <rect x={tx} y={ty} width={tipW} height={tipH} rx="3" fill="var(--card)" stroke="var(--border-bright)" />
            {labelLines.map((line, k) => (
              <text key={k} x={tx + 8} y={ty + 14 + k * 13}
                    fontSize={k === 0 ? 11.5 : 10}
                    fontWeight={k === 0 ? 700 : 500}
                    fill={k === 0 ? 'var(--accent-orange)' : 'var(--foreground)'}
                    fontFamily="var(--font-mono)">{line}</text>
            ))}
          </g>
        );
      })()}
    </svg>
  );

  const legend = (
    <div className="chart-footer">
      <span className="legend-item"><span className="legend-sw" style={{ background: 'var(--accent-green)' }} />Airdrop L2</span>
      <span className="legend-item"><span className="legend-sw" style={{ background: 'var(--accent-blue)' }} />Token swap</span>
      <span className="legend-item"><span className="legend-sw" style={{ background: 'var(--accent-cyan)' }} />Fair launch</span>
      <span className="legend-item"><span className="legend-sw" style={{ background: 'var(--accent-red)' }} />ADI (on-chain)</span>
      <span className="legend-item">
        <svg width="14" height="10"><circle cx="7" cy="5" r="4" fill="none" stroke="var(--accent-red)" strokeWidth="1.5" strokeDasharray="2 2" /></svg>
        ADI (DefiLlama view)
      </span>
      <span className="legend-item">
        <span className="legend-sw" style={{ background: 'rgba(46,204,113,0.18)', border: '1px dashed rgba(46,204,113,0.5)' }} />
        Healthy band 0.3-5×
      </span>
      <span className="legend-item" style={{ marginLeft: 'auto' }}>
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}>dot size ∝ {metric === 'fdv' ? 'FDV' : 'Mcap'} · click for detail</span>
      </span>
    </div>
  );

  return <ChartWrapper screenshotName="adi-scatter" legend={legend}>{svg}</ChartWrapper>;
}

/* ─── McapTvlTrend (90d trend with tier bands) ────────── */
interface TrendProps {
  history: Dataset['history'];
  adi: AdiRow;
}

export function McapTvlTrend({ history, adi }: TrendProps) {
  const TIME_RANGES = [7, 30, 90];
  const [range, setRange] = useState(90);
  if (!history) return <div style={{ padding: 20, color: 'var(--text-muted)' }}>No history data</div>;

  const N_full = history.days.length;
  const N = Math.min(range, N_full);
  const sliceFrom = N_full - N;
  const days = history.days.slice(sliceFrom);
  const bands = {
    Large: history.tierBands.Large.slice(sliceFrom),
    Mid: history.tierBands.Mid.slice(sliceFrom),
    Small: history.tierBands.Small.slice(sliceFrom),
  };
  const adiSeries = history.adi.slice(sliceFrom);

  const allY: number[] = [];
  (['Large', 'Mid', 'Small'] as const).forEach((t) => bands[t].forEach((b) => {
    if (b.p25 != null && b.p25 > 0) allY.push(b.p25);
    if (b.p75 != null) allY.push(b.p75);
  }));
  adiSeries.forEach((v) => { if (v != null) allY.push(v); });
  const yLogMin = Math.floor(Math.log10(Math.max(0.05, Math.min(...allY))));
  const yLogMax = Math.ceil(Math.log10(Math.max(...allY)));

  const W = 980, H = 360;
  const P = { l: 56, r: 96, t: 18, b: 36 };
  const inner = { w: W - P.l - P.r, h: H - P.t - P.b };
  const sx = (i: number) => P.l + (N === 1 ? 0 : (i / (N - 1)) * inner.w);
  const sy = (v: number) => P.t + inner.h - (Math.log10(v) - yLogMin) / (yLogMax - yLogMin) * inner.h;

  const tierStyle = {
    Large: { col: 'var(--accent-green)',  label: 'Large L2' },
    Mid:   { col: 'var(--accent-yellow)', label: 'Mid L2' },
    Small: { col: 'var(--accent-blue)',   label: 'Small L2' },
  } as const;

  const buildLine = (arr: typeof bands.Large) => {
    const pts = arr.map((b, i) => (b.med != null ? { x: sx(i), y: sy(b.med) } : null)).filter(Boolean) as { x: number; y: number }[];
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  };
  const buildBand = (arr: typeof bands.Large) => {
    const top = arr.map((b, i) => (b.p75 != null ? { x: sx(i), y: sy(b.p75) } : null)).filter(Boolean) as { x: number; y: number }[];
    const bot = arr.map((b, i) => (b.p25 != null ? { x: sx(i), y: sy(b.p25) } : null)).filter(Boolean).reverse() as { x: number; y: number }[];
    if (!top.length || !bot.length) return '';
    return [...top, ...bot].map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + ' Z';
  };
  const adiPathPts = adiSeries.map((v, i) => (v != null ? { x: sx(v != null ? i : 0), y: sy(v) } : null)).filter(Boolean) as { x: number; y: number }[];
  const adiPath = adiPathPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');

  const yTicks: number[] = []; for (let i = yLogMin; i <= yLogMax; i++) yTicks.push(i);
  const nXTicks = Math.min(5, N);
  const xTickIdxs = Array.from({ length: nXTicks }, (_, k) => Math.round((k / (nXTicks - 1)) * (N - 1)));
  const dateFmt = (ts: number) => {
    const d = new Date(ts * 1000);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  };
  const yFmt = (pow: number) => {
    const v = 10 ** pow;
    if (v >= 10) return `${v.toFixed(0)}×`;
    if (v >= 1) return `${v.toFixed(1)}×`;
    return `${v.toFixed(2)}×`;
  };
  const lastVal = (arr: (number | null | undefined)[]) => { for (let i = arr.length - 1; i >= 0; i--) if (arr[i] != null) return arr[i] as number; return null; };
  const lastMed = {
    Large: lastVal(bands.Large.map((b) => b?.med)),
    Mid: lastVal(bands.Mid.map((b) => b?.med)),
    Small: lastVal(bands.Small.map((b) => b?.med)),
  };
  const lastAdi = lastVal(adiSeries) ?? 0;

  const svg = (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block', width: '100%', height: 'auto' }}>
      <defs>
        {(['Large','Mid','Small'] as const).map((t) => (
          <linearGradient key={`grad-${t}`} id={`grad-${t}-${range}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={tierStyle[t].col} stopOpacity="0.28" />
            <stop offset="100%" stopColor={tierStyle[t].col} stopOpacity="0.02" />
          </linearGradient>
        ))}
      </defs>
      {yTicks.map((t) => (
        <line key={`gy${t}`} x1={P.l} y1={sy(10**t)} x2={P.l + inner.w} y2={sy(10**t)} stroke="var(--border)" strokeDasharray="3 3" />
      ))}
      {xTickIdxs.map((i) => (
        <line key={`gx${i}`} x1={sx(i)} y1={P.t} x2={sx(i)} y2={P.t + inner.h} stroke="var(--tint-soft)" strokeDasharray="3 3" />
      ))}
      <line x1={P.l} y1={P.t} x2={P.l} y2={P.t + inner.h} stroke="var(--border-bright)" />
      <line x1={P.l} y1={P.t + inner.h} x2={P.l + inner.w} y2={P.t + inner.h} stroke="var(--border-bright)" />
      {yTicks.map((t) => (
        <text key={`yl${t}`} x={P.l - 8} y={sy(10**t) + 3} fontSize="10" textAnchor="end" fill="var(--text-muted)" fontFamily="var(--font-mono)">{yFmt(t)}</text>
      ))}
      {xTickIdxs.map((i) => (
        <text key={`xl${i}`} x={sx(i)} y={P.t + inner.h + 18} fontSize="10" textAnchor="middle" fill="var(--text-muted)" fontFamily="var(--font-mono)">{dateFmt(days[i])}</text>
      ))}
      {(['Small','Mid','Large'] as const).map((t) => {
        const d = buildBand(bands[t]);
        return d ? <path key={`band-${t}`} d={d} fill={`url(#grad-${t}-${range})`} stroke="none" /> : null;
      })}
      {(['Small','Mid','Large'] as const).map((t) => (
        <path key={`med-${t}`} d={buildLine(bands[t])} stroke={tierStyle[t].col} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {(['Large','Mid','Small'] as const).map((t) => {
        const m = lastMed[t];
        if (m == null) return null;
        const cy = sy(m);
        return (
          <g key={`endlbl-${t}`}>
            <line x1={P.l + inner.w} y1={cy} x2={P.l + inner.w + 6} y2={cy} stroke={tierStyle[t].col} strokeWidth="1.5" />
            <text x={P.l + inner.w + 10} y={cy + 3} fontSize="10.5" fill={tierStyle[t].col} fontFamily="var(--font-mono)" fontWeight="600">{tierStyle[t].label}</text>
            <text x={P.l + inner.w + 10} y={cy + 16} fontSize="10" fill="var(--text-muted)" fontFamily="var(--font-mono)">{fmtX(m)}</text>
          </g>
        );
      })}
      <path d={adiPath} stroke="var(--accent-red)" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {adiPathPts.length > 0 && (
        <g>
          <circle cx={adiPathPts[adiPathPts.length-1].x} cy={adiPathPts[adiPathPts.length-1].y} r="4.5" fill="var(--accent-red)" stroke="var(--card)" strokeWidth="2" />
          <line x1={P.l + inner.w} y1={adiPathPts[adiPathPts.length-1].y} x2={P.l + inner.w + 6} y2={adiPathPts[adiPathPts.length-1].y} stroke="var(--accent-red)" strokeWidth="1.5" />
          <text x={P.l + inner.w + 10} y={adiPathPts[adiPathPts.length-1].y + 3} fontSize="10.5" fill="var(--accent-red)" fontFamily="var(--font-mono)" fontWeight="700">ADI</text>
          <text x={P.l + inner.w + 10} y={adiPathPts[adiPathPts.length-1].y + 16} fontSize="10" fill="var(--accent-red)" fontFamily="var(--font-mono)" fontWeight="600">{fmtX(lastAdi, 0)}</text>
        </g>
      )}
    </svg>
  );

  const legend = (
    <div className="chart-footer">
      {(['Large','Mid','Small'] as const).map((t) => (
        <span key={t} className="legend-item">
          <span className="legend-sw" style={{ background: tierStyle[t].col }} />
          {tierStyle[t].label} median
        </span>
      ))}
      <span className="legend-item"><span className="legend-sw" style={{ background: 'var(--accent-red)' }} />ADI Chain</span>
      <span className="legend-item" style={{ marginLeft: 'auto' }}>
        <span className="legend-band" style={{ background: 'rgba(15,157,88,0.16)' }} />
        Shaded = P25-P75 cohort spread
      </span>
    </div>
  );

  return (
    <ChartWrapper
      timeRanges={TIME_RANGES} activeRange={range} onRangeChange={setRange}
      screenshotName={`adi-mcap-tvl-trend-${range}d`}
      legend={legend}
    >
      {svg}
    </ChartWrapper>
  );
}
