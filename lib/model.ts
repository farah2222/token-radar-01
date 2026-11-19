// Token Radar radar-6 — the pure value model.
//
// Everything here is computed from the snapshot at run time. No protocol
// name is hardcoded anywhere in the model: the board, the multiples, the
// ledger and the farm plans all follow from the snapshot's own figures.

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

export interface BoardRow {
  slug: string;
  name: string;
  rank: number;
  implied_value_usd: number;
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
  rank_range: [number, number];
  drivers: string[];
  farm_steps: string[];
  farm_total: FarmTotal;
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

export interface Ledger {
  total: number;
  ranked: number;
  watchlist: number;
  early: number;
  above_floor_off_watchlist: number;
  pretoken_excluded: number;
  already_trading: number;
  trading_comparables: number;
  trading_no_mcap: number;
  trading_dead_mcap: number;
  trading_exchanges: number;
  newly_tracked: number;
}

export interface RadarData {
  as_of: string;
  model: string;
  floor_usd: number;
  counts: { ranked: number; watchlist: number; early: number; newly_tracked: number; comparables: number; total: number };
  ledger: Ledger;
  global: { multiple: number; q1: number; median: number; q3: number; comparables: number };
  categories: CategoryStat[];
  comparables_by_category: Record<string, Comparable[]>;
  live_tokens: Comparable[];
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

/** A pre-token product set aside: wrapped / staked / bridged / versioned / exchange. */
function isExcludedProduct(p: SnapshotProtocol): boolean {
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return true;
  if (wholeWord(p.name, 'wrapped') || wholeWord(p.name, 'staked') || wholeWord(p.name, 'staking')) return true;
  const first = p.name.split(/\s+/)[0];
  if (first !== undefined && EXCHANGE_NAMES.has(first)) return true;
  return false;
}

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

/** 7 steps, each 20-600 characters once trimmed. Costs and times are stated in the text. */
export function farmPlan(p: SnapshotProtocol, age: number): { steps: string[]; total: FarmTotal } {
  const capital = capitalTier(p.tvl_usd);
  const hold = holdDays(age);
  const weeks = Math.round(hold / 7); // 30 -> 4, 45 -> 6, 60 -> 9
  const verb = STEP2_VERBS[p.category ?? ''] ?? 'Use its main feature';
  const chainCount = p.chains.length;
  const secondChain = chainCount > 1 ? p.chains[1] : null;
  const secondFeature =
    secondChain !== null
      ? `use ${p.name} on a second chain (${secondChain}) as well, with a small $${capital} position, to show breadth across chains`
      : `try a second feature of ${p.name} (${STEP4_SECOND_FEATURE[p.category ?? ''] ?? 'explore a second feature in the app'}), to show breadth beyond the first action`;
  const steps = [
    `Set up a fresh wallet for this farm and fund it with a little gas money, about $2-5 (count $3). Allow about 10 minutes.`,
    `${verb} on ${p.name} once, with $${capital} — one real use of its main feature, exactly as a regular user would. About $2 in gas, about 15 minutes.`,
    `Repeat the same qualifying action once a week for ${weeks} weeks, keeping each action around $${capital} so the pattern stays consistent. About $2 in gas each week, about 10 minutes each week.`,
    `Then ${secondFeature}. About $2 in gas, about 20 minutes.`,
    `Hold the position for ${hold} days without withdrawing, so the farm shows a real, lasting position rather than a quick in-and-out. No cost, ${hold} days.`,
    `Safety: verify every link from ${p.name}'s official site only, never sign a blind approval, and never pay anyone for a "guaranteed" allocation. About 10 minutes, no cost.`,
    `Keep a log of every transaction hash and date, and watch ${p.name}'s official app for claim announcements. About 5 minutes a week, no cost.`,
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

// ------------------------------------------------------------------ model

function impliedValue(tvl: number, multiple: number, growth: number, maturity: number, breadth: number): number {
  return Math.max(1, Math.round(tvl * multiple * growth * maturity * breadth));
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

// ------------------------------------------------------------------- build

export function buildRadar(snapshot: Snapshot): RadarData {
  const asOf = snapshot.as_of;
  const floor = snapshot.floor_usd;
  const watchlist = new Set(snapshot.watchlist);

  // ---- split the 758 protocols; the ledger must add up, or the run throws.
  const ranked: SnapshotProtocol[] = [];
  const aboveFloorOff: SnapshotProtocol[] = [];
  const pretokenExcluded: SnapshotProtocol[] = [];
  const tradingComparables: Comparable[] = [];
  let tradingNoMcap = 0;
  let tradingDeadMcap = 0;
  let tradingExchanges = 0;

  for (const p of snapshot.protocols) {
    if (!hasToken(p)) {
      if (watchlist.has(p.slug)) {
        ranked.push(p);
      } else if (VERSIONED_RE.test(p.name) || isExcludedProduct(p)) {
        pretokenExcluded.push(p);
      } else if (p.tvl_usd < floor) {
        ranked.push(p);
      } else {
        aboveFloorOff.push(p);
      }
      continue;
    }
    if (isExchange(p)) {
      tradingExchanges++;
    } else if (p.mcap_usd === null) {
      tradingNoMcap++;
    } else if (p.mcap_usd <= 0) {
      tradingDeadMcap++;
    } else {
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
  const alreadyTrading = tradingComparables.length + tradingNoMcap + tradingDeadMcap + tradingExchanges;
  const ledger: Ledger = {
    total,
    ranked: ranked.length,
    watchlist: ranked.filter((p) => watchlist.has(p.slug)).length,
    early: ranked.filter((p) => !watchlist.has(p.slug)).length,
    above_floor_off_watchlist: aboveFloorOff.length,
    pretoken_excluded: pretokenExcluded.length,
    already_trading: alreadyTrading,
    trading_comparables: tradingComparables.length,
    trading_no_mcap: tradingNoMcap,
    trading_dead_mcap: tradingDeadMcap,
    trading_exchanges: tradingExchanges,
    newly_tracked: ranked.filter((p) => {
      const age = ageDays(p.listed_at, asOf);
      return age >= 0 && age <= 90;
    }).length,
  };
  const ledgerSum =
    ledger.ranked + ledger.above_floor_off_watchlist + ledger.pretoken_excluded + ledger.already_trading;
  if (ledgerSum !== total) {
    throw new Error(`coverage ledger does not add up: ${ledgerSum} != ${total}`);
  }

  // ---- comparables: median / quartiles per category and globally.
  const globalRatios = tradingComparables.map((c) => c.ratio);
  const globalMultipleRaw = median(globalRatios);
  const global = {
    multiple: clamp(globalMultipleRaw, 0.05, 1.5),
    q1: clamp(quantile(globalRatios, 0.25), 0.05, 1.5),
    median: clamp(globalMultipleRaw, 0.05, 1.5),
    q3: clamp(quantile(globalRatios, 0.75), 0.05, 1.5),
    comparables: tradingComparables.length,
  };

  const byCategory = new Map<string, Comparable[]>();
  for (const c of tradingComparables) {
    const list = byCategory.get(c.category) ?? [];
    list.push(c);
    byCategory.set(c.category, list);
  }
  for (const list of byCategory.values()) list.sort((a, b) => b.ratio - a.ratio);

  const categoryMultiple = (category: string): { multiple: number; source: 'category' | 'global'; count: number; q1: number; q3: number } => {
    const list = byCategory.get(category) ?? [];
    if (list.length >= 3) {
      const ratios = list.map((c) => c.ratio);
      return {
        multiple: clamp(median(ratios), 0.05, 1.5),
        source: 'category',
        count: list.length,
        q1: clamp(quantile(ratios, 0.25), 0.05, 1.5),
        q3: clamp(quantile(ratios, 0.75), 0.05, 1.5),
      };
    }
    return { multiple: global.multiple, source: 'global', count: list.length, q1: global.q1, q3: global.q3 };
  };

  // ---- rows: value, multipliers, farm plan; then rank.
  const medianTvl = median(ranked.map((p) => p.tvl_usd));
  const unsorted: BoardRow[] = ranked.map((p) => {
    const category = p.category ?? 'Uncategorised';
    const cm = categoryMultiple(category);
    const change = p.change_7d ?? 0;
    const growth = 1 + (clamp(change, -60, 120) / 100) * 0.5;
    const age = ageDays(p.listed_at, asOf);
    const maturity = 0.6 + (Math.min(age, 1095) / 1095) * 0.4;
    const breadth = 1 + 0.04 * Math.min(Math.max(p.chains.length - 1, 0), 5);
    const base = p.tvl_usd * cm.multiple;
    const value = impliedValue(p.tvl_usd, cm.multiple, growth, maturity, breadth);
    const { steps, total: farmTotal } = farmPlan(p, age);
    const row: BoardRow = {
      slug: p.slug,
      name: p.name,
      rank: 0,
      implied_value_usd: value,
      category,
      multiple: cm.multiple,
      multiple_source: cm.source,
      comparables_count: cm.count,
      base_value_usd: Math.round(base),
      growth_multiplier: growth,
      maturity_multiplier: maturity,
      breadth_multiplier: breadth,
      tvl_usd: p.tvl_usd,
      change_7d: p.change_7d,
      age_days: age,
      listed_at: p.listed_at,
      newly_tracked: age >= 0 && age <= 90,
      watchlist: watchlist.has(p.slug),
      chain_count: p.chains.length,
      chains: [...p.chains],
      rank_range: [0, 0],
      drivers: [],
      farm_steps: steps,
      farm_total: farmTotal,
    };
    row.drivers = drivers(p, row, medianTvl, global.multiple);
    return row;
  });

  // Rank by implied value, ties broken by TVL then slug so the order is stable.
  unsorted.sort((a, b) => b.implied_value_usd - a.implied_value_usd || b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : 1));
  unsorted.forEach((r, i) => {
    r.rank = i + 1;
  });

  // Rank range: the ranks the quartile values would occupy on the finished board.
  const rankOf = (v: number): number => 1 + unsorted.filter((r) => r.implied_value_usd > v).length;
  for (const r of unsorted) {
    const p = ranked.find((x) => x.slug === r.slug)!;
    const cm = categoryMultiple(r.category);
    const change = p.change_7d ?? 0;
    const growth = 1 + (clamp(change, -60, 120) / 100) * 0.5;
    const maturity = 0.6 + (Math.min(r.age_days, 1095) / 1095) * 0.4;
    const breadth = 1 + 0.04 * Math.min(Math.max(r.chain_count - 1, 0), 5);
    const hi = impliedValue(p.tvl_usd, cm.q3, growth, maturity, breadth);
    const lo = impliedValue(p.tvl_usd, cm.q1, growth, maturity, breadth);
    const a = rankOf(hi);
    const b = rankOf(lo);
    r.rank_range = [Math.min(a, b), Math.max(a, b)];
  }

  // ---- category table: every category the ranked rows use, plus the global row.
  const usedCategories = [...new Set(unsorted.map((r) => r.category))].sort();
  const categories: CategoryStat[] = usedCategories.map((category) => {
    const cm = categoryMultiple(category);
    const list = byCategory.get(category) ?? [];
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
  for (const [category, list] of [...byCategory.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    comparablesByCategory[category] = list;
  }

  const liveTokens = [...tradingComparables].sort((a, b) => b.mcap_usd - a.mcap_usd);

  return {
    as_of: asOf,
    model: 'radar-6',
    floor_usd: floor,
    counts: {
      ranked: unsorted.length,
      watchlist: ledger.watchlist,
      early: ledger.early,
      newly_tracked: ledger.newly_tracked,
      comparables: tradingComparables.length,
      total,
    },
    ledger,
    global,
    categories,
    comparables_by_category: comparablesByCategory,
    live_tokens: liveTokens,
    rows: unsorted,
  };
}
