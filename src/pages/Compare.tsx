/**
 * Compare page: side-by-side scorecard, ADI Chain vs Canton.
 * Quantitative metrics from data.adi + data.canton (DefiLlama + CoinGecko).
 * Qualitative anchors (banking, regulator, native stable, etc.) are
 * hand-curated; see scripts/fetch_rwa.py for Canton's, and inline below for ADI's.
 */
import type { Dataset } from '../data/types';
import { fmtUSD, fmtX, fmtNum } from '../lib/format';

interface Props { data: Dataset; }

interface Row {
  label: string;
  adi: string | number | null | undefined;
  canton: string | number | null | undefined;
  // optional small italic note shown below the cell value
  adiNote?: string;
  cantonNote?: string;
}

function Cell({ value, note }: { value: Row['adi']; note?: string }) {
  const display = value == null || value === ''
    ? <span style={{ color: 'var(--text-muted)' }}>N/A</span>
    : <span>{value}</span>;
  return (
    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600 }}>{display}</div>
      {note && <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.45 }}>{note}</div>}
    </td>
  );
}

export function ComparePage({ data }: Props) {
  const adi = data.adi;
  const canton = data.canton;

  if (!canton) {
    return (
      <>
        <div className="page-header">
          <div className="page-eyebrow">Compare</div>
          <h1 className="page-title">ADI Chain vs Canton</h1>
        </div>
        <div className="widget w-12">
          <div className="widget-body">
            <p className="report-p">
              No Canton snapshot present in <code className="inline">public/data.json</code>. Run
              <code className="inline"> scripts/fetch_rwa.py</code> then merge via
              <code className="inline"> scripts/refresh_all.py</code> to populate it.
            </p>
          </div>
        </div>
      </>
    );
  }

  const adiFDVTVL = adi.fdv_usd && adi.tvl_with_ddsc ? adi.fdv_usd / adi.tvl_with_ddsc : null;
  const cantonFDVTVL = canton.fdv_tvl;

  const rows: Row[] = [
    {
      label: 'Chain type',
      adi:    'CBUAE-licensed RWAfi L1',
      canton: 'Permissioned L1 with privacy layer',
      adiNote:    'EVM-compatible',
      cantonNote: 'Digital Asset Holdings (Daml)',
    },
    {
      label: 'Launch / first mainnet',
      adi:    '2024',
      canton: `${canton.launch_year || 2024}`,
      adiNote:    'Public mainnet',
      cantonNote: 'Public network launch (Canton was internal since 2017)',
    },
    {
      label: 'TVL (on-chain)',
      adi:    fmtUSD(adi.tvl_with_ddsc),
      canton: fmtUSD(canton.tvl),
      adiNote:    `${fmtUSD(adi.tvl_defillama_visible)} indexed by DefiLlama + ${fmtUSD(adi.ddsc_tvl_usd)} DDSC verified on-chain`,
      cantonNote: 'DefiLlama indexes Canton at L1 layer only; bilateral institutional flows not in TVL',
    },
    {
      label: 'Mcap',
      adi:    fmtUSD(adi.token_mcap),
      canton: fmtUSD(canton.token_mcap),
      adiNote:    '~10% circulating of 1B max supply',
      cantonNote: '~38.7B CC circulating, no fixed max supply',
    },
    {
      label: 'FDV',
      adi:    fmtUSD(adi.fdv_usd),
      canton: fmtUSD(canton.fdv_usd),
      adiNote:    'price × 1B max supply',
      cantonNote: 'Equals Mcap (no fixed max supply)',
    },
    {
      label: 'Mcap / TVL',
      adi:    fmtX(adi.mcaptvl_with_ddsc, 2),
      canton: canton.mcaptvl == null ? null : fmtX(canton.mcaptvl, 0),
      adiNote:    'Above L2 median; high but defensible',
      cantonNote: 'Distorted by Canton\'s low DefiLlama-indexed TVL',
    },
    {
      label: 'FDV / TVL',
      adi:    adiFDVTVL == null ? null : fmtX(adiFDVTVL, 1),
      canton: cantonFDVTVL == null ? null : fmtX(cantonFDVTVL, 0),
      adiNote:    'Tight float, captures unlock overhang',
      cantonNote: 'Same value as Mcap/TVL since FDV = Mcap',
    },
    {
      label: 'Token model',
      adi:    'Fixed 1B max supply',
      canton: canton.token_model,
      adiNote:    'Allocated distribution (private rounds)',
      cantonNote: 'CC is the network fee unit, not a governance token',
    },
    {
      label: 'Native stablecoin',
      adi:    'DDSC (1 AED peg, FAB-custodied)',
      canton: canton.native_stable,
      adiNote:    `On-chain supply ${fmtUSD(adi.ddsc_tvl_usd)} verified via eth_call totalSupply()`,
      cantonNote: 'Settlement in counterparty-issued stables (USDC etc.) instead',
    },
    {
      label: 'Banking partners',
      adi:    'First Abu Dhabi Bank (FAB)',
      canton: canton.banking_partners,
      adiNote:    'CBUAE supervisory framework',
      cantonNote: 'US/UK/EU/APAC institutional integrations',
    },
    {
      label: 'Regulator anchor',
      adi:    'CBUAE',
      canton: canton.regulator,
      adiNote:    'Single primary regulator (UAE)',
      cantonNote: 'Multi-jurisdictional, per-participant',
    },
    {
      label: 'Permissioning',
      adi:    'Permissionless EVM',
      canton: canton.permissioning,
    },
    {
      label: 'On-chain proof point',
      adi:    'IHC $30M DDSC settlement (3 tx verified)',
      canton: canton.institutional_use,
      adiNote:    'Mint → treasury → settlement; 14 Apr 2026',
      cantonNote: 'Production institutional flows, not all on-chain visible',
    },
    {
      label: 'Top-10 holder concentration',
      adi:    '99.28%',
      canton: null,
      adiNote:    'From audit document; structural finding',
      cantonNote: 'CC is not an ERC-20; Moralis does not index Canton',
    },
  ];

  // Two-section split (financial vs structural) for visual rhythm
  const FINANCIAL_END = 7;  // first 7 rows are quantitative finance
  const finRows = rows.slice(0, FINANCIAL_END);
  const structRows = rows.slice(FINANCIAL_END);

  return (
    <>
      <div className="page-header">
        <div className="page-eyebrow">Compare</div>
        <h1 className="page-title">ADI Chain vs Canton · side by side</h1>
        <p className="page-sub">Two regulator-aligned chains, two structurally different bets. Same data sources as the rest of the dashboard (DefiLlama, CoinGecko); qualitative anchors hand-curated against public materials.</p>
      </div>

      <div className="widget w-12" style={{ marginBottom: 14 }}>
        <div className="widget-head">
          <span className="widget-title">Financial</span>
          <span className="widget-meta">TVL, mcap, FDV, ratios · DefiLlama + CoinGecko</span>
        </div>
        <div className="widget-body flush">
          <table className="data-table compare-table">
            <thead>
              <tr>
                <th style={{ width: 200 }}>Metric</th>
                <th style={{ width: '40%' }}>ADI Chain<span style={{ color: 'var(--text-muted)', marginLeft: 6, fontWeight: 400, fontSize: 10 }}>ADI</span></th>
                <th style={{ width: '40%' }}>Canton<span style={{ color: 'var(--text-muted)', marginLeft: 6, fontWeight: 400, fontSize: 10 }}>{canton.symbol || 'CC'}</span></th>
              </tr>
            </thead>
            <tbody>
              {finRows.map((r) => (
                <tr key={r.label}>
                  <td style={{ padding: '12px 16px', verticalAlign: 'top', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 700 }}>{r.label}</td>
                  <Cell value={r.adi} note={r.adiNote} />
                  <Cell value={r.canton} note={r.cantonNote} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="widget w-12" style={{ marginBottom: 14 }}>
        <div className="widget-head">
          <span className="widget-title">Structural</span>
          <span className="widget-meta">tokenomics, banking, regulator, proof points</span>
        </div>
        <div className="widget-body flush">
          <table className="data-table compare-table">
            <thead>
              <tr>
                <th style={{ width: 200 }}>Dimension</th>
                <th style={{ width: '40%' }}>ADI Chain</th>
                <th style={{ width: '40%' }}>Canton</th>
              </tr>
            </thead>
            <tbody>
              {structRows.map((r) => (
                <tr key={r.label}>
                  <td style={{ padding: '12px 16px', verticalAlign: 'top', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 700 }}>{r.label}</td>
                  <Cell value={r.adi} note={r.adiNote} />
                  <Cell value={r.canton} note={r.cantonNote} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="widget w-12">
        <div className="widget-head">
          <span className="widget-title">Read</span>
          <span className="widget-meta">what the comparison shows</span>
        </div>
        <div className="widget-body">
          <p className="report-p" style={{ marginBottom: 10 }}>
            <b>Both chains claim regulator alignment, in different jurisdictions.</b> ADI under CBUAE in the UAE; Canton across NY DFS / FINRA / FCA / MAS through its institutional participants. Neither is a permissionless DeFi chain; both prioritise compliance.
          </p>
          <p className="report-p" style={{ marginBottom: 10 }}>
            <b>The mcap framing is structurally different.</b> Canton trades at {fmtUSD(canton.token_mcap)} mcap with {fmtNum(canton.circulating_supply)} CC circulating and no fixed max supply, so FDV equals Mcap. ADI trades at {fmtUSD(adi.token_mcap)} mcap with ~10% of a fixed 1B supply circulating, so FDV ({fmtUSD(adi.fdv_usd)}) sits ~{((adi.fdv_usd || 0) / (adi.token_mcap || 1)).toFixed(1)}× above Mcap. Comparing the Mcap/TVL ratios apples-to-apples requires the FDV lens.
          </p>
          <p className="report-p" style={{ marginBottom: 10 }}>
            <b>On-chain proof shapes differ.</b> ADI's institutional proof is publicly verifiable: the IHC $30M DDSC settlement is three on-chain transactions auditable against the ADI explorer. Canton's institutional flows (Goldman bond settlement, Cumberland market-making, HQLAx collateral swaps) happen but are not generally public; the privacy layer is by design.
          </p>
          <p className="report-p muted" style={{ marginBottom: 0 }}>
            <b>Caveat on Canton's TVL.</b> DefiLlama indexes Canton at <b>{fmtUSD(canton.tvl)}</b>, which is correct for the L1 layer they look at but does not capture the value of bilateral institutional flows running on the network. The Mcap/TVL ratio for Canton is therefore not directly comparable to ADI's. Reviewers should treat Canton's TVL number as a floor, not a measure of institutional usage.
          </p>
        </div>
      </div>
    </>
  );
}
