/**
 * Type definitions for the ADI L2 Benchmark dataset.
 * Mirrors the JSON produced by scripts/fetch_*.py and merged into public/data.json.
 */

export type DistributionModel =
  | 'airdrop'
  | 'no_token'
  | 'token_swap'
  | 'fair_launch'
  | 'private_only';

export type Tier = 'Large' | 'Mid' | 'Small' | 'Micro' | 'ADI';

export interface L2Row {
  name: string;
  symbol: string | null;
  tvl: number;
  tvl_prev_day?: number | null;
  tvl_prev_week?: number | null;
  change_1d?: number | null;
  change_7d?: number | null;
  chain_mcap?: number | null;
  mcaptvl?: number | null;
  protocols?: number | null;
  gecko_id?: string | null;
  token_mcap?: number | null;
  token_price?: number | null;
  dex_v24: number;
  dex_v7: number;
  dex_v30: number;
  dex_change_1d?: number | null;
  dex_change_7d?: number | null;
  dex_slug?: string | null;
  tier: Tier;
  tvl_chg_7d?: number | null;
  tvl_chg_30d?: number | null;
  price_chg_7d?: number | null;
  price_chg_30d?: number | null;
  // Activity from Growthepie
  tx_per_day?: number | null;
  active_wallets_per_day?: number | null;
  fees_paid_usd?: number | null;
  stables_mcap_chain?: number | null;
  // CoinGecko
  max_supply?: number | null;
  total_supply_cg?: number | null;
  circulating_supply?: number | null;
  fdv_usd?: number | null;
  total_volume_usd?: number | null;
  price_usd_cg?: number | null;
  // Distribution metadata
  distribution_model?: DistributionModel;
  airdrop_pct_of_supply?: number;
  airdrop_distributed?: boolean;
  has_token?: boolean;
  // Sparkline data
  sparkline_30d?: number[] | null;
  tx_history?: number[];
  daa_history?: number[];
  stables_history?: number[];
  fees_history?: number[];
  history_timestamps?: number[];
  // ADI-specific (only on the adi row)
  total_24h_vol_all_venues?: number;
  turnover_vol_mc_pct?: number;
  top10_concentration_pct?: number;
  gini?: number;
}

export interface AdiRow extends L2Row {
  ddsc_contract: string;
  ddsc_chain: string;
  ddsc_rpc: string;
  ddsc_supply: number;
  ddsc_tvl_aed: number;
  ddsc_tvl_usd: number;
  ddsc_decimals: number;
  ddsc_peg_usd: number;
  ddsc_aed_per_usd: number;
  ddsc_reserve_bank: string;
  ddsc_fetched_at: string;
  ddsc_source: string;
  ddsc_peg_currency: string;
  tvl_defillama_visible: number;
  tvl_with_ddsc: number;
  mcaptvl_with_ddsc: number;
  fdv_proof_url?: string | null;
}

export interface TierSummary {
  n: number;
  tvl_p25: number | null;
  tvl_med: number | null;
  tvl_p75: number | null;
  mcap_p25?: number | null;
  mcap_med: number | null;
  mcap_p75?: number | null;
  dex_v24_p25?: number | null;
  dex_v24_med: number | null;
  dex_v24_p75?: number | null;
  mcap_tvl_p25?: number | null;
  mcap_tvl_med: number;
  mcap_tvl_p75?: number | null;
  vol_tvl_pct_p25?: number | null;
  vol_tvl_pct_med: number;
  vol_tvl_pct_p75?: number | null;
}

export interface CohortSummary {
  n: number;
  tvl_med: number | null;
  mcap_med: number | null;
  fdv_med: number | null;
  dex_v24_med: number | null;
  mcap_tvl_med: number | null;
  fdv_tvl_med: number | null;
  tx_per_day_med: number | null;
  daa_med: number | null;
}

export interface HistoryPoint {
  med: number | null;
  p25: number | null;
  p75: number | null;
}

export interface HistoryData {
  windowDays: number;
  days: number[];
  tierBands: {
    Large: HistoryPoint[];
    Mid: HistoryPoint[];
    Small: HistoryPoint[];
  };
  adi: (number | null)[];
}

export interface Dataset {
  asOf: string;
  source: string;
  rows: L2Row[];
  adi: AdiRow;
  tierSummary: {
    Large: TierSummary;
    Mid: TierSummary;
    Small: TierSummary;
  };
  cohorts: {
    Airdrop: CohortSummary;
    NonAirdrop: CohortSummary;
    NoToken: CohortSummary;
  };
  history?: HistoryData;
  sparklines?: Record<string, number[]>;
}

export type Theme = 'dark' | 'light';
export type Metric = 'mcap' | 'fdv';
export type Route = 'overview' | 'scatter' | 'table' | 'report';
