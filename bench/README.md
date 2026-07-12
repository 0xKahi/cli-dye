# Dye benchmarks

This independent package provides a rough local performance comparison between:

- `@0xkahi/cli-dye`
- `chalk`
- `kleur`
- `kleur/colors`
- `ansi-colors`

Benchmark dependencies live only in `bench/package.json`. They are not development or runtime dependencies of Dye.

## Requirements

The scripts intentionally require exactly **Node.js v24.14.0**. They exit before measurement under another version.

Dye is loaded through its normal package export from `dist/index.js`, so build the root package before installing or running benchmarks.

## Setup

From the repository root:

```sh
npm run build
cd bench
npm install
```

Commit and use `bench/package-lock.json` to reproduce the selected dependency versions. When Dye's built output changes, rebuild at the root and rerun `npm install` in `bench` so the local file dependency is refreshed.

## Commands

From `bench/`:

```sh
npm run validate
npm run bench:load
npm run bench:performance
npm run bench
```

`npm run bench` validates adapters and then runs both benchmark groups.

## Measurements

### Load time

The load benchmark starts a fresh Node process for every sample so module caches are not reused. It runs warm-up rounds followed by 30 measured samples per target and reports:

- median process-to-import time,
- an empty Node-process control, and
- a rough adjusted estimate obtained by subtracting the control median.

Process creation, filesystem caching, machine load, and scheduling still affect these numbers. An adjusted result is not a pure measurement of JavaScript module initialization.

### Formatting throughput

Tinybench warms and repeatedly measures three representative operations:

1. applying the nine shared foreground colors to the same text,
2. constructing and rendering red + bold + underline + italic styling, and
3. rendering a deterministic outer-red message containing nested color segments.

Every adapter uses its library's idiomatic public API. ANSI output is forced on, outputs are consumed during timing, and primitive-string, ANSI-presence, and stripped-text checks run before measurement.

## Interpreting results

These results are a **rough gauge**, not a universal ranking. The libraries expose different APIs and perform different internal work even when their visible operation is equivalent. Results vary with CPU, operating system, thermal state, background activity, Node version, and package version.

Compare runs made on the same machine under similar conditions. Keep the printed Node, platform, architecture, sample counts, throughput, and variability information when sharing results.
