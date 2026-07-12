const ansiPattern = /\x1b\[[0-?]*[ -/]*[@-~]/g;

export function hasAnsi(value) {
  return /\x1b\[/.test(value);
}

export function stripAnsi(value) {
  return value.replace(ansiPattern, '');
}
