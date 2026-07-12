import assert from 'node:assert/strict';
import { adapters } from './adapters.mjs';
import { colorNames, nestedPlainText, sampleText, stackedPlainText } from './fixtures.mjs';
import { hasAnsi, stripAnsi } from './strip.mjs';

function validateOutput(adapterName, workload, output, expectedText) {
  assert.equal(typeof output, 'string', `${adapterName} ${workload} must return a primitive string`);
  assert.ok(hasAnsi(output), `${adapterName} ${workload} did not emit ANSI styling`);
  assert.equal(stripAnsi(output), expectedText, `${adapterName} ${workload} changed the plain text`);
}

export function validateAdapters() {
  for (const adapter of adapters) {
    for (const color of colorNames) {
      validateOutput(adapter.name, `color:${color}`, adapter.color(color, sampleText), sampleText);
    }
    validateOutput(adapter.name, 'stacked', adapter.stacked(stackedPlainText), stackedPlainText);
    validateOutput(adapter.name, 'nested', adapter.nested(), nestedPlainText);
  }
}
