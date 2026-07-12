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

Tinybench warms and repeatedly measures representative end-to-end operations:

1. applying the nine shared foreground colors to the same text,
2. constructing and rendering red + bold + underline + italic styling, and
3. rendering a deterministic outer-red message containing nested color segments.

Focused workloads additionally isolate immediate foreground formatting, style construction, rendering through a preconstructed reusable style, and restoration after a relevant nested ANSI close. Style-construction and reusable-style workloads include only libraries with builder APIs; functional-only adapters remain in applicable workloads.

Every adapter uses its library's idiomatic public API. ANSI output is forced on, outputs are consumed during timing, and primitive-string, ANSI-presence, callable-builder, and stripped-text checks run before measurement.

## Interpreting results

These results are a **rough gauge**, not a universal ranking. The libraries expose different APIs and perform different internal work even when their visible operation is equivalent. Results vary with CPU, operating system, thermal state, background activity, Node version, and package version.

Compare runs made on the same machine under similar conditions. Keep the printed Node, platform, architecture, sample counts, throughput, output checksum, and variability information when sharing results.

## Optimization validation procedure

1. Use Node.js v24.14.0 on the same otherwise-idle machine for both revisions.
2. Build and refresh the benchmark's local Dye dependency for the baseline revision.
3. Run adapter validation, then capture at least three complete load and performance runs.
4. Repeat the build, dependency refresh, validation, and at least three complete runs for the optimized revision.
5. For each workload and revision, take the median of the three reported median-throughput values. Take the median of the three adjusted Dye load values separately.
6. Confirm each original formatting workload improves by at least five times. Flag adjusted module loading if the optimized median exceeds the baseline median by more than 20 percent.
7. Preserve environment metadata and output checksums, and disclose code, fixture, adapter, dependency, or benchmark-setting changes that could materially affect comparison.

Do not compare results gathered across different machines or Node.js versions. A negative adjusted load result is measurement noise around process startup and must not be interpreted as zero-cost loading. Project validation records are kept in `results.md`.
