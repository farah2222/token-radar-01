// Token Radar radar-7 — the pure value model.
//
// Everything here is computed from the snapshot at run time. No protocol
// name is hardcoded anywhere in the model: the board, the multiples, the
// ledger, the farm plans, the token odds and the validation all follow from
// the snapshot's own figures.
//
// radar-7 changes, against radar-6:
//  - The board is the whole census: all 758 protocols in the snapshot are
//    ranked by model-implied value, each with a status (pre-token, flagged
//    pre-token, or already trading) so nothing is claimed that is not true.
//    Every row carries a census rank; clean pre-token rows also carry a
//    launch rank among the clean pre-token rows only, so the #1 launch
//    candidate is rank 1 even when already-trading giants and flagged
//    products sit above it in the census. Flagged and live rows carry no
//    launch rank: the flag text says they are not standalone launches.
//    Live rows show the market's own answer beside the model's: actual
//    market cap and the model-versus-market ratio.
//  - Every pre-token farm plan now carries net dollar economics: deposit,
//    gas cost, hours, the model-implied value of the farmer's share, the
//    airdrop value the farm needs to break even, and the net dollars per
//    hour under a pro-rata scenario. The deposit comes back on exit, so the
//    only sunk cash cost is the gas and the break-even airdrop is exactly
//    the gas; the pro-rata scenario is a yardstick for comparing farms,
//    not a promised payout. All of it is arithmetic on the snapshot and
//    the model; the airdrop itself is never priced, because it cannot be.
//  - A token-odds model: a logistic regression fitted on the snapshot's own
//    launched-versus-pre-token split, giving every pre-token protocol a
//    probability of launching a token, with a held-out AUC.
//  - Held-out validation of the value terms: 5-fold cross-validation over
//    the live-token comparables, with an ablation that switches each value
//    term off in turn, so the terms earn their place out of sample.

export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

export interface FarmTotal {
  cost_usd: number;
  weeks: number;
  capital_usd: number;
  minutes: number;
}

/**
 * Net dollar economics of one farm plan, all computed from the snapshot and
 * the model. The deposit is deployed capital and comes back on exit, so the
 * only sunk cash cost is the gas. The farm's payoff is the airdrop, which
 * the model cannot price, so the plan states the airdrop value the farm
 * needs to break even — exactly the gas cost — and a pro-rata scenario:
 * if the eventual airdrop were distributed purely pro-rata by TVL at the
 * protocol's implied value, the farmer's share would be the stake below,
 * and the scenario net and dollars per hour follow from it. The scenario
 * is a yardstick, not a promise: real airdrops are rarely pro-rata.
 */
export interface FarmEconomics {
  deposit_usd: number;
  gas_cost_usd: number;
  hours: number;
  stake_implied_usd: number;
  value_ratio: number;
  breakeven_ratio: number;
  breakeven_airdrop_usd: number;
  scenario_net_usd: number;
  scenario_dollars_per_hour: number;
}

export interface BoardRow {
  slug: string;
  name: string;
  rank: number | null;
  census_rank: number;
  status: 'pretoken' | 'pretoken-flagged' | 'live';
  flag_reason: string | null;
  implied_value_usd: number;
  actual_mcap_usd: number | null;
  model_vs_market: number | null;
  category: string;
  multiple: number;
  multiple_source: 'category' | 'global';
  comparables_count: number;
  base_value_usd: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  breadth_multiplier: number;
  tvl_usd: number;
  change_7d: number | null;
  age_days: number;
  listed_at: string | null;
  newly_tracked: boolean;
  watchlist: boolean;
  chain_count: number;
  chains: string[];
  rank_range: [number, number] | null;
  drivers: string[];
  token_odds: number | null;
  odds_note: string | null;
  farm_steps: string[];
  farm_total: FarmTotal;
  farm_economics: FarmEconomics | null;
}

export interface Comparable {
  slug: string;
  name: string;
  category: string;
  mcap_usd: number;
  tvl_usd: number;
  ratio: number;
}

export interface CategoryStat {
  category: string;
  multiple: number;
  multiple_source: 'category' | 'global';
  comparables: number;
  q1: number;
  median: number;
  q3: number;
}

/**
 * The coverage ledger. It accounts for every protocol in the snapshot:
 * pretoken + pretoken_flagged + live === total, and the flagged and live
 * sub-counts add up to their own totals. The run throws if any of that
 * fails, so a board that cannot account for the census never ships.
 */
export interface Ledger {
  total: number;
  ranked: number;
  pretoken: number;
  pretoken_flagged: number;
  flagged_above_floor: number;
  flagged_versioned: number;
  flagged_product: number;
  flagged_exchange: number;
  live: number;
  live_comparables: number;
  live_no_mcap: number;
  live_dead_mcap: number;
  live_exchanges: number;
  watchlist: number;
  early: number;
  newly_tracked: number;
}

export interface VariantStat {
  name: string;
  n: number;
  mdape: number;
  mean_ape: number;
  within_2x: number;
  within_1_5x: number;
  bias_pct: number;
}

export interface Validation {
  folds: number;
  comparables: number;
  variants: VariantStat[];
  odds_auc: number;
  odds_positives: number;
  odds_negatives: number;
}

export interface OddsModel {
  features: string[];
  coefficients: number[];
  intercept: number;
  means: number[];
  stds: number[];
  auc_cv: number;
  trained_on: number;
  positives: number;
  negatives: number;
}

export interface Integrity {
  snapshot_sha256: string;
  snapshot_source: string;
  as_of: string;
  protocols_total: number;
  ledger_reconciled: boolean;
  watchlist_covered: string;
  model: string;
  deterministic: string;
  validation_mdape: number;
  odds_auc: number;
}

