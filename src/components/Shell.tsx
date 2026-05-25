/**
 * App shell: sidebar nav, top ticker bar, top status bar, status bar footer.
 * Pure presentational; routing/state lives in App.tsx.
 */
import type { ReactNode } from 'react';
import type { Route, Theme, Metric, AdiRow, Dataset } from '../data/types';
import { fmtUSD, fmtX, fmtPct } from '../lib/format';

export interface NavItem {
  id: Route;
  label: string;
  hotkey: string;
}

export const NAV: NavItem[] = [
  { id: 'overview',    label: 'Overview',    hotkey: '1' },
  { id: 'scatter',     label: 'Charts',      hotkey: '2' },
  { id: 'table',       label: 'L2 Universe', hotkey: '3' },
  { id: 'report',      label: 'Report',      hotkey: '4' },
  { id: 'methodology', label: 'Methodology', hotkey: '5' },
];

function NavIcon({ id }: { id: Route }) {
  switch (id) {
    case 'overview':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      );
    case 'scatter':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="6" cy="18" r="1.5" />
          <circle cx="10" cy="13" r="1.5" />
          <circle cx="14" cy="15" r="1.5" />
          <circle cx="18" cy="7" r="1.5" />
          <line x1="3" y1="3" x2="3" y2="21" />
          <line x1="3" y1="21" x2="21" y2="21" />
        </svg>
      );
    case 'table':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <line x1="15" y1="3" x2="15" y2="21" />
        </svg>
      );
    case 'report':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="16" y2="17" />
        </svg>
      );
    case 'methodology':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      );
  }
}

interface SidebarProps {
  active: Route;
  setActive: (r: Route) => void;
  onCmd: () => void;
  onExport: () => void;
  onToggleTheme: () => void;
  theme: Theme;
}

