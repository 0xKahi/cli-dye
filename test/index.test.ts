import { afterEach, describe, expect, test } from 'bun:test';
import { dye } from '../src/index.ts';

const esc = '\x1b[';

afterEach(() => dye.setEnabled(undefined));

describe('modifiers and builders', () => {
  test('supports immediate modifiers and primitive output', () => {
    dye.setEnabled(true);
    const result = dye.bold('text');
    expect(typeof result).toBe('string');
    expect(result).toBe(`${esc}1mtext${esc}22m`);
  });

  test('chains, reuses, and deduplicates modifiers', () => {
    dye.setEnabled(true);
    const style = dye.bold().italic().bold();
    expect(style('one')).toBe(`${esc}1m${esc}3mone${esc}23m${esc}22m`);
    expect(style('two')).toBe(`${esc}1m${esc}3mtwo${esc}23m${esc}22m`);
  });

  test('retains bold and dim despite their shared close code', () => {
    dye.setEnabled(true);
    expect(dye.bold().dim('text')).toBe(`${esc}1m${esc}2mtext${esc}22m${esc}22m`);
  });

  test('restores all outer blocks after a nested shared close', () => {
    dye.setEnabled(true);
    const inner = dye.bold('inner');
    const result = dye.bold().dim(`before ${inner} after`);
    expect(result).toContain(`${esc}22m${esc}1m${esc}2m after`);
  });
});

describe('colors', () => {
  test('renders named and bright foreground/background colors', () => {
    dye.setEnabled(true);
    expect(dye.colorize('text', { fg: 'brightRed', bg: 'blue' })).toBe(`${esc}91m${esc}44mtext${esc}49m${esc}39m`);
    expect(dye.colorize('text', { fg: 'gray', bg: 'brightWhite' })).toBe(`${esc}90m${esc}107mtext${esc}49m${esc}39m`);
  });

  test('normalizes short and full hex and emits truecolor', () => {
    dye.setEnabled(true);
    const short = dye.hex('#f06');
    const full = dye.hex('#ED7892');
    expect([short.r, short.g, short.b]).toEqual([255, 0, 102]);
    expect([full.r, full.g, full.b]).toEqual([237, 120, 146]);
    expect(dye.colorize('text', { fg: dye.hex('#f06'), bg: dye.hex('#00f') })).toBe(`${esc}38;2;255;0;102m${esc}48;2;0;0;255mtext${esc}49m${esc}39m`);
  });

  test('rejects unsupported hex forms', () => {
    for (const value of ['f06', '#ggg', '#1234', '#11223344', '#12']) expect(() => dye.hex(value)).toThrow(TypeError);
  });

  test('supports reusable color and modifier builders', () => {
    dye.setEnabled(true);
    const style = dye.colorize({ fg: 'red', bg: 'blue' }).bold().underline();
    expect(style('text')).toBe(`${esc}31m${esc}44m${esc}1m${esc}4mtext${esc}24m${esc}22m${esc}49m${esc}39m`);
  });

  test('does nothing when no colors are selected', () => {
    dye.setEnabled(true);
    expect(dye.colorize('text')).toBe('text');
  });
});

describe('output control and stripping', () => {
  test('forces output on and off and restores the captured automatic value', () => {
    const automatic = dye.enabled;
    dye.setEnabled(true);
    expect(dye.enabled).toBe(true);
    expect(dye.bold('text')).toContain(esc);
    dye.setEnabled(false);
    expect(dye.enabled).toBe(false);
    expect(dye.bold('text')).toBe('text');
    dye.setEnabled(undefined);
    expect(dye.enabled).toBe(automatic);
  });

  test('strips dye and general CSI sequences while preserving text', () => {
    dye.setEnabled(true);
    expect(dye.strip(dye.bold('text'))).toBe('text');
    expect(dye.strip(`a${esc}2K${esc}31mb${esc}0m`)).toBe('ab');
    expect(dye.strip('plain')).toBe('plain');
  });
});
