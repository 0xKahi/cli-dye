import { assertRuntime, printEnvironment } from './environment.mjs';
import { validateAdapters } from './validation.mjs';

assertRuntime();
printEnvironment('Benchmark validation');
validateAdapters();
console.log('Validated Dye, Chalk, Kleur, kleur/colors, and ansi-colors workloads.');
