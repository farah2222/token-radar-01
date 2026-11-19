# token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/farah2222/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/farah2222/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar (radar-6) ranks 178 pre-token protocols from a frozen DefiLlama snapshot (2026-11-14) by an implied value: TVL times the median market-cap/TVL multiple of live-token protocols in the same category, adjusted for 7-day growth, track-record age and chain breadth. It covers all 40 watchlist protocols plus 138 smaller early-discovery protocols below the $50M floor, flags 26 newly tracked ones, gives every row a 7-step farm plan with costs and times, and a likely rank range from the comparables' own spread. The dashboard is a sortable, filterable board with a detail view per protocol, the full category-multiple table, and a coverage ledger accounting for all 758 protocols in the snapshot. Built for the make.fun “Build the best token launch radar” bounty — https://make.fun/bounty/token-radar-01 — referral code 03swhpzc.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

Node 22, standard library only, no network. `main.ts` reads the snapshot, builds the board, and writes `out/board.json`, `out/data.js`, `out/dashboard/`, `out/screenshots/` and `out/dossier.json`. Two runs write byte-identical bytes.

## Decisions the brief left open

- **Versioned names.** A name is versioned when it ends in a space followed by a version marker: V/v plus digits (V2, v3, V12, V2.0) or a bare numeric version (2.0, 3.0). So "Rysk V12" is versioned and set aside, while "CommunityV3" (no space before V3) and "Project 0" (a bare 0 is not a version marker) stay on the board.
- **Exchanges first.** The 14 exchanges are set aside from the trading protocols before the comparables are counted, so the 119 comparables are live-token protocols with a positive market cap that are not exchanges; the ledger's 269 / 14 / 14 split follows from that order.
- **Quartiles.** The 25th and 75th percentiles use linear interpolation on the sorted multiples (the same method as the median), and each quartile multiple is clamped to 0.05–1.50 like the median. A quartile value's rank is 1 + the number of board rows with a strictly greater implied value.
- **Drivers.** Each row's three drivers are the factors with the largest absolute log-distance from their neutral value: TVL and the multiple against the board medians, the three multipliers against 1.
- **Farm totals.** Each step states its own gas cost and time; the farm total sums them ($3 setup + $2 first action + $2 per weekly repeat + $2 second feature) over W weeks, where W = round(hold days / 7). The position capital ($50–$250 by TVL tier) is deployed capital, shown separately as recoverable on exit.
- **"Records no token".** The board only ever claims a protocol records no token in the snapshot; the record is not proof that no token exists.
---

<sub>Entered on [make.fun](https://make.fun/?ref=03swhpzc&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
