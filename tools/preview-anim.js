// Renders frames of the animated pixel map to PNGs, for previews.
// Usage: node tools/preview-anim.js outDir [time] [frames] [scale] [x0 y0 x1 y1]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as baotu from '../src/pixmap/baotu.js';
import { createScene } from '../src/pixmap/animate.js';
import { encodePng } from './png.js';

const [outDir = 'out/anim', time = 'midday', frames = '40', scale = '2', ...box] = process.argv.slice(2);
const [x0, y0, x1, y1] = box.length ? box.map(Number) : [0, 0, baotu.W, baotu.H];
mkdirSync(outDir, { recursive: true });
const scene = createScene(baotu, time);
const buf = new Uint8ClampedArray(baotu.W * baotu.H * 4);
const w = x1 - x0, h = y1 - y0;
for (let f = 0; f < Number(frames); f++) {
  scene.frame(buf, f);
  const crop = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) crop.set(buf.subarray(((y0 + y) * baotu.W + x0) * 4, ((y0 + y) * baotu.W + x1) * 4), y * w * 4);
  writeFileSync(join(outDir, `f${String(f).padStart(3, '0')}.png`), encodePng(crop, w, h, Number(scale)));
}
console.log(`wrote ${frames} frames to ${outDir}`);