export function Sidebar({ active, setActive, onCmd, onExport, onToggleTheme, theme }: SidebarProps) {
  return (
    <aside className="sidebar-nav">
      <img
        className="sidebar-brand"
        src="/surgence-logo.png"
        alt="Surgence Labs"
        title="ADI L2 Benchmark · Surgence Labs"
      />
      {NAV.map((n) => (
        <div
          key={n.id}
          className={`sidebar-item ${active === n.id ? 'active' : ''}`}
          onClick={() => setActive(n.id)}
        >
          <NavIcon id={n.id} />
          <span className="kbd-mini">{n.hotkey}</span>
          <span className="tip">{n.label}</span>
        </div>
      ))}
      <div className="sidebar-spacer" />
      <div className="sidebar-item" onClick={onToggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
        {theme === 'dark' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
        <span className="tip">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
      </div>
      <div className="sidebar-item" onClick={onCmd} title="Command palette (⌘K)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 9h6v6h-6z" />
        </svg>
        <span className="tip">⌘K · Command</span>
      </div>
      <div className="sidebar-item" onClick={onExport} title="Export PNG">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span className="tip">Export PNG</span>
      </div>
      <div
        className="sidebar-item"
        onClick={() => window.open('https://github.com/surgencelab/adil2benchmark', '_blank')}
        title="GitHub repo"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
        </svg>
        <span className="tip">GitHub repo</span>
      </div>
    </aside>
  );
}

/* ─── Ticker (live key metrics) ─────────────────────── */
interface TickerProps {
  adi: AdiRow;
  cohorts: Dataset['cohorts'];
}

export function Ticker({ adi, cohorts }: TickerProps) {
  const items = [
    { l: 'ADI FDV',           v: fmtUSD(adi.fdv_usd),                              cls: '' },
    { l: 'FDV/TVL',           v: adi.fdv_usd ? fmtX(adi.fdv_usd / adi.tvl_with_ddsc, 1) : '-', cls: 'down' },
    { l: 'ADI MC',            v: fmtUSD(adi.token_mcap),                           cls: '' },
    { l: 'MC/TVL',            v: fmtX(adi.mcaptvl_with_ddsc, 2),                   cls: 'warn' },
    { l: 'ADI TVL',           v: fmtUSD(adi.tvl_with_ddsc),                        cls: '' },
    { l: 'DDSC',              v: fmtUSD(adi.ddsc_tvl_usd),                         cls: 'up' },
    { l: 'DEFILLAMA VIEW',    v: fmtX(adi.mcaptvl, 0),                             cls: 'down' },
    { l: '24H TURNOVER',      v: fmtPct(adi.turnover_vol_mc_pct, 2),               cls: 'down' },
    { l: 'AIRDROP FDV/TVL',   v: fmtX(cohorts.Airdrop?.fdv_tvl_med, 2),            cls: '' },
    { l: 'NON-AIRDROP FDV/TVL', v: fmtX(cohorts.NonAirdrop?.fdv_tvl_med, 2),       cls: '' },
    { l: 'AIRDROP MC/TVL',    v: fmtX(cohorts.Airdrop?.mcap_tvl_med, 2),           cls: '' },
    { l: 'NON-AIRDROP MC/TVL', v: fmtX(cohorts.NonAirdrop?.mcap_tvl_med, 2),       cls: '' },
    { l: 'CIRCULATING',       v: '~10%',                                            cls: 'warn' },
  ];
  const display = [...items, ...items];
  return (
    <div className="ticker">
      <div className="ticker-inner">
        {display.map((it, i) => (
          <span key={i} className="ticker-item">
            <span className="l">{it.l}</span>
            <span className={`v ${it.cls}`}>{it.v}</span>
            {i < display.length - 1 && <span className="ticker-sep">·</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Top bar (title + cmd hint + LIVE) ───── */
interface TopBarProps {
  activeLabel: string;
  onCmd: () => void;
  asOf: string;
  onRefresh: () => void;
  refreshing: boolean;
}

export function TopBar({ activeLabel, onCmd, asOf, onRefresh, refreshing }: TopBarProps) {
  return (
    <nav className="top-nav">
      <div className="top-nav-inner">
        <div className="brand-cluster">
          <span className="brand-title">{activeLabel} · ADI L2 Benchmark</span>
        </div>
        <div className="nav-cluster">
          <span className="cmd-hint" onClick={onCmd} title="Open command palette (⌘K or /)">
            ⌘K<span className="kbd">/</span>
          </span>
          <button
            className="export-btn"
            onClick={onRefresh}
            disabled={refreshing}
            title="Re-fetch data from DefiLlama, Growthepie, CoinGecko, ADI RPC"
            style={{ marginRight: 6 }}
          >
            {refreshing ? '⋯ Refreshing' : '↻ Refresh'}
          </button>
          <span className="live-pill">
            <span className="live-dot" />
            LIVE · {asOf}
          </span>
        </div>
      </div>
    </nav>
  );
}

/** Inline Mcap/FDV toggle, used inside chart widget headers. */
export function MetricToggle({ metric, setMetric }: { metric: Metric; setMetric: (m: Metric) => void }) {
  return (
    <div
      style={{
        display: 'inline-flex', alignItems: 'center',
        border: '1px solid var(--border-bright)',
        borderRadius: 3, overflow: 'hidden',
      }}
      title="Switch this chart's Y axis. Mcap = price × circulating. FDV = price × max supply (client-preferred for apples-to-apples comparison)."
    >
      <button
        onClick={() => setMetric('mcap')}
        style={{
          padding: '3px 9px', fontFamily: 'var(--font-mono)',
          fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase',
          background: metric === 'mcap' ? 'rgba(212,169,60,0.12)' : 'transparent',
          color: metric === 'mcap' ? 'var(--accent-orange)' : 'var(--text-muted)',
          border: 'none', cursor: 'pointer',
        }}
      >Mcap</button>
      <button
        onClick={() => setMetric('fdv')}
        style={{
          padding: '3px 9px', fontFamily: 'var(--font-mono)',
          fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase',
          background: metric === 'fdv' ? 'rgba(212,169,60,0.12)' : 'transparent',
          color: metric === 'fdv' ? 'var(--accent-orange)' : 'var(--text-muted)',
          border: 'none', borderLeft: '1px solid var(--border-bright)', cursor: 'pointer',
        }}
      >FDV</button>
    </div>
  );
}

export function StatusBar({ asOf, rowCount }: { asOf: string; rowCount: number }) {
  return (
    <div className="status-bar">
      <div>
        <span className="prompt">&gt;</span>datumlabs.xyz / adi-l2-benchmark
      </div>
      <div>{rowCount} L2s · DefiLlama · {asOf} · Powered by DatumLabs</div>
    </div>
  );
}

export function MainWrap({ children }: { children: ReactNode }) {
  return <div className="main-wrap"><div className="main-inner">{children}</div></div>;
}
