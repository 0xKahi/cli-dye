import { Bench } from 'tinybench';
import { adapters } from './adapters.mjs';
import { assertRuntime, printEnvironment } from './environment.mjs';
import { colorNames, sampleText, stackedPlainText } from './fixtures.mjs';
import { validateAdapters } from './validation.mjs';

assertRuntime();
printEnvironment('Formatting throughput benchmark');
validateAdapters();

let sink = 0;

function consume(value) {
  sink = (sink + value.length) >>> 0;
}

function consumeStyle(value) {
  sink = (sink + (typeof value === 'function' ? 1 : 0)) >>> 0;
}

const workloads = [
  {
    name: 'Shared foreground colors (9 outputs/op)',
    run(adapter) {
      for (const color of colorNames) consume(adapter.color(color, sampleText));
    },
  },
  {
    name: 'Construct and render stacked style (1 output/op)',
    run(adapter) {
      consume(adapter.stacked(stackedPlainText));
    },
  },
  {
    name: 'Nested colors (1 fixture/op)',
    run(adapter) {
      consume(adapter.nested());
    },
  },
  {
    name: 'Immediate foreground formatting (1 output/op)',
    run(adapter) {
      consume(adapter.color('red', sampleText));
    },
  },
  {
    name: 'Style construction only (1 builder/op)',
    supports: adapter => adapter.construct !== undefined,
    run(adapter) {
      consumeStyle(adapter.construct());
    },
  },
  {
    name: 'Reusable stacked style (1 output/op)',
    supports: adapter => adapter.reusable !== undefined,
    run(adapter) {
      consume(adapter.reusable(stackedPlainText));
    },
  },
  {
    name: 'Nested restoration (1 output/op)',
    run(adapter) {
      consume(adapter.nestedRestoration());
    },
  },
];

for (const workload of workloads) {
  console.log(`\n## ${workload.name}`);
  const bench = new Bench({ warmupTime: 250, time: 1000 });
  for (const adapter of adapters) {
    if (workload.supports?.(adapter) ?? true) bench.add(adapter.name, () => workload.run(adapter));
  }
  await bench.run();
  console.table(bench.table());
}

console.log(`Output checksum: ${sink}`);
console.log('Higher throughput is better. Results are a rough gauge for this machine and workload.');
