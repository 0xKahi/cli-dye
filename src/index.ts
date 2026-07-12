const ESC = '\x1b[';
const ANSI_ESCAPE_REGEX = new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, 'g');
const HEX_REGEX = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;
const PLAN = Symbol('dye.stylePlan');

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

interface InternalStyler extends DyeStyler {
  readonly [PLAN]: StylePlan;
}

interface AnsiBlock {
  readonly id: string;
  readonly open: string;
  readonly close: string;
  readonly cacheable: boolean;
}

interface Restoration {
  readonly close: string;
  readonly reopen: string;
}

interface StylePlan {
  readonly blocks: readonly AnsiBlock[];
  readonly open: string;
  readonly close: string;
  readonly restorations: readonly Restoration[];
  readonly cacheKey?: string;
}

const MODIFIERS: Record<ModifierName, AnsiBlock> = {
  reset: { id: 'reset', open: `${ESC}0m`, close: `${ESC}0m`, cacheable: true },
  bold: { id: 'bold', open: `${ESC}1m`, close: `${ESC}22m`, cacheable: true },
  dim: { id: 'dim', open: `${ESC}2m`, close: `${ESC}22m`, cacheable: true },
  italic: { id: 'italic', open: `${ESC}3m`, close: `${ESC}23m`, cacheable: true },
  underline: { id: 'underline', open: `${ESC}4m`, close: `${ESC}24m`, cacheable: true },
  inverse: { id: 'inverse', open: `${ESC}7m`, close: `${ESC}27m`, cacheable: true },
  hidden: { id: 'hidden', open: `${ESC}8m`, close: `${ESC}28m`, cacheable: true },
  strikethrough: { id: 'strikethrough', open: `${ESC}9m`, close: `${ESC}29m`, cacheable: true },
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

function namedColorBlocks(background: boolean): Record<StandardColor, AnsiBlock> {
  const result = {} as Record<StandardColor, AnsiBlock>;
  for (const name of Object.keys(COLOR_CODES) as StandardColor[]) {
    const code = COLOR_CODES[name] + (background ? 10 : 0);
    const channel = background ? 'bg' : 'fg';
    result[name] = Object.freeze({
      id: `${channel}:${name}`,
      open: `${ESC}${code}m`,
      close: `${ESC}${background ? 49 : 39}m`,
      cacheable: true,
    });
  }
  return Object.freeze(result);
}

const FOREGROUND_BLOCKS = namedColorBlocks(false);
const BACKGROUND_BLOCKS = namedColorBlocks(true);

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
  if (typeof color === 'string') return background ? BACKGROUND_BLOCKS[color] : FOREGROUND_BLOCKS[color];
  const channel = background ? 'bg' : 'fg';
  const prefix = background ? 48 : 38;
  return {
    id: channel,
    open: `${ESC}${prefix};2;${color.r};${color.g};${color.b}m`,
    close: `${ESC}${background ? 49 : 39}m`,
    cacheable: false,
  };
}

function createPlan(blocks: readonly AnsiBlock[]): StylePlan {
  let open = '';
  let close = '';
  const reopenByClose = new Map<string, string>();
  let cacheable = true;
  let cacheKey = '';

  for (const block of blocks) {
    open += block.open;
    reopenByClose.set(block.close, (reopenByClose.get(block.close) ?? '') + block.open);
    cacheable &&= block.cacheable;
    cacheKey += `${block.id}|`;
  }
  for (const block of [...blocks].reverse()) close += block.close;

  return Object.freeze({
    blocks: Object.freeze([...blocks]),
    open,
    close,
    restorations: Object.freeze([...reopenByClose].map(([sequence, reopen]) => Object.freeze({ close: sequence, reopen }))),
    cacheKey: cacheable ? cacheKey : undefined,
  });
}

