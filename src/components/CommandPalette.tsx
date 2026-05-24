/**
 * ⌘K command palette. Keyboard-driven nav + theme + metric + filter.
 */
import { useEffect, useRef, useState } from 'react';
import type { Route, Metric } from '../data/types';

export interface CmdContext {
  setRoute: (r: Route) => void;
  setFilter: (id: string) => void;
  setMetric: (m: Metric) => void;
  toggleTheme: () => void;
  refresh: () => void;
}

interface Command {
  id: string;
  label: string;
  shortcut: string;
  run: (ctx: CmdContext) => void;
}

const COMMANDS: Command[] = [
  { id: 'go-overview', label: 'Go: Overview',          shortcut: '1',  run: (c) => c.setRoute('overview') },
  { id: 'go-scatter',  label: 'Go: Charts',            shortcut: '2',  run: (c) => c.setRoute('scatter') },
  { id: 'go-table',    label: 'Go: L2 Universe table', shortcut: '3',  run: (c) => c.setRoute('table') },
  { id: 'go-report',   label: 'Go: Report',            shortcut: '4',  run: (c) => c.setRoute('report') },
  { id: 'go-methodology', label: 'Go: Methodology',    shortcut: '5',  run: (c) => c.setRoute('methodology') },
  { id: 'metric-fdv',  label: 'Metric: FDV',           shortcut: 'F',  run: (c) => c.setMetric('fdv') },
  { id: 'metric-mcap', label: 'Metric: Mcap',          shortcut: 'M',  run: (c) => c.setMetric('mcap') },
  { id: 'theme',       label: 'Toggle dark / light mode', shortcut: 'T', run: (c) => c.toggleTheme() },
  { id: 'filter-airdrop',     label: 'Filter: Airdrop L2s',           shortcut: 'F1', run: (c) => { c.setFilter('airdrop'); c.setRoute('table'); } },
  { id: 'filter-non-airdrop', label: 'Filter: Non-airdrop L2s',       shortcut: 'F2', run: (c) => { c.setFilter('non-airdrop'); c.setRoute('table'); } },
  { id: 'filter-no-token',    label: 'Filter: No-token L2s',          shortcut: 'F3', run: (c) => { c.setFilter('no_token'); c.setRoute('table'); } },
  { id: 'filter-all',         label: 'Filter: Show all L2s',          shortcut: 'F4', run: (c) => c.setFilter('all') },
  { id: 'refresh',     label: 'Refresh data',                 shortcut: 'R',  run: (c) => c.refresh() },
  { id: 'github',      label: 'Open GitHub repo',             shortcut: '↗',  run: () => window.open('https://github.com/surgencelab/adil2benchmark', '_blank') },
  { id: 'rpc',         label: 'Open ADI RPC explorer',        shortcut: '↗',  run: () => window.open('https://explorer.adifoundation.ai', '_blank') },
];

interface Props {
  open: boolean;
  onClose: () => void;
  ctx: CmdContext;
}

export function CommandPalette({ open, onClose, ctx }: Props) {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  if (!open) return null;

  const filtered = COMMANDS.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()));

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') return onClose();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[idx];
      if (cmd) { cmd.run(ctx); onClose(); }
    }
  };

  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-box" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="cmd-input"
          placeholder="Type a command or search..."
          value={q}
          onChange={(e) => { setQ(e.target.value); setIdx(0); }}
          onKeyDown={onKey}
        />
        <div className="cmd-list">
          {filtered.map((c, i) => (
            <div
              key={c.id}
              className={`cmd-item ${i === idx ? 'active' : ''}`}
              onMouseEnter={() => setIdx(i)}
              onClick={() => { c.run(ctx); onClose(); }}
            >
              <span>{c.label}</span>
              <span className="kbd">{c.shortcut}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="cmd-item" style={{ color: 'var(--text-muted)' }}>No commands match</div>
          )}
        </div>
      </div>
    </div>
  );
}
