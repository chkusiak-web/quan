// Nearest strip: tall grass and daisies along the bottom edge, plus the
// swallows and drifting petals (kept separate so they can animate later).

import { M } from '../../palette/materials.js';
import { rampPick } from '../../core/buffer.js';
import { rng, noise2 } from '../../core/rng.js';
import { flower } from './ground.js';

export const front = {
  id: 'front',
  label: 'Foreground grass',
  depth: 1,
  draw(layer) {
    const r = rng(161);
    // Clumps of blades rising from the bottom edge and the pool's left bank.
    const tufts = [];
    for (let x = -4; x < 330; x += r.int(2, 4)) {
      const left = x < 70;
      const base = left ? 400 : 401;
      const h = left ? r.int(14, 38) : r.int(4, 12) * (noise2(x * 0.05, 1, 3) > 0.5 ? 1 : 0.5);
      tufts.push({ x, base, h });
    }
    for (const { x, base, h } of tufts) {
      const lean = r.range(-0.35, 0.35);
      for (let k = 0; k < h; k++) {
        const t = 0.2 + 0.6 * (k / h) + r.range(-0.1, 0.1);
        layer.set(Math.round(x + lean * k), base - k, rampPick(M.grass, t, x, base - k, 0.3));
      }
    }
    // Daisies and buttercups, biggest at the front.
    for (let i = 0; i < 70; i++) {
      const x = r.int(0, 320), y = r.int(330, 398);
      if (x > 70 && y < 388) continue;
      flower(layer, x, y, true, r() < 0.5 ? 'yellow' : 'white');
      for (let k = 1; k < r.int(3, 8); k++) layer.set(x, y + 1 + k, M.grass[3]);
    }
  },
};

const SWALLOW = ['d...d', '.dwd.', '..d..'];
const SWALLOW_GLIDE = ['dd...dd', '..ddd..', '...w...'];

export const birds = {
  id: 'birds',
  label: 'Swallows',
  depth: 0.7,
  draw(layer) {
    const key = { d: M.swallow[0], w: M.swallow[2] };
    layer.sprite(284, 64, SWALLOW_GLIDE, key);
    layer.sprite(344, 104, SWALLOW, key);
    layer.sprite(544, 146, SWALLOW, key);
  },
};

export const petals = {
  id: 'petals',
  label: 'Falling petals',
  depth: 0.95,
  draw(layer) {
    const r = rng(171);
    for (let i = 0; i < 26; i++) {
      const x = r.int(10, 460), y = r.int(60, 380);
      const big = r() < 0.35;
      layer.set(x, y, M.blossom[5]);
      layer.set(x + 1, y, M.blossom[4]);
      if (big) { layer.set(x, y + 1, M.blossom[3]); layer.set(x + 1, y + 1, M.blossom[3]); }
    }
  },
};
