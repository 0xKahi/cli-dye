import { dye } from '@0xkahi/cli-dye';
import ansiColors from 'ansi-colors';
import { Chalk } from 'chalk';
import kleur from 'kleur';
import * as kleurColors from 'kleur/colors';
import { renderNested } from './fixtures.mjs';

// Benchmarks must measure styling work even when stdout is redirected.
dye.setEnabled(true);
ansiColors.enabled = true;
kleur.enabled = true;
kleurColors.$.enabled = true;

const chalk = new Chalk({ level: 1 });

function adapter(name, color, stacked, construct, reusable) {
  return {
    name,
    color,
    stacked,
    construct,
    reusable,
    nested() {
      return renderNested(color);
    },
    nestedRestoration() {
      return color('red', `${color('red', 'inner')} after`);
    },
  };
}

const reusableDye = dye.colorize({ fg: 'red' }).bold().underline().italic();
const reusableChalk = chalk.red.bold.underline.italic;
const reusableKleur = kleur.red().bold().underline().italic;
const reusableAnsiColors = ansiColors.red.bold.underline.italic;

export const adapters = [
  adapter(
    'dye',
    (name, text) => dye.colorize(text, { fg: name }),
    text => dye.colorize({ fg: 'red' }).bold().underline().italic()(text),
    () => dye.colorize({ fg: 'red' }).bold().underline().italic(),
    text => reusableDye(text),
  ),
  adapter(
    'chalk',
    (name, text) => chalk[name](text),
    text => chalk.red.bold.underline.italic(text),
    () => chalk.red.bold.underline.italic,
    text => reusableChalk(text),
  ),
  adapter(
    'kleur',
    (name, text) => kleur[name](text),
    text => kleur.red().bold().underline().italic(text),
    () => kleur.red().bold().underline().italic,
    text => reusableKleur(text),
  ),
  adapter(
    'kleur/colors',
    (name, text) => kleurColors[name](text),
    text => kleurColors.red(kleurColors.bold(kleurColors.underline(kleurColors.italic(text)))),
    undefined,
    undefined,
  ),
  adapter(
    'ansi-colors',
    (name, text) => ansiColors[name](text),
    text => ansiColors.red.bold.underline.italic(text),
    () => ansiColors.red.bold.underline.italic,
    text => reusableAnsiColors(text),
  ),
];