export interface RadarData {
  as_of: string;
  model: string;
  floor_usd: number;
  counts: {
    ranked: number;
    watchlist: number;
    early: number;
    pretoken: number;
    flagged: number;
    live: number;
    newly_tracked: number;
    comparables: number;
    total: number;
  };
  ledger: Ledger;
  global: { multiple: number; q1: number; median: number; q3: number; comparables: number };
  categories: CategoryStat[];
  comparables_by_category: Record<string, Comparable[]>;
  live_tokens: Comparable[];
  validation: Validation;
  odds_model: OddsModel;
  integrity: Integrity | null;
  rows: BoardRow[];
}

// ---------------------------------------------------------------- helpers

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Median of numbers (average of the two middle values for even counts). */
export function median(values: number[]): number {
  return quantile(values, 0.5);
}

/**
 * Linear-interpolation quantile (type 7): position p * (n - 1) on the sorted
 * values, interpolating between neighbours. Median is quantile 0.5.
 */
export function quantile(values: number[], p: number): number {
  if (values.length === 0) throw new Error('quantile of an empty set');
  const xs = [...values].sort((a, b) => a - b);
  if (xs.length === 1) return xs[0]!;
  const pos = p * (xs.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return xs[lo]!;
  return xs[lo]! + (xs[hi]! - xs[lo]!) * (pos - lo);
}

function parseDay(s: string): number {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!);
}

/** Whole days from `listed_at` to `as_of`; unknown `listed_at` counts as 365. */
export function ageDays(listedAt: string | null, asOf: string): number {
  if (listedAt === null) return 365;
  return Math.round((parseDay(asOf) - parseDay(listedAt)) / 86400000);
}

