// Renders the scene to PNGs: a composite and every layer, for each time of
// day. Usage: node tools/export.js [outDir] [--scale N] [--time id] [--composite-only]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { W, H } from '../src/core/buffer.js';
import { buildScene } from '../src/scene/index.js';
import { composite, renderLayer } from '../src/render.js';
import { TIME_ORDER } from '../src/palette/times.js';
import { encodePng } from './png.js';

const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : dflt;
};
const scale = Number(flag('--scale', 1));
const only = flag('--time', null);
const compositeOnly = args.includes('--composite-only');
const outDir = args.find((a) => !a.startsWith('--')) ?? 'out';

const t0 = Date.now();
const stack = buildScene();
console.log(`built ${stack.length} layers in ${Date.now() - t0}ms`);

for (const time of only ? [only] : TIME_ORDER) {
  const dir = join(outDir, time);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'composite.png'), encodePng(composite(stack, time), W, H, scale));
  if (!compositeOnly) {
    stack.forEach((entry, i) => {
      const name = `${String(i).padStart(2, '0')}-${entry.id}.png`;
      writeFileSync(join(dir, name), encodePng(renderLayer(entry, time), W, H, scale));
    });
  }
  console.log(`wrote ${dir}`);
}
