// Exports the pixel map as one transparent PNG per layer, plus the full
// picture, for each time of day.
// Usage: node tools/export-pixmap-layers.js [outDir] [--scale N]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as baotu from '../src/pixmap/baotu.js';
import { renderPixmap } from '../src/pixmap/draw.js';
import { TIME_ORDER } from '../src/palette/times.js';
import { encodePng } from './png.js';

const args = process.argv.slice(2);
const si = args.indexOf('--scale');
const scale = si >= 0 ? Number(args.splice(si, 2)[1]) : 1;
const outDir = args[0] ?? 'out/pixmap';

for (const time of TIME_ORDER) {
  const dir = join(outDir, time);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'composite.png'), encodePng(renderPixmap(baotu, time), baotu.W, baotu.H, scale));
  [...baotu.LAYERS, 'glow'].forEach((name, i) => {
    const png = encodePng(renderPixmap(baotu, time, new Set([name])), baotu.W, baotu.H, scale);
    writeFileSync(join(dir, `${String(i).padStart(2, '0')}-${name}.png`), png);
  });
  console.log(`wrote ${dir}`);
}
