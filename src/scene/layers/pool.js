// Baotu Spring: a deep teal pool ringed with mossy boulders, three jets of
// spring water, and dashed ripple rings spreading from each.

import { M } from '../../palette/materials.js';
import { rampPick } from '../../core/buffer.js';
import { noise2, hash2 } from '../../core/rng.js';
import { fillPoly, insidePoly } from '../../core/shapes.js';
import { boulder } from '../../core/paint.js';

const POOL = [[45, 322], [70, 316], [100, 313], [180, 311], [232, 313], [252, 321], [264, 335], [256, 350], [232, 362], [160, 367], [110, 365], [80, 361], [55, 352], [44, 338]];
export const JETS = [
  { x: 112, base: 334, h: 34 },
  { x: 145, base: 347, h: 36 },
  { x: 184, base: 332, h: 28 },
];
const BACK_ROCKS = [
  [-6, 272, 44, 32], [30, 268, 40, 34], [62, 282, 40, 30], [96, 286, 42, 28], [132, 282, 46, 30], [170, 290, 48, 26],
  [206, 288, 42, 30], [234, 298, 38, 26], [254, 308, 34, 28], [-4, 298, 50, 34], [-6, 322, 50, 38], [258, 320, 34, 32],
];
const FRONT_ROCKS = [
  [30, 348, 38, 28], [70, 356, 60, 34], [122, 362, 50, 38], [162, 358, 52, 32], [200, 356, 48, 36], [236, 344, 46, 40],
  [264, 330, 34, 34], [86, 380, 56, 26], [176, 378, 56, 26], [276, 360, 30, 34],
];

function jet(layer, { x, base, h }) {
  for (let y = base - h; y <= base; y++) {
    const t = (y - (base - h)) / h;
    const half = 1.2 + 4.2 * Math.pow(t, 0.55);
    for (let dx = -Math.ceil(half); dx <= Math.ceil(half); dx++) {
      if (Math.abs(dx) > half) continue;
      const streak = noise2((x + dx) * 0.9, y * 0.25, 3);
      const i = Math.abs(dx) < half * 0.45 ? M.pool[7] : streak > 0.5 ? M.pool[6] : M.pool[5];
      layer.set(x + dx, y, i);
    }
    // spray drops off the sides
    if (hash2(x, y, 4) < 0.25) layer.set(x + Math.round((hash2(y, x, 5) - 0.5) * half * 4), y, M.pool[6]);
  }
  // Sparkle on the crown.
  const top = base - h;
  layer.set(x, top - 2, M.pool[7]); layer.set(x - 1, top - 1, M.pool[6]); layer.set(x + 1, top - 1, M.pool[6]);
  layer.set(x, top - 1, M.pool[7]);
  // Foam where it lands.
  for (let dx = -6; dx <= 6; dx++) for (let dy = -1; dy <= 2; dy++) {
    if ((dx * dx) / 36 + (dy * dy) / 4 <= 1 && hash2(x + dx, base + dy, 6) < 0.75) layer.set(x + dx, base + dy, M.pool[dy < 1 ? 7 : 6]);
  }
}

function ripples(layer, { x, base }) {
  for (const rx of [9, 15, 22]) {
    const ry = rx * 0.3;
    for (let a = 0; a < Math.PI * 2; a += 1 / rx) {
      if (Math.sin(a * rx * 0.9) < -0.2) continue;
      const px = Math.round(x + Math.cos(a) * rx), py = Math.round(base + Math.sin(a) * ry);
      if (insidePoly(POOL, px + 0.5, py + 0.5)) layer.set(px, py, rx > 18 ? M.pool[5] : M.pool[6]);
    }
  }
}

export default {
  id: 'pool',
  label: 'Spring pool',
  depth: 0.75,
  draw(layer) {
    BACK_ROCKS.forEach(([x, y, w, h], i) => boulder(layer, M.rock, { x, y, w, h, seed: 120 + i, moss: M.moss, mossAmt: 0.42 }));
    fillPoly(POOL, (x, y) => {
      const dx = (x - 155) / 110, dy = (y - 340) / 28;
      const d = Math.min(1, Math.sqrt(dx * dx + dy * dy));
      let t = 0.2 + 0.4 * d * d + (noise2(x * 0.07, y * 1.1, 2) - 0.5) * 0.3;
      if (y < 320) t -= 0.12;
      if (hash2(x >> 2, y, 3) < 0.04) t += 0.3;
      layer.set(x, y, rampPick(M.pool, t, x, y, 0.3));
    });
    JETS.forEach((j) => ripples(layer, j));
    JETS.forEach((j) => jet(layer, j));
    FRONT_ROCKS.forEach(([x, y, w, h], i) => boulder(layer, M.rock, { x, y, w, h, seed: 140 + i, moss: M.moss, mossAmt: 0.38 }));
  },
};