const fmtUsd = (n: number): string => '$' + Math.round(n).toLocaleString('en-US');
const fmtPct = (n: number): string => (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
const round2 = (n: number): number => Math.round(n * 100) / 100;
const round3 = (n: number): number => Math.round(n * 1000) / 1000;

// ------------------------------------------------------- classification

const EXCHANGE_NAMES = new Set(['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini']);
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/**
 * Versioned: the name ends in a space followed by a version marker — V or v
 * plus digits (V2, v3, V12, V2.0), or a bare numeric version (2.0, 3.0).
 * "Rysk V12" is versioned; "CommunityV3" is not (no space before V3) and
 * "Project 0" is not (a bare 0 is not a version marker).
 */
const VERSIONED_RE = / (?:[Vv]\d+(?:\.\d+)?|\d+\.\d+)$/;

function wholeWord(name: string, word: string): boolean {
  return name.toLowerCase().split(/[^a-z]+/).includes(word);
}

/**
 * Why a pre-token protocol is flagged rather than ranked clean: it is an
 * exchange product, a wrapped / staked / bridged product, a versioned name,
 * or it sits above the $50M floor without being on the watchlist. The
 * first matching reason wins, in that order. A null return means clean.
 */
function flagReason(p: SnapshotProtocol, floor: number, watchlist: Set<string>): string | null {
  const first = p.name.split(/\s+/)[0];
  if (p.category === 'CEX' || (first !== undefined && EXCHANGE_NAMES.has(first))) {
    return 'exchange';
  }
  if (
    (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) ||
    wholeWord(p.name, 'wrapped') ||
    wholeWord(p.name, 'staked') ||
    wholeWord(p.name, 'staking')
  ) {
    return 'product';
  }
  if (VERSIONED_RE.test(p.name)) return 'versioned';
  if (!watchlist.has(p.slug) && p.tvl_usd >= floor) return 'above-floor';
  return null;
}

const FLAG_TEXT: Record<string, string> = {
  exchange:
    'Exchange product — the exchange already has a token trading, so this is not a standalone launch.',
  product:
    'Wrapped, staked or bridged product — a product of a protocol, not a standalone launch.',
  versioned:
    'Versioned name — most likely a new version of a protocol whose token may already trade.',
  'above-floor':
    'Above the $50M floor and off the watchlist — most likely a chain deployment or product of a protocol whose token already trades; the snapshot has no parent field, so verify before farming.',
};

function isExchange(p: SnapshotProtocol): boolean {
  if (p.category === 'CEX') return true;
  const first = p.name.split(/\s+/)[0];
  return first !== undefined && EXCHANGE_NAMES.has(first);
}

const hasToken = (p: SnapshotProtocol): boolean => p.gecko_id !== null || p.symbol !== null;

// ------------------------------------------------------------ farm plans

const STEP2_VERBS: Record<string, string> = {
  Dexs: 'Swap tokens or add liquidity',
  Lending: 'Supply assets, or borrow a small amount against them',
  Yield: 'Deposit into the vault',
  'Yield Aggregator': 'Deposit into the vault',
  Bridge: 'Bridge a small amount',
  'Canonical Bridge': 'Bridge a small amount',
  'Cross Chain Bridge': 'Bridge a small amount',
  CDP: 'Mint against collateral',
  'CDP Manager': 'Open a collateral position',
  Derivatives: 'Open a small position',
  RWA: 'Buy into the offering',
  'Staking Pool': 'Stake a small amount',
  Farm: 'Deposit into the farm',
  'Liquidity Manager': 'Deposit into the managed pool',
  'Leveraged Farming': 'Open a small leveraged position',
  'Basis Trading': 'Deposit into the basis vault',
  Restaking: 'Restake a small amount',
};

const STEP4_SECOND_FEATURE: Record<string, string> = {
  Dexs: 'add liquidity to a second pool',
  Lending: 'borrow a small amount against the supply',
  Yield: 'deposit into a second vault',
  'Yield Aggregator': 'deposit into a second vault',
  CDP: 'open a second collateral position',
  Derivatives: 'try a second market',
  RWA: 'review the offering documents and try a second product',
};

function capitalTier(tvl: number): number {
  if (tvl >= 500_000_000) return 250;
  if (tvl >= 200_000_000) return 150;
  if (tvl >= 100_000_000) return 100;
  return 50;
}

function holdDays(age: number): number {
  if (age < 180) return 30;
  if (age < 540) return 45;
  return 60;
}

/**
 * Net dollar economics for one farm plan. The farmer puts in `capital` and
 * pays `gas` in fees over `weeks` weeks and `minutes` of hands-on time.
 * The deposit comes back on exit, so the only sunk cash cost is the gas,
 * and the farm breaks even when the eventual airdrop is worth the gas.
 * The pro-rata scenario asks what the farm would pay if the airdrop were
 * shared out purely by TVL at the protocol's implied value: the farmer's
 * share is capital x multiple x growth x maturity x breadth, and the
 * scenario net and dollars per hour follow from that share minus the gas.
 * Real airdrops are rarely pro-rata, so the scenario is a yardstick for
 * comparing farms, not a promised payout.
 */
export function farmEconomics(
  capital: number,
  gas: number,
  minutes: number,
  multiple: number,
  growth: number,
  maturity: number,
  breadth: number,
): FarmEconomics {
  const hours = minutes / 60;
  const valueRatio = multiple * growth * maturity * breadth;
  const stakeImplied = Math.round(capital * valueRatio);
  const scenarioNet = stakeImplied - gas;
  return {
    deposit_usd: capital,
    gas_cost_usd: gas,
    hours: round2(hours),
    stake_implied_usd: stakeImplied,
    value_ratio: round3(valueRatio),
    breakeven_ratio: round3(gas / capital),
    breakeven_airdrop_usd: gas,
    scenario_net_usd: scenarioNet,
    scenario_dollars_per_hour: round2(scenarioNet / hours),
  };
}

/** 7 steps, each 20-600 characters once trimmed. Costs and times are stated in the text. */
export function farmPlan(
  p: SnapshotProtocol,
  age: number,
  econ: FarmEconomics,
): { steps: string[]; total: FarmTotal } {
  const capital = econ.deposit_usd;
  const hold = holdDays(age);
  const weeks = Math.round(hold / 7); // 30 -> 4, 45 -> 6, 60 -> 9
  const verb = STEP2_VERBS[p.category ?? ''] ?? 'Use its main feature';
  const chainCount = p.chains.length;
  const secondChain = chainCount > 1 ? p.chains[1] : null;
  const secondFeature =
    secondChain !== null
      ? `use ${p.name} on a second chain (${secondChain}) as well, with a small $${capital} position, to show breadth across chains`
      : `try a second feature of ${p.name} (${STEP4_SECOND_FEATURE[p.category ?? ''] ?? 'explore a second feature in the app'}), to show breadth beyond the first action`;
  const perHour =
    econ.scenario_dollars_per_hour >= 0
      ? `worth $${econ.scenario_dollars_per_hour.toFixed(2)} per hour of hands-on time if the airdrop paid out pro-rata by TVL at implied value`
      : `running at -$${Math.abs(econ.scenario_dollars_per_hour).toFixed(2)} per hour of hands-on time if the airdrop paid out pro-rata by TVL at implied value — the airdrop has to beat the pro-rata share to pay`;
  const steps = [
    `Set up a fresh wallet for this farm and fund it with a little gas money, about $2-5 (count $3). Allow about 10 minutes.`,
    `${verb} on ${p.name} once, with a $${capital} deposit — one real use of its main feature, exactly as a regular user would. About $2 in gas, about 15 minutes.`,
    `Repeat the same qualifying action once a week for ${weeks} weeks, keeping each action around $${capital} so the pattern stays consistent. About $2 in gas each week, about 10 minutes each week.`,
    `Then ${secondFeature}. About $2 in gas, about 20 minutes.`,
    `Hold the position for ${hold} days without withdrawing, so the farm shows a real, lasting position rather than a quick in-and-out. No cost, ${hold} days. The farm breaks even if the eventual airdrop is worth at least $${econ.breakeven_airdrop_usd}.`,
    `Safety: verify every link from ${p.name}'s official site only, never sign a blind approval, and never pay anyone for a "guaranteed" allocation. About 10 minutes, no cost.`,
    `Keep a log of every transaction hash and date, and watch ${p.name}'s official app for claim announcements. About 5 minutes a week, no cost. On the model's own numbers this farm is ${perHour}.`,
  ];
  // Farm total, summed from the steps' own numbers: $3 setup + $2 first action
  // + $2 per weekly repeat + $2 second feature. Capital is deployed, recoverable.
  const total: FarmTotal = {
    cost_usd: 3 + 2 + 2 * weeks + 2,
    weeks,
    capital_usd: capital,
    minutes: 10 + 15 + 10 * weeks + 20 + 10 + 5 * weeks,
  };
  return { steps, total };
}

// ------------------------------------------------------------ value model

export interface ValueTerms {
  growth: boolean;
  maturity: boolean;
  breadth: boolean;
}

/** The terms the board is built with. The ablation in the validation runs each term off in turn. */
export const ACTIVE_TERMS: ValueTerms = { growth: true, maturity: true, breadth: true };

function impliedValue(tvl: number, multiple: number, growth: number, maturity: number, breadth: number): number {
  return Math.max(1, Math.round(tvl * multiple * growth * maturity * breadth));
}

/** The three multipliers for one protocol, from the snapshot alone. */
export function multipliers(
  p: SnapshotProtocol,
  age: number,
): { growth: number; maturity: number; breadth: number } {
  const change = p.change_7d ?? 0;
  return {
    growth: 1 + (clamp(change, -60, 120) / 100) * 0.5,
    maturity: 0.6 + (Math.min(age, 1095) / 1095) * 0.4,
    breadth: 1 + 0.04 * Math.min(Math.max(p.chains.length - 1, 0), 5),
  };
}

/** Apply the value terms: a switched-off term counts as 1. */
function applyTerms(
  growth: number,
  maturity: number,
  breadth: number,
  terms: ValueTerms,
): { growth: number; maturity: number; breadth: number } {
  return {
    growth: terms.growth ? growth : 1,
    maturity: terms.maturity ? maturity : 1,
    breadth: terms.breadth ? breadth : 1,
  };
}

/**
 * The three strongest stated factors for a row, in plain words. Strength is
 * the absolute log-distance of each factor from its neutral value: TVL and
 * the multiple against the board medians, the multipliers against 1.
 */
function drivers(
  p: SnapshotProtocol,
  row: Omit<BoardRow, 'drivers' | 'rank_range'>,
  medianTvl: number,
  globalMultiple: number,
): string[] {
  const scored: { strength: number; text: string }[] = [];
  const tvlRatio = p.tvl_usd / medianTvl;
  scored.push({
    strength: Math.abs(Math.log(tvlRatio)),
    text:
      tvlRatio >= 1
        ? `TVL ${fmtUsd(p.tvl_usd)} — ${tvlRatio.toFixed(1)}x the board median, so size does most of the work.`
        : `TVL ${fmtUsd(p.tvl_usd)} — below the board median, so size holds the value down.`,
  });
  const multRatio = row.multiple / globalMultiple;
  scored.push({
    strength: Math.abs(Math.log(multRatio)),
    text:
      row.multiple_source === 'category'
        ? `Category multiple ${row.multiple.toFixed(2)} — the median Mcap/TVL of ${row.comparables_count} live ${row.category} protocols, ${multRatio >= 1 ? 'above' : 'below'} the global median of ${globalMultiple.toFixed(2)}.`
        : `Category multiple ${row.multiple.toFixed(2)} — the global median, used because only ${row.comparables_count} live ${row.category} protocol${row.comparables_count === 1 ? '' : 's'} record${row.comparables_count === 1 ? 's' : ''} a market cap.`,
  });
  const change = p.change_7d ?? 0;
  scored.push({
    strength: Math.abs(Math.log(row.growth_multiplier)),
    text:
      change >= 0
        ? `7-day change ${fmtPct(change)} lifts the value by ${((row.growth_multiplier - 1) * 100).toFixed(1)}%.`
        : `7-day change ${fmtPct(change)} trims the value by ${((1 - row.growth_multiplier) * 100).toFixed(1)}%.`,
  });
  scored.push({
    strength: Math.abs(Math.log(row.maturity_multiplier)),
    text:
      row.age_days >= 540
        ? `Tracked for ${row.age_days} days — a long record, so the maturity factor is ${row.maturity_multiplier.toFixed(2)}, near its full value.`
        : `Tracked for ${row.age_days} days — a short record, so the maturity factor is only ${row.maturity_multiplier.toFixed(2)}.`,
  });
  scored.push({
    strength: Math.abs(Math.log(row.breadth_multiplier)),
    text:
      row.chain_count > 1
        ? `Runs on ${row.chain_count} chains — the breadth factor is ${row.breadth_multiplier.toFixed(2)}.`
        : `Runs on a single chain — no breadth uplift.`,
  });
  scored.sort((a, b) => b.strength - a.strength);
  return scored.slice(0, 3).map((s) => s.text);
}

// ------------------------------------------------------- multiples tables

interface MultipleSet {
  global: { multiple: number; q1: number; median: number; q3: number; comparables: number };
  byCategory: Map<string, { multiple: number; source: 'category' | 'global'; count: number; q1: number; q3: number }>;
}

/** Category and global multiples from one set of comparables, same rules as the board. */
function multiplesFrom(comparables: Comparable[]): MultipleSet {
  const globalRatios = comparables.map((c) => c.ratio);
  const globalMultipleRaw = median(globalRatios);
  const global = {
    multiple: clamp(globalMultipleRaw, 0.05, 1.5),
    q1: clamp(quantile(globalRatios, 0.25), 0.05, 1.5),
    median: clamp(globalMultipleRaw, 0.05, 1.5),
    q3: clamp(quantile(globalRatios, 0.75), 0.05, 1.5),
    comparables: comparables.length,
  };
  const byCategory = new Map<string, Comparable[]>();
  for (const c of comparables) {
    const list = byCategory.get(c.category) ?? [];
    list.push(c);
    byCategory.set(c.category, list);
  }
  const out = new Map<string, { multiple: number; source: 'category' | 'global'; count: number; q1: number; q3: number }>();
  for (const [category, list] of byCategory) {
    if (list.length >= 3) {
      const ratios = list.map((c) => c.ratio);
      out.set(category, {
        multiple: clamp(median(ratios), 0.05, 1.5),
        source: 'category',
        count: list.length,
        q1: clamp(quantile(ratios, 0.25), 0.05, 1.5),
        q3: clamp(quantile(ratios, 0.75), 0.05, 1.5),
      });
    } else {
      out.set(category, { multiple: global.multiple, source: 'global', count: list.length, q1: global.q1, q3: global.q3 });
    }
  }
  return { global, byCategory: out };
}

function multipleFor(
  category: string,
  set: MultipleSet,
): { multiple: number; source: 'category' | 'global'; count: number; q1: number; q3: number } {
  return (
    set.byCategory.get(category) ?? {
      multiple: set.global.multiple,
      source: 'global',
      count: 0,
      q1: set.global.q1,
      q3: set.global.q3,
    }
  );
}

// ---------------------------------------------------------- token odds

/** The five features of the token-odds model, all from the snapshot alone. */
export const ODDS_FEATURES = [
  'log10 TVL',
  'age in years (capped at 3)',
  'chain count (capped at 5)',
  '7-day change',
  'live share of the category (leave-one-out)',
];

function oddsFeatures(
  p: SnapshotProtocol,
  age: number,
  liveShareByCategory: Map<string, { live: number; total: number }>,
): number[] {
  const share = liveShareByCategory.get(p.category ?? 'Uncategorised');
  const loo =
    share === undefined || share.total <= 1
      ? 0
      : (share.live - (hasToken(p) ? 1 : 0)) / (share.total - 1);
  return [
    Math.log10(Math.max(p.tvl_usd, 1)),
    clamp(age, -365, 1095) / 365,
    Math.min(p.chains.length, 5),
    clamp(p.change_7d ?? 0, -60, 120) / 100,
    loo,
  ];
}

const sigmoid = (z: number): number => 1 / (1 + Math.exp(-clamp(z, -30, 30)));

function standardise(
  rows: number[][],
  means: number[] | null,
  stds: number[] | null,
): { rows: number[][]; means: number[]; stds: number[] } {
  const k = rows[0]!.length;
  const m: number[] =
    means ??
    Array.from({ length: k }, (_, j) => rows.reduce((s, r) => s + r[j]!, 0) / rows.length);
  const sd: number[] =
    stds ??
    Array.from({ length: k }, (_, j) => {
      const v = rows.reduce((s, r) => s + (r[j]! - m[j]!) ** 2, 0) / rows.length;
      const s = Math.sqrt(v);
      return s === 0 ? 1 : s;
    });
  return {
    rows: rows.map((r) => r.map((v, j) => (v - m[j]!) / sd[j]!)),
    means: m,
    stds: sd,
  };
}

/**
 * Logistic regression by full-batch gradient descent: fixed iterations,
 * fixed learning rate, L2 penalty, zero start. Nothing random anywhere,
 * so the same snapshot always fits the same coefficients.
 */
function fitLogistic(
  x: number[][],
  y: number[],
  iterations: number,
  learningRate: number,
  l2: number,
): { weights: number[]; intercept: number } {
  const n = x.length;
  const k = x[0]!.length;
  const w = new Array<number>(k).fill(0);
  let b = 0;
  for (let it = 0; it < iterations; it++) {
    const gw = new Array<number>(k).fill(0);
    let gb = 0;
    for (let i = 0; i < n; i++) {
      let z = b;
      for (let j = 0; j < k; j++) z += w[j]! * x[i]![j]!;
      const err = sigmoid(z) - y[i]!;
      gb += err;
      for (let j = 0; j < k; j++) gw[j]! += err * x[i]![j]!;
    }
    for (let j = 0; j < k; j++) {
      w[j]! -= learningRate * (gw[j]! / n + 2 * l2 * w[j]!);
    }
    b -= learningRate * (gb / n);
  }
  return { weights: w, intercept: b };
}

function predictLogistic(x: number[][], weights: number[], intercept: number): number[] {
  return x.map((r) => {
    let z = intercept;
    for (let j = 0; j < weights.length; j++) z += weights[j]! * r[j]!;
    return sigmoid(z);
  });
}

/** Area under the ROC curve from out-of-fold scores: pairwise, ties count half. */
function auc(scores: number[], labels: number[]): number {
  let concordant = 0;
  let pairs = 0;
  for (let i = 0; i < scores.length; i++) {
    if (labels[i] !== 1) continue;
    for (let j = 0; j < scores.length; j++) {
      if (labels[j] !== 0) continue;
      pairs++;
      if (scores[i]! > scores[j]!) concordant += 1;
      else if (scores[i] === scores[j]) concordant += 0.5;
    }
  }
  if (pairs === 0) return 0.5;
  return concordant / pairs;
}

// ------------------------------------------------------ held-out validation

function apeStats(actual: number[], predicted: number[]): Omit<VariantStat, 'name' | 'n'> {
  const apes = actual.map((a, i) => Math.abs(predicted[i]! - a) / a);
  const signed = actual.map((a, i) => (predicted[i]! - a) / a);
  const within2 = apes.filter((e) => e <= 1).length / apes.length;
  const within15 = apes.filter((e) => e <= 0.5).length / apes.length;
  return {
    mdape: round3(median(apes)),
    mean_ape: round3(apes.reduce((s, e) => s + e, 0) / apes.length),
    within_2x: round3(within2),
    within_1_5x: round3(within15),
    bias_pct: round3(median(signed)),
  };
}

/**
 * 5-fold cross-validation of the value terms over the live-token
 * comparables. Folds are assigned by slug order, so the split is fixed.
 * For each fold the category multiples are computed from the other four
 * folds only, so a held-out protocol never prices itself. Each variant
 * switches one value term off; the full model is the board's own model.
 */
function crossValidateValue(
  comparables: Comparable[],
  bySlug: Map<string, SnapshotProtocol>,
  asOf: string,
): VariantStat[] {
  const sorted = [...comparables].sort((a, b) => (a.slug < b.slug ? -1 : 1));
  const folds = 5;
  const variants: { name: string; terms: ValueTerms }[] = [
    { name: 'full model', terms: { growth: true, maturity: true, breadth: true } },
    { name: 'no growth term', terms: { growth: false, maturity: true, breadth: true } },
    { name: 'no maturity term', terms: { growth: true, maturity: false, breadth: true } },
    { name: 'no breadth term', terms: { growth: true, maturity: true, breadth: false } },
    { name: 'multiple only', terms: { growth: false, maturity: false, breadth: false } },
  ];
  return variants.map((variant) => {
    const actual: number[] = [];
    const predicted: number[] = [];
    for (let fold = 0; fold < folds; fold++) {
      const heldOut = sorted.filter((_, i) => i % folds === fold);
      const training = sorted.filter((_, i) => i % folds !== fold);
      const set = multiplesFrom(training);
      for (const c of heldOut) {
        const p = bySlug.get(c.slug)!;
        const cm = multipleFor(c.category, set);
        const age = ageDays(p.listed_at, asOf);
        const m = multipliers(p, age);
        const t = applyTerms(m.growth, m.maturity, m.breadth, variant.terms);
        actual.push(c.mcap_usd);
        predicted.push(Math.max(1, p.tvl_usd * cm.multiple * t.growth * t.maturity * t.breadth));
      }
    }
    return { name: variant.name, n: actual.length, ...apeStats(actual, predicted) };
  });
}

/**
 * 5-fold cross-validated AUC for the token-odds model, over all 758
 * protocols sorted by slug. Each fold is standardised and fitted on the
 * other four folds, so no protocol scores itself.
 */
function crossValidateOdds(
  protocols: SnapshotProtocol[],
  asOf: string,
  liveShareByCategory: Map<string, { live: number; total: number }>,
): number {
  const sorted = [...protocols].sort((a, b) => (a.slug < b.slug ? -1 : 1));
  const folds = 5;
  const scores = new Array<number>(sorted.length).fill(0);
  for (let fold = 0; fold < folds; fold++) {
    const trainIdx = sorted.map((_, i) => i).filter((i) => i % folds !== fold);
    const testIdx = sorted.map((_, i) => i).filter((i) => i % folds === fold);
    const trainX = trainIdx.map((i) => oddsFeatures(sorted[i]!, ageDays(sorted[i]!.listed_at, asOf), liveShareByCategory));
    const trainY = trainIdx.map((i) => (hasToken(sorted[i]!) ? 1 : 0));
    const { rows: sx, means, stds } = standardise(trainX, null, null);
    const fit = fitLogistic(sx, trainY, 1500, 0.5, 0.1);
    const testX = testIdx.map((i) => oddsFeatures(sorted[i]!, ageDays(sorted[i]!.listed_at, asOf), liveShareByCategory));
    const st = standardise(testX, means, stds).rows;
    const preds = predictLogistic(st, fit.weights, fit.intercept);
    testIdx.forEach((orig, k) => {
      scores[orig] = preds[k]!;
    });
  }
  return round3(auc(scores, sorted.map((p) => (hasToken(p) ? 1 : 0))));
}

// ------------------------------------------------------------------- build

const ODDS_FEATURE_SHORT = ['TVL', 'track record', 'chain count', '7-day change', 'category token share'];

export function buildRadar(snapshot: Snapshot): RadarData {
  const asOf = snapshot.as_of;
  const floor = snapshot.floor_usd;
  const watchlist = new Set(snapshot.watchlist);
  const bySlug = new Map(snapshot.protocols.map((p) => [p.slug, p]));

  // ---- split the 758 protocols into pre-token (clean / flagged) and live.
  let pretoken = 0;
  let flagged = 0;
  let flaggedAboveFloor = 0;
  let flaggedVersioned = 0;
  let flaggedProduct = 0;
  let flaggedExchange = 0;
  let live = 0;
  let liveComparables = 0;
  let liveNoMcap = 0;
  let liveDeadMcap = 0;
  let liveExchanges = 0;
  const tradingComparables: Comparable[] = [];

  for (const p of snapshot.protocols) {
    if (!hasToken(p)) {
      const flag = flagReason(p, floor, watchlist);
      if (flag === null) {
        pretoken++;
      } else {
        flagged++;
        if (flag === 'above-floor') flaggedAboveFloor++;
        else if (flag === 'versioned') flaggedVersioned++;
        else if (flag === 'product') flaggedProduct++;
        else flaggedExchange++;
      }
      continue;
    }
    live++;
    if (isExchange(p)) {
      liveExchanges++;
    } else if (p.mcap_usd === null) {
      liveNoMcap++;
    } else if (p.mcap_usd <= 0) {
      liveDeadMcap++;
    } else {
      liveComparables++;
      tradingComparables.push({
        slug: p.slug,
        name: p.name,
        category: p.category ?? 'Uncategorised',
        mcap_usd: p.mcap_usd,
        tvl_usd: p.tvl_usd,
        ratio: p.mcap_usd / p.tvl_usd,
      });
    }
  }

  const total = snapshot.protocols.length;
  const early = snapshot.protocols.filter(
    (p) => !hasToken(p) && !watchlist.has(p.slug) && flagReason(p, floor, watchlist) === null && p.tvl_usd < floor,
  ).length;
  const newlyTracked = snapshot.protocols.filter((p) => {
    const age = ageDays(p.listed_at, asOf);
    return age >= 0 && age <= 90;
  }).length;

  const ledger: Ledger = {
    total,
    ranked: total,
    pretoken,
    pretoken_flagged: flagged,
    flagged_above_floor: flaggedAboveFloor,
    flagged_versioned: flaggedVersioned,
    flagged_product: flaggedProduct,
    flagged_exchange: flaggedExchange,
    live,
    live_comparables: liveComparables,
    live_no_mcap: liveNoMcap,
    live_dead_mcap: liveDeadMcap,
    live_exchanges: liveExchanges,
    watchlist: snapshot.protocols.filter((p) => watchlist.has(p.slug)).length,
    early,
    newly_tracked: newlyTracked,
  };
  if (ledger.pretoken + ledger.pretoken_flagged + ledger.live !== total) {
    throw new Error(
      `coverage ledger does not add up: ${ledger.pretoken} + ${ledger.pretoken_flagged} + ${ledger.live} != ${total}`,
    );
  }
  if (ledger.flagged_above_floor + ledger.flagged_versioned + ledger.flagged_product + ledger.flagged_exchange !== flagged) {
    throw new Error('flagged ledger does not add up');
  }
  if (ledger.live_comparables + ledger.live_no_mcap + ledger.live_dead_mcap + ledger.live_exchanges !== live) {
    throw new Error('live ledger does not add up');
  }
  if (ledger.watchlist !== snapshot.watchlist.length) {
    throw new Error(`watchlist coverage is ${ledger.watchlist}, expected ${snapshot.watchlist.length}`);
  }

  // ---- multiples from the full comparable set.
  const set = multiplesFrom(tradingComparables);
  const global = set.global;

  // ---- live share per category, for the odds features.
  const liveShareByCategory = new Map<string, { live: number; total: number }>();
  for (const p of snapshot.protocols) {
    const key = p.category ?? 'Uncategorised';
    const entry = liveShareByCategory.get(key) ?? { live: 0, total: 0 };
    entry.total++;
    if (hasToken(p)) entry.live++;
    liveShareByCategory.set(key, entry);
  }

  // ---- token odds: fit on all 758, and cross-validate the AUC.
  const allAges = snapshot.protocols.map((p) => ageDays(p.listed_at, asOf));
  const allX = snapshot.protocols.map((p, i) => oddsFeatures(p, allAges[i]!, liveShareByCategory));
  const allY = snapshot.protocols.map((p) => (hasToken(p) ? 1 : 0));
  const { rows: stdX, means, stds } = standardise(allX, null, null);
  const fit = fitLogistic(stdX, allY, 1500, 0.5, 0.1);
  const oddsAuc = crossValidateOdds(snapshot.protocols, asOf, liveShareByCategory);
  const oddsModel: OddsModel = {
    features: ODDS_FEATURES,
    coefficients: fit.weights.map((w) => round3(w)),
    intercept: round3(fit.intercept),
    means: means.map((m) => round3(m)),
    stds: stds.map((s) => round3(s)),
    auc_cv: oddsAuc,
    trained_on: total,
    positives: allY.reduce((s, y) => s + y, 0),
    negatives: allY.reduce((s, y) => s + (1 - y), 0),
  };

  // ---- held-out validation of the value terms.
  const variants = crossValidateValue(tradingComparables, bySlug, asOf);
  const validation: Validation = {
    folds: 5,
    comparables: tradingComparables.length,
    variants,
    odds_auc: oddsAuc,
    odds_positives: oddsModel.positives,
    odds_negatives: oddsModel.negatives,
  };

  // ---- rows: one per protocol in the snapshot, ranked by implied value.
  const medianTvl = median(snapshot.protocols.map((p) => p.tvl_usd));
  const unsorted: BoardRow[] = snapshot.protocols.map((p, idx) => {
    const category = p.category ?? 'Uncategorised';
    const cm = multipleFor(category, set);
    const age = allAges[idx]!;
    const m = multipliers(p, age);
    const t = applyTerms(m.growth, m.maturity, m.breadth, ACTIVE_TERMS);
    const base = p.tvl_usd * cm.multiple;
    const value = impliedValue(p.tvl_usd, cm.multiple, t.growth, t.maturity, t.breadth);
    const isLive = hasToken(p);
    const flag = isLive ? null : flagReason(p, floor, watchlist);

    let tokenOdds: number | null = null;
    let oddsNote: string | null = null;
    if (!isLive) {
      const raw = predictLogistic([stdX[idx]!], fit.weights, fit.intercept)[0]!;
      tokenOdds = round3(raw);
      const contributions = ODDS_FEATURE_SHORT.map((name, j) => ({
        name,
        value: fit.weights[j]! * stdX[idx]![j]!,
      }));
      const up = contributions.filter((c) => c.value > 0.05).sort((a, b) => b.value - a.value)[0];
      const down = contributions.filter((c) => c.value < -0.05).sort((a, b) => a.value - b.value)[0];
      const parts: string[] = [];
      if (up !== undefined) parts.push(`${up.name} lifts the odds`);
      if (down !== undefined) parts.push(`${down.name} pulls them down`);
      oddsNote = parts.length > 0 ? parts.join('; ') + '.' : null;
    }

    let farmSteps: string[] = [];
    let farmTotal: FarmTotal = { cost_usd: 0, weeks: 0, capital_usd: 0, minutes: 0 };
    let farmEconomicsValue: FarmEconomics | null = null;
    if (!isLive) {
      const capital = capitalTier(p.tvl_usd);
      const hold = holdDays(age);
      const weeks = Math.round(hold / 7);
      const gas = 3 + 2 + 2 * weeks + 2;
      const minutes = 10 + 15 + 10 * weeks + 20 + 10 + 5 * weeks;
      farmEconomicsValue = farmEconomics(capital, gas, minutes, cm.multiple, t.growth, t.maturity, t.breadth);
      const plan = farmPlan(p, age, farmEconomicsValue);
      farmSteps = plan.steps;
      farmTotal = plan.total;
    }

    const row: BoardRow = {
      slug: p.slug,
      name: p.name,
      rank: null,
      census_rank: 0,
      status: isLive ? 'live' : flag === null ? 'pretoken' : 'pretoken-flagged',
      flag_reason: flag === null ? null : FLAG_TEXT[flag]!,
      implied_value_usd: value,
      actual_mcap_usd: isLive ? (p.mcap_usd ?? null) : null,
      model_vs_market: isLive && p.mcap_usd !== null && p.mcap_usd > 0 ? round3(value / p.mcap_usd) : null,
      category,
      multiple: cm.multiple,
      multiple_source: cm.source,
      comparables_count: cm.count,
      base_value_usd: Math.round(base),
      growth_multiplier: t.growth,
      maturity_multiplier: t.maturity,
      breadth_multiplier: t.breadth,
      tvl_usd: p.tvl_usd,
      change_7d: p.change_7d,
      age_days: age,
      listed_at: p.listed_at,
      newly_tracked: age >= 0 && age <= 90,
      watchlist: watchlist.has(p.slug),
      chain_count: p.chains.length,
      chains: [...p.chains],
      rank_range: null,
      drivers: [],
      token_odds: tokenOdds,
      odds_note: oddsNote,
      farm_steps: farmSteps,
      farm_total: farmTotal,
      farm_economics: farmEconomicsValue,
    };
    row.drivers = drivers(p, row, medianTvl, global.multiple);
    return row;
  });

  // One board, two ranks. The rows stay in census order: implied value,
  // ties broken by TVL then slug, so the order is stable. census_rank is
  // the position among all 758; rank is the launch rank among the clean
  // pre-token rows only, so the #1 launch candidate is rank 1 even when
  // already-trading giants and flagged products sit above it in the
  // census. Flagged and live rows carry no launch rank: the flag text
  // says they are not standalone launches, and ranking them as launches
  // would contradict it.
  unsorted.sort((a, b) => b.implied_value_usd - a.implied_value_usd || b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : 1));
  unsorted.forEach((r, i) => {
    r.census_rank = i + 1;
  });
  let launchRank = 0;
  for (const r of unsorted) {
    if (r.status === 'pretoken') r.rank = ++launchRank;
  }

  // Rank range: for a clean pre-token row, the launch ranks the quartile
  // values would occupy among the clean pre-token rows. Other rows carry
  // no launch rank range.
  const rankOfPre = (v: number): number =>
    1 + unsorted.filter((r) => r.status === 'pretoken' && r.implied_value_usd > v).length;
  for (const r of unsorted) {
    if (r.status !== 'pretoken') {
      r.rank_range = null;
      continue;
    }
    const p = bySlug.get(r.slug)!;
    const cm = multipleFor(r.category, set);
    const m = multipliers(p, r.age_days);
    const t = applyTerms(m.growth, m.maturity, m.breadth, ACTIVE_TERMS);
    const hi = impliedValue(p.tvl_usd, cm.q3, t.growth, t.maturity, t.breadth);
    const lo = impliedValue(p.tvl_usd, cm.q1, t.growth, t.maturity, t.breadth);
    const a = rankOfPre(hi);
    const b = rankOfPre(lo);
    r.rank_range = [Math.min(a, b), Math.max(a, b)];
  }

  // ---- category table: every category the rows use, plus the global row.
  const usedCategories = [...new Set(unsorted.map((r) => r.category))].sort();
  const categories: CategoryStat[] = usedCategories.map((category) => {
    const cm = multipleFor(category, set);
    const list = tradingComparables.filter((c) => c.category === category);
    const ratios = list.map((c) => c.ratio);
    return {
      category,
      multiple: cm.multiple,
      multiple_source: cm.source,
      comparables: list.length,
      q1: ratios.length > 0 ? clamp(quantile(ratios, 0.25), 0.05, 1.5) : global.q1,
      median: ratios.length > 0 ? clamp(median(ratios), 0.05, 1.5) : global.median,
      q3: ratios.length > 0 ? clamp(quantile(ratios, 0.75), 0.05, 1.5) : global.q3,
    };
  });

  const comparablesByCategory: Record<string, Comparable[]> = {};
  const byCat = new Map<string, Comparable[]>();
  for (const c of tradingComparables) {
    const list = byCat.get(c.category) ?? [];
    list.push(c);
    byCat.set(c.category, list);
  }
  for (const list of byCat.values()) list.sort((a, b) => b.ratio - a.ratio);
  for (const [category, list] of [...byCat.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    comparablesByCategory[category] = list;
  }

  const liveTokens = [...tradingComparables].sort((a, b) => b.mcap_usd - a.mcap_usd);

  return {
    as_of: asOf,
    model: 'radar-7',
    floor_usd: floor,
    counts: {
      ranked: unsorted.length,
      watchlist: ledger.watchlist,
      early,
      pretoken,
      flagged,
      live,
      newly_tracked: newlyTracked,
      comparables: tradingComparables.length,
      total,
    },
    ledger,
    global,
    categories,
    comparables_by_category: comparablesByCategory,
    live_tokens: liveTokens,
    validation,
    odds_model: oddsModel,
    integrity: null,
    rows: unsorted,
  };
}
