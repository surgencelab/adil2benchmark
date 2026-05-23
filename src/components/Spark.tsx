/**
 * Inline sparkline SVG. Color reflects trend direction.
 */
import type { CSSProperties } from 'react';

interface SparkProps {
  data: number[] | null | undefined;
  width?: number;
  height?: number;
  style?: CSSProperties;
}

export function Spark({ data, width = 60, height = 18, style }: SparkProps) {
  if (!data || data.length < 2) {
    return <span className="muted" style={{ fontSize: 10 }}>-</span>;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const trend = data[data.length - 1] - data[0];
  const color = trend > 0 ? 'var(--accent-green)' : trend < 0 ? 'var(--accent-red)' : 'var(--text-muted)';
  return (
    <svg width={width} height={height} className="spark" style={{ display: 'inline-block', ...style }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Tiny ▲/▼ percent chip, color-coded. */
export function Delta({ pct }: { pct: number | null | undefined }) {
  if (pct == null || isNaN(pct)) return null;
  const cls = pct > 0.3 ? 'up' : pct < -0.3 ? 'down' : 'flat';
  const sign = pct > 0 ? '+' : '';
  return (
    <span className={`delta ${cls}`}>
      {sign}
      {pct.toFixed(1)}%
    </span>
  );
}
