const ESC = '\x1b[';
const ANSI_ESCAPE_REGEX = new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, 'g');
const HEX_REGEX = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;

declare const hexColorBrand: unique symbol;

export type StandardColor =
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'gray'
  | 'brightBlack'
  | 'brightRed'
  | 'brightGreen'
  | 'brightYellow'
  | 'brightBlue'
  | 'brightMagenta'
  | 'brightCyan'
  | 'brightWhite';

export interface HexColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly [hexColorBrand]: true;
}

export type DyeColor = StandardColor | HexColor;

export interface ColorizeOptions {
  readonly fg?: DyeColor;
  readonly bg?: DyeColor;
}

type ModifierName = 'reset' | 'bold' | 'dim' | 'italic' | 'underline' | 'inverse' | 'hidden' | 'strikethrough';
type StyleMethod = {
  (): DyeStyler;
  (text: string): string;
};

export interface DyeStyler {
  (text: string): string;
  readonly reset: StyleMethod;
  readonly bold: StyleMethod;
  readonly dim: StyleMethod;
  readonly italic: StyleMethod;
  readonly underline: StyleMethod;
  readonly inverse: StyleMethod;
  readonly hidden: StyleMethod;
  readonly strikethrough: StyleMethod;
}

interface AnsiBlock {
  readonly id: string;
  readonly open: string;
  readonly close: string;
}

const MODIFIERS: Record<ModifierName, AnsiBlock> = {
  reset: { id: 'reset', open: `${ESC}0m`, close: `${ESC}0m` },
  bold: { id: 'bold', open: `${ESC}1m`, close: `${ESC}22m` },
  dim: { id: 'dim', open: `${ESC}2m`, close: `${ESC}22m` },
  italic: { id: 'italic', open: `${ESC}3m`, close: `${ESC}23m` },
  underline: { id: 'underline', open: `${ESC}4m`, close: `${ESC}24m` },
  inverse: { id: 'inverse', open: `${ESC}7m`, close: `${ESC}27m` },
  hidden: { id: 'hidden', open: `${ESC}8m`, close: `${ESC}28m` },
  strikethrough: { id: 'strikethrough', open: `${ESC}9m`, close: `${ESC}29m` },
};

const COLOR_CODES: Record<StandardColor, number> = {
  black: 30,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37,
  gray: 90,
  brightBlack: 90,
  brightRed: 91,
  brightGreen: 92,
  brightYellow: 93,
  brightBlue: 94,
  brightMagenta: 95,
  brightCyan: 96,
  brightWhite: 97,
};

function detectColorSupport(): boolean {
  if (typeof process === 'undefined' || !process?.env) return false;
  const { env } = process;
  if ('NO_COLOR' in env || env.TERM === 'dumb') return false;
  if ('FORCE_COLOR' in env) return env.FORCE_COLOR !== '0';
  return Boolean(process.stdout?.isTTY);
}

const automaticEnabled = detectColorSupport();
let enabledOverride: boolean | undefined;

function colorBlock(color: DyeColor, background: boolean): AnsiBlock {
  const channel = background ? 'bg' : 'fg';
  const closeCode = background ? 49 : 39;
  if (typeof color === 'string') {
    const code = COLOR_CODES[color] + (background ? 10 : 0);
    return { id: channel, open: `${ESC}${code}m`, close: `${ESC}${closeCode}m` };
  }
  const prefix = background ? 48 : 38;
  return { id: channel, open: `${ESC}${prefix};2;${color.r};${color.g};${color.b}m`, close: `${ESC}${closeCode}m` };
}

function render(text: string, blocks: readonly AnsiBlock[]): string {
  if (!dye.enabled || blocks.length === 0) return text;
  let content = text;
  const closeSequences = new Set(blocks.map(block => block.close));
  for (const close of closeSequences) {
    const reopen = blocks
      .filter(block => block.close === close)
      .map(block => block.open)
      .join('');
    content = content.split(close).join(close + reopen);
  }
  return (
    blocks.map(block => block.open).join('') +
    content +
    [...blocks]
      .reverse()
      .map(block => block.close)
      .join('')
  );
}

function makeStyler(blocks: readonly AnsiBlock[]): DyeStyler {
  const styler = ((text: string) => render(text, blocks)) as DyeStyler;
  for (const name of Object.keys(MODIFIERS) as ModifierName[]) {
    const method = (text?: string): DyeStyler | string => {
      const block = MODIFIERS[name];
      const next = blocks.some(current => current.id === block.id) ? blocks : [...blocks, block];
      const nextStyler = makeStyler(next);
      return text === undefined ? nextStyler : nextStyler(text);
    };
    Object.defineProperty(styler, name, { value: method, enumerable: true });
  }
  return styler;
}

function makeColorStyler(options: ColorizeOptions): DyeStyler {
  const blocks: AnsiBlock[] = [];
  if (options.fg !== undefined) blocks.push(colorBlock(options.fg, false));
  if (options.bg !== undefined) blocks.push(colorBlock(options.bg, true));
  return makeStyler(blocks);
}

function hex(value: string): HexColor {
  if (!HEX_REGEX.test(value)) throw new TypeError(`Invalid hexadecimal color: ${value}`);
  const digits = value.slice(1);
  const normalized = digits.length === 3 ? [...digits].map(digit => digit + digit).join('') : digits;
  return Object.freeze({
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }) as HexColor;
}

interface DyeApi {
  readonly enabled: boolean;
  setEnabled(value: boolean | undefined): void;
  hex(value: string): HexColor;
  strip(text: string): string;
  colorize(options?: ColorizeOptions): DyeStyler;
  colorize(text: string, options?: ColorizeOptions): string;
  readonly reset: StyleMethod;
  readonly bold: StyleMethod;
  readonly dim: StyleMethod;
  readonly italic: StyleMethod;
  readonly underline: StyleMethod;
  readonly inverse: StyleMethod;
  readonly hidden: StyleMethod;
  readonly strikethrough: StyleMethod;
}

const modifierStyler = makeStyler([]);

function colorize(options?: ColorizeOptions): DyeStyler;
function colorize(text: string, options?: ColorizeOptions): string;
function colorize(textOrOptions: string | ColorizeOptions = {}, options: ColorizeOptions = {}): string | DyeStyler {
  return typeof textOrOptions === 'string' ? makeColorStyler(options)(textOrOptions) : makeColorStyler(textOrOptions);
}

export const dye: DyeApi = {
  get enabled() {
    return enabledOverride ?? automaticEnabled;
  },
  setEnabled(value) {
    enabledOverride = value;
  },
  hex,
  strip(text) {
    return text.replace(ANSI_ESCAPE_REGEX, '');
  },
  colorize,
  reset: modifierStyler.reset,
  bold: modifierStyler.bold,
  dim: modifierStyler.dim,
  italic: modifierStyler.italic,
  underline: modifierStyler.underline,
  inverse: modifierStyler.inverse,
  hidden: modifierStyler.hidden,
  strikethrough: modifierStyler.strikethrough,
};
