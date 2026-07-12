# Performance optimization validation

## Environment

- Node.js: v24.14.0
- Platform: darwin arm64
- Benchmark settings: 5 load warm-ups, 30 fresh-process samples per target; Tinybench 250 ms warm-up and 1000 ms measurement per task

## Pre-change baseline

Captured before implementation on 2026-07-12. Values below are Dye's reported median throughput and adjusted module-load estimates.

| Run | Adjusted load (ms) | Shared colors (ops/s) | Construct + render (ops/s) | Nested colors (ops/s) | Output checksum |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1.530 | 134,825 | 320,000 | 191,975 | 3,831,063,086 |
| 2 | 1.672 | 131,874 | 315,756 | 186,047 | 3,761,051,795 |
| 3 | 1.502 | 137,137 | 324,254 | 192,012 | 3,893,681,831 |
| **Median** | **1.530** | **134,825** | **320,000** | **191,975** | — |

Acceptance thresholds derived from this baseline:

- Shared colors: at least 674,125 ops/s
- Construct + render: at least 1,600,000 ops/s
- Nested colors: at least 959,875 ops/s
- Adjusted load regression threshold: at most 1.836 ms

## Material benchmark changes

The optimized revision adds focused immediate-formatting, style-construction, reusable-rendering, and nested-restoration workloads. The three original workload implementations and Tinybench timing settings remain unchanged. Adapter validation was expanded for the new workloads; validation remains outside timed loops.

## Post-change results

Captured after implementation and compatibility validation on 2026-07-12.

| Run | Adjusted load (ms) | Shared colors (ops/s) | Construct + render (ops/s) | Nested colors (ops/s) | Output checksum |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1.606 | 4,000,000 | 2,000,000 | 2,178,649 | 2,441,733,452 |
| 2 | 1.734 | 4,000,000 | 2,000,000 | 2,178,649 | 2,274,670,290 |
| 3 | 1.823 | 4,000,000 | 2,000,000 | 2,183,406 | 2,556,562,585 |
| **Median** | **1.734** | **4,000,000** | **2,000,000** | **2,178,649** | — |

## Acceptance summary

| Measure | Baseline median | Optimized median | Result |
| --- | ---: | ---: | --- |
| Shared colors | 134,825 ops/s | 4,000,000 ops/s | 29.67×, pass |
| Construct + render | 320,000 ops/s | 2,000,000 ops/s | 6.25×, pass |
| Nested colors | 191,975 ops/s | 2,178,649 ops/s | 11.35×, pass |
| Adjusted load | 1.530 ms | 1.734 ms | 13.33% increase, pass |

All original formatting workloads exceed the required fivefold improvement. Adjusted module loading remains below the 1.836 ms regression threshold.

A focused V8 CPU profile over 10 million immediate named-color calls sampled Dye in `renderImmediate` and the enabled-state getter only; builder construction and nested-repair functions were absent from the plain immediate hot path.
