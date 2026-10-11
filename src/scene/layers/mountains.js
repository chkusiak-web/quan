// Far ranges and the nearer hills. Ridgelines are traced from the
// reference; slopes facing the light (upper left) are paler, and every range
// fades toward the horizon colour at its foot.

import { M } from '../../palette/materials.js';
import { W, rampPick } from '../../core/buffer.js';
import { fbm, hash2 } from '../../core/rng.js';
import { clamp } from '../../core/shapes.js';
import { polyAt } from '../../core/paint.js';

export const SHORE_Y = 188;

const FAR = [[0, 150], [40, 146], [90, 141], [130, 144], [150, 143], [200, 139], [235, 142], [250, 144], [290, 146], [320, 142], [350, 140], [400, 139], [425, 136], [455, 147], [470, 143], [510, 145], [535, 146], [560, 139], [600, 143], [640, 146]];
const MID = [[0, 162], [30, 158], [60, 156], [110, 163], [150, 161], [175, 157], [205, 162], [300, 158], [330, 154], [360, 156], [395, 158], [420, 155], [450, 162], [480, 160], [530, 156], [560, 150], [600, 154], [640, 150]];
const PAGODA_HILL = [[100, 190], [140, 172], [170, 166], [200, 160], [225, 153], [246, 148], [262, 148], [282, 154], [310, 161], [335, 167], [360, 174], [400, 190]];
const NEAR_HILLS = [
  [[340, 190], [360, 178], [380, 172], [400, 166], [418, 165], [438, 170], [460, 176], [480, 190]],
  [[520, 190], [540, 176], [565, 169], [590, 165], [615, 166], [640, 164]],
  [[0, 172], [30, 168], [70, 170], [110, 174], [140, 190]],
];

// Shade a range below its ridge. The ridge is blurred more the further
// below it we look, so spurs fan out down the slope.
function range(layer, ramp, ridge, { bottom = SHORE_Y + 2, seed = 1, texture = 0.18, foot = 0.25, x0 = 0, x1 = W - 1 } = {}) {
  const top = new Float32Array(W);
  for (let x = 0; x < W; x++) top[x] = polyAt(ridge, x);
  const prefix = new Float32Array(W + 1);
  for (let x = 0; x < W; x++) prefix[x + 1] = prefix[x] + top[x];
  const smooth = (x, rad) => {
    const a = Math.max(0, Math.floor(x - rad)), b = Math.min(W, Math.ceil(x + rad) + 1);
    return (prefix[b] - prefix[a]) / (b - a);
  };
  const xa = Math.max(x0, Math.floor(ridge[0][0])), xb = Math.min(x1, Math.ceil(ridge[ridge.length - 1][0]));
  for (let x = xa; x <= xb; x++) {
    for (let y = Math.round(top[x]); y <= bottom; y++) {
      const depth = y - top[x];
      const rad = 1.5 + depth * 0.9;
      const slope = (smooth(x + 1, rad) - smooth(x - 1, rad)) / 2;
      const f = clamp(depth / Math.max(4, bottom - top[x]));
      const n = (fbm(x * 0.12, y * 0.25, seed, 3) - 0.5) * texture;
      const t = 0.5 - slope * 1.6 + f * foot + n + (depth < 1 ? 0.12 : 0);
      layer.set(x, y, rampPick(ramp, t, x, y, 0.35));
    }
  }
}

export const farMountains = {
  id: 'farMountains',
  label: 'Far mountains',
  depth: 0.08,
  draw(layer) {
    range(layer, M.mtnFar, FAR, { seed: 2, texture: 0.12, foot: 0.15 });
    range(layer, M.mtnMid, MID, { seed: 3, texture: 0.16, foot: 0.35 });
  },
};

export const hills = {
  id: 'hills',
  label: 'Hills',
  depth: 0.12,
  draw(layer) {
    range(layer, M.hill, PAGODA_HILL, { seed: 4, texture: 0.3, foot: 0.3 });
    // Tree speckle on the pagoda hill.
    for (let y = 150; y < SHORE_Y; y++) for (let x = 150; x < 360; x++) {
      if (layer.get(x, y) && hash2(x, y, 8) < 0.04 && fbm(x * 0.2, y * 0.2, 6) > 0.55) layer.set(x, y, M.hill[1]);
    }
    // The little pagoda on the summit (1-2 px wide at this distance).
    for (let y = 140; y < 149; y++) layer.set(255, y, M.hill[y < 143 ? 1 : 0]);
    layer.set(254, 147, M.hill[0]); layer.set(256, 147, M.hill[0]);
    layer.set(254, 144, M.hill[1]); layer.set(256, 144, M.hill[1]);
    NEAR_HILLS.forEach((r, i) => range(layer, M.hill, r, { seed: 10 + i, texture: 0.3, foot: 0.1 }));
  },
};