function renderPlan(text: string, plan: StylePlan): string {
  if (!dye.enabled || plan.blocks.length === 0) return text;
  let content = text;
  if (content.includes('\x1b')) {
    for (const restoration of plan.restorations) {
      if (content.includes(restoration.close)) {
        content = content.replaceAll(restoration.close, restoration.close + restoration.reopen);
      }
    }
  }
  return plan.open + content + plan.close;
}

const stylerCache = new Map<string, DyeStyler>();

function extendStyler(styler: InternalStyler, name: ModifierName, text?: string): DyeStyler | string {
  const plan = styler[PLAN];
  const block = MODIFIERS[name];
  const next = plan.blocks.some(current => current.id === block.id) ? styler : makeStyler([...plan.blocks, block]);
  return text === undefined ? next : next(text);
}

const SHARED_METHODS: Record<ModifierName, StyleMethod> = {} as Record<ModifierName, StyleMethod>;
for (const name of Object.keys(MODIFIERS) as ModifierName[]) {
  SHARED_METHODS[name] = function (this: InternalStyler, text?: string): DyeStyler | string {
    return extendStyler(this, name, text);
  } as StyleMethod;
}

function makeStyler(blocks: readonly AnsiBlock[]): DyeStyler {
  let cacheKey = '';
  for (const block of blocks) {
    if (!block.cacheable) {
      cacheKey = '';
      break;
    }
    cacheKey += `${block.id}|`;
  }
  if (blocks.length === 0 || cacheKey !== '') {
    const cached = stylerCache.get(cacheKey);
    if (cached !== undefined) return cached;
  }

  const plan = createPlan(blocks);
  const styler = ((text: string) => renderPlan(text, plan)) as InternalStyler;
  Object.defineProperty(styler, PLAN, { value: plan });
  Object.assign(styler, SHARED_METHODS);
  if (plan.cacheKey !== undefined) stylerCache.set(plan.cacheKey, styler);
  return styler;
}

function blocksForOptions(options: ColorizeOptions): AnsiBlock[] {
  const blocks: AnsiBlock[] = [];
  if (options.fg !== undefined) blocks.push(colorBlock(options.fg, false));
  if (options.bg !== undefined) blocks.push(colorBlock(options.bg, true));
  return blocks;
}

function makeColorStyler(options: ColorizeOptions): DyeStyler {
  return makeStyler(blocksForOptions(options));
}

function renderImmediate(text: string, options: ColorizeOptions): string {
  if (!dye.enabled || (options.fg === undefined && options.bg === undefined)) return text;
  const foreground = options.fg === undefined ? undefined : colorBlock(options.fg, false);
  const background = options.bg === undefined ? undefined : colorBlock(options.bg, true);
  let content = text;

  if (content.includes('\x1b')) {
    if (foreground !== undefined && content.includes(foreground.close)) {
      content = content.replaceAll(foreground.close, foreground.close + foreground.open);
    }
    if (background !== undefined && content.includes(background.close)) {
      content = content.replaceAll(background.close, background.close + background.open);
    }
  }

  return (foreground?.open ?? '') + (background?.open ?? '') + content + (background?.close ?? '') + (foreground?.close ?? '');
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

const modifierStyler = makeStyler([]) as InternalStyler;

function colorize(options?: ColorizeOptions): DyeStyler;
function colorize(text: string, options?: ColorizeOptions): string;
function colorize(textOrOptions: string | ColorizeOptions = {}, options: ColorizeOptions = {}): string | DyeStyler {
  return typeof textOrOptions === 'string' ? renderImmediate(textOrOptions, options) : makeColorStyler(textOrOptions);
}

function rootModifier(name: ModifierName): StyleMethod {
  return ((text?: string) => extendStyler(modifierStyler, name, text)) as StyleMethod;
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
  reset: rootModifier('reset'),
  bold: rootModifier('bold'),
  dim: rootModifier('dim'),
  italic: rootModifier('italic'),
  underline: rootModifier('underline'),
  inverse: rootModifier('inverse'),
  hidden: rootModifier('hidden'),
  strikethrough: rootModifier('strikethrough'),
};
