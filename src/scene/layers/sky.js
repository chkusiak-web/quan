// Sky gradient, plus the stars and harvest moon that only show at night.

import { M } from '../../palette/materials.js';
import { W, rampPick } from '../../core/buffer.js';
import { rng, fbm } from '../../core/rng.js';
import { fillEllipse, sphereLight } from '../../core/shapes.js';

export const HORIZON = 192;
export const MOON = { x: 352, y: 40, r: 13 };

export default {
  id: 'sky',
  label: 'Sky',
  depth: 0,
  draw(layer) {
    const ramp = [...M.sky].reverse(); // light at the horizon, deep at the top
    for (let y = 0; y < HORIZON + 12; y++) {
      const t = Math.pow(y / HORIZON, 1.7);
      for (let x = 0; x < W; x++) layer.set(x, y, rampPick(ramp, 1 - t, x, y, 0.25));
    }
  },
};

// Stars and moon live on their own layer so the sky shows through by day.
export const nightSky = {
  id: 'nightSky',
  label: 'Stars and moon',
  depth: 0,
  draw(layer) {
    const r = rng(77);
    for (let i = 0; i < 170; i++) {
      const x = r.int(0, W - 1), y = Math.floor(Math.pow(r(), 1.4) * 170);
      if (Math.hypot(x - MOON.x, y - MOON.y) < MOON.r + 6) continue;
      const bright = r() < 0.18;
      layer.set(x, y, M.star[bright ? 1 : 0]);
      if (bright && r() < 0.4) {
        layer.set(x - 1, y, M.star[0]); layer.set(x + 1, y, M.star[0]);
        layer.set(x, y - 1, M.star[0]); layer.set(x, y + 1, M.star[0]);
      }
    }

    // Harvest moon: warm orange disc, darker maria, soft limb.
    fillEllipse(MOON.x, MOON.y, MOON.r, MOON.r, (x, y, dx, dy) => {
      const limb = sphereLight(dx, dy, 1, 1);
      const maria = fbm(x * 0.18, y * 0.18, 31, 3);
      const t = 0.35 + 0.55 * limb - (maria > 0.55 ? 0.35 : maria > 0.48 ? 0.15 : 0);
      layer.set(x, y, rampPick(M.moon, t, x, y, 0.4));
    });
  },
};
