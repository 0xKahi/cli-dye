import { arch, platform } from 'node:os';

export const requiredNodeVersion = 'v24.14.0';

export function assertRuntime() {
  if (process.version !== requiredNodeVersion) {
    console.error(
      `Benchmark requires Node.js ${requiredNodeVersion}; currently running ${process.version}. ` +
        'Activate the required Node version and try again.',
    );
    process.exit(1);
  }
}

export function printEnvironment(title) {
  console.log(`\n# ${title}`);
  console.log(`Node: ${process.version}`);
  console.log(`Platform: ${platform()} ${arch()}`);
}
