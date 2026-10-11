// The grassy slope running from the cherry tree down to the stream, and
// the bank on the far side of the stream. Bright yellow-green, lit from the
// upper left, with blades, a soft diagonal sheen and scattered flowers.

import { M } from '../../palette/materials.js';
import { rampPick } from '../../core/buffer.js';
import { rng, noise2, hash2 } from '../../core/rng.js';
import { fillPoly } from '../../core/shapes.js';
import { polyAt } from '../../core/paint.js';
import { streamRocks } from './riverside.js';

const SLOPE_TOP = [[0, 236], [60, 250], [120, 262], [180, 272], [240, 282], [290, 292], [330, 300], [370, 306], [400, 314], [419, 316]];
const SLOPE = [...SLOPE_TOP, [418, 340], [424, 360], [432, 380], [446, 400], [0, 400]];
const BANK = [[450, 316], [470, 318], [500, 336], [530, 344], [560, 352], [560, 400], [522, 400], [504, 386], [488, 372], [470, 352], [458, 334]];

// Tiny flowers: 1 px far up the slope, little crosses near the bottom.
export function flower(layer, x, y, big, kind) {
  const R = kind === 'yellow' ? M.yellow : M.white;
  if (!big) { layer.set(x, y, R[2]); return; }
  layer.set(x, y - 1, R[2]); layer.set(x - 1, y, R[1]); layer.set(x + 1, y, R[1]); layer.set(x, y + 1, R[0]);
  layer.set(x, y, kind === 'yellow' ? M.yellow[0] : M.yellow[1]);
}

function grass(layer, poly, top, seed) {
  fillPoly(poly, (x, y) => {
    const edge = y - polyAt(top, x);
    let t = 0.64 - 0.0016 * (y - 240) + (noise2(x * 0.05, y * 0.08, seed) - 0.5) * 0.3;
    // Mottled clumps of darker and lighter grass.
    const clump = noise2(x * 0.18, y * 0.3, seed + 2);
    t += clump > 0.68 ? 0.12 : clump < 0.3 ? -0.14 : 0;
    // A diagonal band of sun across the slope.
    const band = Math.sin((x * 0.6 - y) * 0.035);
    t += band > 0.6 ? 0.1 : 0;
    // Shade under the bushes along the top edge.
    if (edge < 5) t -= 0.25 * (1 - edge / 5);
    // Blades: a light tick with a shadow under it.
    const h = hash2(x, y, seed);
    if (h < 0.12) t += 0.16;
    else if (h > 0.9) t -= 0.18;
    layer.set(x, y, rampPick(M.grass, t, x, y, 0.35));
  });
}

export default {
  id: 'slope',
  label: 'Grass slope',
  depth: 0.6,
  draw(layer) {
    grass(layer, SLOPE, SLOPE_TOP, 3);
    grass(layer, BANK, BANK.slice(0, 5), 4);
    const r = rng(111);
    for (let i = 0; i < 1800; i++) {
      const x = r.int(0, 560), y = r.int(240, 399);
      if (!layer.get(x, y) || !layer.get(x - 1, y + 1) || !layer.get(x + 1, y - 1)) continue;
      const near = (y - 240) / 160;
      if (r() > 0.25 + near * 0.6) continue;
      flower(layer, x, y, r() < near * 0.5, r() < 0.6 ? 'yellow' : 'white');
    }
    streamRocks(layer);
  },
};
