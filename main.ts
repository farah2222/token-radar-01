// Token Radar radar-6 — thin runner.
//
// Reads the sealed snapshot, builds the board with lib/model.ts, and writes
// the output directory: board.json, data.js, dashboard/, screenshots/ and
// dossier.json. Node 22, standard library only, no network.
//
// Usage:
//   node main.ts [--input <snapshot.json or dir>] [--output <dir>]
//   MAKEFUN_OUTPUT_DIR=<dir> node main.ts --input ../input/snapshot.json
//
// Two runs write byte-identical bytes: no timestamps, no random values, and
// every JSON object is written with its keys in sorted order.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-board.ts';
import { buildRadar } from './lib/model.ts';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const DOSSIER_MAX_BYTES = 1.5 * 1024 * 1024;

/** JSON with every object's keys in code-unit order: one spelling per value. */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`canonicalJson: ${value} is not a finite number`);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v)).join(',')}]`;
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`)
      .join(',')}}`;
  }
  throw new Error(`canonicalJson: a ${typeof value} has no JSON form`);
}

function parseArgs(argv: string[]): { input: string; output: string } {
  let input = '/input/snapshot.json';
  let output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input' && i + 1 < argv.length) input = argv[++i]!;
    else if (argv[i] === '--output' && i + 1 < argv.length) output = argv[++i]!;
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  return { input, output };
}

function main(): void {
  const { input, output } = parseArgs(process.argv.slice(2));

  const snapshotPath = statSync(input).isDirectory() ? join(input, 'snapshot.json') : input;
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
  const data = buildRadar(snapshot);

  // The board is 178 rows (40 watchlist + 138 early discovery). A different
  // count means a rule was applied differently: stop, do not ship it.
  if (data.rows.length !== 178) throw new Error(`board has ${data.rows.length} rows, expected 178`);
  for (const row of data.rows) {
    if (row.farm_steps.length !== 7) throw new Error(`row ${row.slug} has ${row.farm_steps.length} farm steps, expected 7`);
    for (const step of row.farm_steps) {
      const n = step.trim().length;
      if (n < 20 || n > 600) throw new Error(`row ${row.slug} farm step is ${n} characters, expected 20-600`);
    }
  }

  mkdirSync(output, { recursive: true });
  writeFileSync(join(output, 'board.json'), canonicalJson(data) + '\n');
  writeFileSync(join(output, 'data.js'), `window.TOKEN_RADAR_DATA = ${canonicalJson(data)};\n`);

  const dashboardSrc = join(REPO_ROOT, 'dashboard');
  const screenshotsSrc = join(REPO_ROOT, 'screenshots');
  if (!existsSync(dashboardSrc)) throw new Error('dashboard/ is missing from the repository');
  if (!existsSync(screenshotsSrc)) throw new Error('screenshots/ is missing from the repository');
  cpSync(dashboardSrc, join(output, 'dashboard'), { recursive: true });
  cpSync(screenshotsSrc, join(output, 'screenshots'), { recursive: true });

  // The dashboard the judge reads must fit whole in the 65,536-byte text cap.
  const dashBytes = readdirSync(dashboardSrc).reduce((n, f) => n + statSync(join(dashboardSrc, f)).size, 0);
  if (dashBytes > 65536) throw new Error(`dashboard source is ${dashBytes} bytes, over the 65,536-byte text cap`);

  const dossier = buildDossier(output, { text_max_bytes: 65536 });
  if (dossier.length > DOSSIER_MAX_BYTES) {
    throw new Error(`dossier is ${dossier.length} bytes, over the 1.5 MiB cap`);
  }
  writeFileSync(join(output, 'dossier.json'), dossier);

  console.log(
    `radar-6: ${data.rows.length} rows (${data.counts.watchlist} watchlist + ${data.counts.early} early), ` +
      `${data.counts.newly_tracked} newly tracked, ${data.counts.comparables} comparables, ` +
      `dossier ${dossier.length} bytes -> ${output}`,
  );
}

main();
