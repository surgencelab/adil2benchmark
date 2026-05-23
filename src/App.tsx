/**
 * App orchestrator: state, routing, layout shell, page switcher.
 * Mobile responsive: <1024px collapses the multi-panel grid to a single column.
 */
import { useState, useEffect } from 'react';
import type { L2Row, Route } from './data/types';
import { useDataset, useTheme, useMetric, useGlobalShortcuts, useMediaQuery } from './lib/hooks';
import { Sidebar, Ticker, TopBar, StatusBar, MainWrap, NAV } from './components/Shell';
import { CommandPalette } from './components/CommandPalette';
import { DetailPane } from './components/DetailPane';
import { OverviewPage } from './pages/Overview';
import { ChartsPage } from './pages/Charts';
import { L2UniversePage } from './pages/L2Universe';
import { ReportPage } from './pages/Report';

export default function App() {
  const { data, loading, error, reload } = useDataset();
  const [theme, toggleTheme] = useTheme();
  const [metric, setMetric] = useMetric();
  const [active, setActive] = useState<Route>('overview');
  const [cmdOpen, setCmdOpen] = useState(false);
  const [detail, setDetail] = useState<L2Row | null>(null);
  const [tableFilter, setTableFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);
  const isMobile = useMediaQuery('(max-width: 1024px)');

  useGlobalShortcuts({
    setRoute: (r) => setActive(r as Route),
    toggleTheme,
    openCmd: () => setCmdOpen(true),
  });

  // Auto-hide refresh message after 5s
  useEffect(() => {
    if (!refreshMsg) return;
    const t = setTimeout(() => setRefreshMsg(null), 5000);
    return () => clearTimeout(t);
  }, [refreshMsg]);

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const r = await fetch('/api/refresh', { method: 'POST' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json() as { ok: boolean; stdout?: string; stderr?: string };
      if (j.ok) {
        reload();
        setRefreshMsg('Data refreshed.');
      } else {
        setRefreshMsg(`Refresh failed: ${j.stderr || 'unknown error'}`);
      }
    } catch (e: any) {
      setRefreshMsg(`Refresh failed: ${e.message}. In production this would trigger a GitHub Actions workflow.`);
    } finally {
      setRefreshing(false);
    }
  };

  const exportPNG = async () => {
    try {
      const mod = await import('https://esm.sh/html-to-image@1.11.13' as string);
      const toPng = (mod as any).toPng as (n: HTMLElement, opts?: any) => Promise<string>;
      const target = document.querySelector('.main-inner') as HTMLElement | null;
      if (!target) return;
      const dataUrl = await toPng(target, {
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        pixelRatio: 2,
        cacheBust: true,
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `adi-l2-benchmark-${active}-${data?.asOf || 'snapshot'}.png`;
      a.click();
    } catch (e) {
      console.error('PNG export failed:', e);
    }
  };

  /* ─── Error and loading states ───────────────── */
  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--background)', color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)', fontSize: 14,
      }}>
        <div>Loading dataset…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--background)', color: 'var(--foreground)',
        fontFamily: 'var(--font-mono)', fontSize: 13, gap: 14, padding: 20,
      }}>
        <div style={{ color: 'var(--accent-red)', fontWeight: 700, fontSize: 16 }}>
          ⚠ Failed to load dataset
        </div>
        <div style={{ color: 'var(--text-muted)' }}>
          {error || 'data.json missing or malformed'}
        </div>
        <button
          onClick={reload}
          style={{
            padding: '6px 16px', fontFamily: 'var(--font-mono)', fontSize: 11,
            background: 'transparent', color: 'var(--accent-orange)',
            border: '1px solid var(--accent-orange)', borderRadius: 3,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
        <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 6 }}>
          Run <code>npm run refresh-data</code> from the repo root to regenerate public/data.json.
        </div>
      </div>
    );
  }

  const adi = data.adi;
  const activeLabel = NAV.find((n) => n.id === active)?.label || 'Overview';

  /* ─── Mobile layout: single column, no sidebar ──────── */
  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Ticker adi={adi} cohorts={data.cohorts} />
        <TopBar
          activeLabel={activeLabel}
          onCmd={() => setCmdOpen(true)}
          asOf={data.asOf}
          onRefresh={refresh}
          refreshing={refreshing}
        />
        <div style={{
          display: 'flex', gap: 4, padding: 6, background: 'var(--panel-header)',
          borderBottom: '1px solid var(--border)', overflowX: 'auto',
        }}>
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setActive(n.id)}
              className={`time-pill ${active === n.id ? 'active' : ''}`}
            >
              {n.label}
            </button>
          ))}
        </div>
        <MainWrap>
          {refreshMsg && <RefreshToast msg={refreshMsg} />}
          {active === 'overview' && <OverviewPage data={data} setRoute={setActive} openDetail={setDetail} />}
          {active === 'scatter' && <ChartsPage data={data} metric={metric} setMetric={setMetric} openDetail={setDetail} />}
          {active === 'table' && <L2UniversePage data={data} filterId={tableFilter} setFilterId={setTableFilter} openDetail={setDetail} />}
          {active === 'report' && <ReportPage data={data} />}
        </MainWrap>
        <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} ctx={{
          setRoute: (r) => setActive(r as Route),
          setFilter: setTableFilter,
          setMetric,
          toggleTheme,
          refresh,
        }} />
        {detail && <DetailPane chain={detail} onClose={() => setDetail(null)} />}
        <StatusBar asOf={data.asOf} rowCount={data.rows.length} />
      </div>
    );
  }

  /* ─── Desktop layout: sidebar + grid ──────── */
  return (
    <div className="shell">
      <Sidebar
        active={active}
        setActive={setActive}
        onCmd={() => setCmdOpen(true)}
        onExport={exportPNG}
        onToggleTheme={toggleTheme}
        theme={theme}
      />
      <Ticker adi={adi} cohorts={data.cohorts} />
      <TopBar
        activeLabel={activeLabel}
        onCmd={() => setCmdOpen(true)}
        asOf={data.asOf}
        onRefresh={refresh}
        refreshing={refreshing}
      />
      <MainWrap>
        {refreshMsg && <RefreshToast msg={refreshMsg} />}
        {active === 'overview' && <OverviewPage data={data} setRoute={setActive} openDetail={setDetail} />}
        {active === 'scatter' && <ChartsPage data={data} metric={metric} setMetric={setMetric} openDetail={setDetail} />}
        {active === 'table' && <L2UniversePage data={data} filterId={tableFilter} setFilterId={setTableFilter} openDetail={setDetail} />}
        {active === 'report' && <ReportPage data={data} />}
      </MainWrap>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} ctx={{
        setRoute: (r) => setActive(r as Route),
        setFilter: setTableFilter,
        setMetric,
        toggleTheme,
        refresh,
      }} />
      {detail && <DetailPane chain={detail} onClose={() => setDetail(null)} />}
      <StatusBar asOf={data.asOf} rowCount={data.rows.length} />
    </div>
  );
}

function RefreshToast({ msg }: { msg: string }) {
  return (
    <div style={{
      position: 'fixed', bottom: 50, left: '50%', transform: 'translateX(-50%)',
      padding: '10px 18px', borderRadius: 4,
      background: 'var(--card)', border: '1px solid var(--accent-orange)',
      color: 'var(--foreground)', fontFamily: 'var(--font-mono)', fontSize: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.35)', zIndex: 200, maxWidth: '90vw',
    }}>
      {msg}
    </div>
  );
}
