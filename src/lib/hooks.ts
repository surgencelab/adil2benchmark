/**
 * Custom hooks used across the dashboard.
 */
import { useEffect, useState } from 'react';
import type { Theme, Metric, Dataset } from '../data/types';

/** localStorage-backed theme (dark default). Applies data-theme to <body>. */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const t = localStorage.getItem('adi-l2-theme');
      return t === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    try { localStorage.setItem('adi-l2-theme', theme); } catch {}
  }, [theme]);
  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  return [theme, toggle];
}

/** localStorage-backed metric lens. FDV is the client-preferred default. */
export function useMetric(): [Metric, (m: Metric) => void] {
  const [metric, setMetric] = useState<Metric>(() => {
    try {
      const m = localStorage.getItem('adi-l2-metric');
      return m === 'mcap' ? 'mcap' : 'fdv';
    } catch {
      return 'fdv';
    }
  });
  const set = (m: Metric) => {
    setMetric(m);
    try { localStorage.setItem('adi-l2-metric', m); } catch {}
  };
  return [metric, set];
}

/** Fetches public/data.json and tracks loading / error state. */
export function useDataset(): {
  data: Dataset | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [data, setData] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/data.json?t=${Date.now()}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => {
        if (!cancelled) setData(j as Dataset);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [reloadKey]);

  return {
    data,
    loading,
    error,
    reload: () => setReloadKey((k) => k + 1),
  };
}

/** Window media query with SSR-safe initial state */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });
  useEffect(() => {
    const m = window.matchMedia(query);
    const handler = () => setMatches(m.matches);
    m.addEventListener('change', handler);
    return () => m.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

/** Listens for global keyboard shortcuts (1-5 tab nav, T theme, / cmd palette) */
export function useGlobalShortcuts(opts: {
  setRoute: (r: string) => void;
  toggleTheme: () => void;
  openCmd: () => void;
}) {
  const { setRoute, toggleTheme, openCmd } = opts;
  useEffect(() => {
    const NAV_KEYS: Record<string, string> = {
      '1': 'overview',
      '2': 'scatter',
      '3': 'table',
      '4': 'report',
    };
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); openCmd(); return;
      }
      if (e.key === '/') { e.preventDefault(); openCmd(); return; }
      if (e.key.toLowerCase() === 't') { e.preventDefault(); toggleTheme(); return; }
      if (NAV_KEYS[e.key]) { setRoute(NAV_KEYS[e.key]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setRoute, toggleTheme, openCmd]);
}
