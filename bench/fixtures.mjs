export const colorNames = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray'];
export const sampleText = 'benchmark text';
export const stackedPlainText = 'stacked benchmark text';

export const nestedSegments = [
  ['plain', 'outer start '],
  ['white', 'white'],
  ['plain', ' then red '],
  ['blue', 'blue'],
  ['plain', ' then red '],
  ['green', 'green'],
  ['plain', ' then red '],
  ['magenta', 'magenta'],
  ['plain', ' then red '],
  ['cyan', 'cyan'],
  ['plain', ' outer end'],
];

export const nestedPlainText = nestedSegments.map(([, text]) => text).join('');

export function renderNested(color) {
  const inner = nestedSegments.map(([name, text]) => (name === 'plain' ? text : color(name, text))).join('');
  return color('red', inner);
}
