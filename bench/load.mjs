import { spawnSync } from 'node:child_process';
import { hrtime } from 'node:process';
import { assertRuntime, printEnvironment } from './environment.mjs';

assertRuntime();
printEnvironment('Fresh-process load benchmark');

const warmupRounds = 5;
const measuredRounds = 30;
const targets = [
  ['empty control', ''],
  ['dye', "await import('@0xkahi/cli-dye')"],
  ['chalk', "await import('chalk')"],
  ['kleur', "await import('kleur')"],
  ['kleur/colors', "await import('kleur/colors')"],
  ['ansi-colors', "await import('ansi-colors')"],
];

function runFreshProcess(source) {
  const start = hrtime.bigint();
  const child = spawnSync(process.execPath, ['--input-type=module', '--eval', source], {
    cwd: import.meta.dirname,
    env: { ...process.env, FORCE_COLOR: '1' },
    encoding: 'utf8',
  });
  const elapsedMs = Number(hrtime.bigint() - start) / 1e6;
  if (child.status !== 0) {
    throw new Error(`Fresh process failed:\n${child.stderr || child.stdout}`);
  }
  return elapsedMs;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

for (let round = 0; round < warmupRounds; round += 1) {
  for (const [, source] of targets) runFreshProcess(source);
}

const samples = new Map(targets.map(([name]) => [name, []]));
for (let round = 0; round < measuredRounds; round += 1) {
  // Rotate target order so a fixed position does not consistently benefit from round timing.
  const offset = round % targets.length;
  const ordered = [...targets.slice(offset), ...targets.slice(0, offset)];
  for (const [name, source] of ordered) samples.get(name).push(runFreshProcess(source));
}

const baseline = median(samples.get('empty control'));
const rows = targets.map(([name]) => {
  const raw = median(samples.get(name));
  return {
    library: name,
    'median raw (ms)': raw.toFixed(3),
    'adjusted (ms)': name === 'empty control' ? '—' : Math.max(0, raw - baseline).toFixed(3),
    samples: measuredRounds,
  };
});

console.log(`Warm-up rounds: ${warmupRounds}; measured fresh processes per target: ${measuredRounds}`);
console.table(rows);
console.log('Adjusted time subtracts the empty-process median and is only a rough module-load estimate.');
