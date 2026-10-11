// Willows, the stone arch bridge, the stream running down to the spring,
// and the house and bushes on the right bank.

import { M } from '../../palette/materials.js';
import { rampPick } from '../../core/buffer.js';
import { rng, noise2 } from '../../core/rng.js';
import { willow, foliage, roof, wall, boulder, fillPoly } from '../../core/paint.js';

const E = (x, y, rx, ry) => ({ x, y, rx, ry });

export const willows = {
  id: 'willows',
  label: 'Willows',
  depth: 0.42,
  draw(layer) {
    willow(layer, M.willow, { x: 378, top: 214, hw: 32, h: 86, seed: 71, barkRamp: M.bark, trunk: { x: 376, w: 3 } });
    willow(layer, M.willow, { x: 428, top: 258, hw: 18, h: 48, seed: 72, barkRamp: M.bark, trunk: { x: 427, w: 2 } });
    willow(layer, M.willow, { x: 345, top: 250, hw: 27, h: 80, seed: 73, barkRamp: M.bark, trunk: { x: 343, w: 3 }, light: 0.05 });
  },
};

export const STREAM = [
  [419, 316], [450, 316], [458, 334], [470, 352], [488, 372], [504, 386], [522, 400],
  [446, 400], [432, 380], [424, 360], [418, 340],
];

function bridge(layer) {
  const x0 = 400, x1 = 467, cx = 434;
  const deck = (x) => 296 - Math.round(3 * Math.sin((Math.PI * (x - x0)) / (x1 - x0)));
  const S = M.stone;
  // Body with an arch cut out.
  for (let x = x0; x <= x1; x++) {
    const top = deck(x);
    for (let y = top; y <= 318; y++) {
      const ax = (x + 0.5 - cx) / 15, ay = (y + 0.5 - 319) / 13;
      const inArch = ax * ax + ay * ay < 1;
      const ring = ax * ax + ay * ay < 1.35;
      if (inArch) {
        // Shadow under the arch.
        layer.set(x, y, y < 312 ? M.rock[0] : M.rock[1]);
        continue;
      }
      const course = (y - top) % 3 === 2;
      const joint = (x + ((Math.floor((y - top) / 3) % 2) * 3)) % 6 === 0;
      let t = 0.62 - 0.25 * ((x - x0) / (x1 - x0)) - 0.15 * ((y - top) / 22) + (noise2(x * 0.3, y * 0.3, 7) - 0.5) * 0.15;
      if (course || joint) t -= 0.2;
      if (ring) t = (Math.atan2(ay, ax) | 0) % 2 ? 0.75 : 0.55;
      if (y === top) t = 0.95;
      layer.set(x, y, rampPick(M.rock, t, x, y, 0.3));
    }
  }
  // Balustrade: rail, posts, base rail.
  for (let x = x0 + 1; x < x1; x++) {
    const top = deck(x);
    layer.set(x, top - 1, S[1]);
    layer.set(x, top - 4, S[4]);
    layer.set(x, top - 5, S[3]);
    if ((x - x0) % 7 === 3) for (let y = top - 6; y < top; y++) { layer.set(x, y, S[3]); layer.set(x + 1, y, S[1]); }
    else { layer.set(x, top - 3, S[2]); layer.set(x, top - 2, S[0]); }
  }
  // Squat end posts
  for (const ex of [x0, x1 - 1]) for (let y = deck(ex) - 7; y < deck(ex); y++) { layer.set(ex, y, S[4]); layer.set(ex + 1, y, S[2]); }
}

// Rocks along both banks. They sit on top of the grass, so the slope layer
// draws them.
export function streamRocks(layer) {
  const r = rng(82);
  const rocks = [
    [404, 330, 14, 7], [396, 342, 12, 8], [410, 352, 14, 7], [416, 366, 12, 8], [420, 382, 16, 9], [428, 392, 18, 8],
    [456, 336, 10, 6], [466, 350, 14, 7], [480, 364, 14, 8], [494, 376, 16, 8], [510, 388, 14, 9], [434, 322, 10, 5],
  ];
  rocks.forEach(([x, y, w, h], i) => boulder(layer, M.rock, { x, y, w, h, seed: 90 + i, moss: M.moss, mossAmt: 0.35 }));
  // White water at the foot of each rock.
  for (const [x, y, w, h] of rocks) for (let k = 0; k < w; k += 2) if (r() < 0.6) layer.set(x + k, y + h + 1, M.pool[7]);
}

export const bridgeStream = {
  id: 'bridgeStream',
  label: 'Bridge and stream',
  depth: 0.5,
  draw(layer) {
    // Stream: bright water in quick runs, foam where it tumbles.
    fillPoly(STREAM, (x, y) => {
      const f = (y - 316) / 84;
      const run = noise2(x * 0.15, y * 0.9, 4);
      let t = 0.62 + run * 0.25 - f * 0.08;
      if (noise2(x * 0.3 + y * 0.12, y * 0.5, 5) > 0.72) t = 1; // foam streaks
      layer.set(x, y, rampPick(M.pool, t, x, y, 0.3));
    });
    bridge(layer);

    // Willows beyond the bridge, trunks down to the water.
    willow(layer, M.willow, { x: 522, top: 283, hw: 25, h: 62, seed: 74, barkRamp: M.bark, trunk: { x: 520, w: 3 } });
    willow(layer, M.willow, { x: 552, top: 292, hw: 15, h: 44, seed: 75, barkRamp: M.bark, trunk: { x: 551, w: 2 } });
    willow(layer, M.willow, { x: 488, top: 282, hw: 27, h: 68, seed: 76, barkRamp: M.bark, trunk: { x: 497, w: 3 } });
  },
};

export const rightBank = {
  id: 'rightBank',
  label: 'Right bank',
  depth: 0.62,
  draw(layer) {
    foliage(layer, M.leaf, [E(600, 304, 44, 12), E(570, 312, 24, 10)], { seed: 101, leaf: [2, 4], density: 0.6 });
    // House with its gable end to the left.
    wall(layer, M.wall, { x0: 541, x1: 600, y0: 330, y1: 348, footing: M.rock, windows: [{ x: 578, y: 336, w: 4, h: 4 }], winRamp: M.window });
    roof(layer, M.roof, { x0: 548, x1: 640, ridgeY: 314, eaveY: 330, inset: 14, curl: 3, seed: 102 });
    for (let y = 316; y <= 330; y++) {
      const half = (y - 316) * 1.2;
      for (let x = Math.round(560 - half); x <= Math.round(560 + half); x++) layer.set(x, y, Math.abs(x - 560) >= half - 1 ? M.trim[1] : M.wall[3]);
      layer.set(Math.round(560 - half) - 1, y, M.roof[4]); layer.set(Math.round(560 - half) - 2, y, M.roof[2]);
    }
    roof(layer, M.roof, { x0: 588, x1: 640, ridgeY: 326, eaveY: 346, inset: 8, curl: 3, seed: 103 });
    wall(layer, M.wall, { x0: 592, x1: 640, y0: 347, y1: 362, footing: M.rock, windows: [{ x: 606, y: 352, w: 4, h: 4 }], winRamp: M.window });
    // Bushes spilling down to the stream.
    foliage(layer, M.leaf, [
      E(560, 372, 34, 22), E(612, 380, 40, 24), E(530, 392, 26, 14), E(632, 360, 16, 14), E(585, 395, 40, 12), E(520, 362, 14, 10),
    ], { seed: 104, leaf: [2.5, 5], density: 0.7 });
  },
};
