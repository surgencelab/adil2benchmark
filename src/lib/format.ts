/**
 * Number formatters used across the dashboard. All accept null/undefined
 * and return '-' so callers don't have to null-check.
 */

export const fmtUSD = (v: number | null | undefined, dp = 1): string => {
  if (v == null || isNaN(v)) return '-';
  const n = Number(v);
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(dp)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(dp)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

export const fmtX = (v: number | null | undefined, dp = 2): string =>
  v == null || isNaN(v) ? '-' : `${Number(v).toFixed(dp)}×`;

export const fmtPct = (v: number | null | undefined, dp = 2): string =>
  v == null || isNaN(v) ? '-' : `${Number(v).toFixed(dp)}%`;

export const fmtNum = (v: number | null | undefined): string =>
  v == null || isNaN(v) ? '-' : Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 });

export const fmtDelta = (pct: number | null | undefined, dp = 1): string => {
  if (pct == null || isNaN(pct)) return '-';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(dp)}%`;
};
