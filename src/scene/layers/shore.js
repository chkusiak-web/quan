// The far shore of Daming Lake: a strip of town on the left, and the island
// with Chaoran Tower on the right. Small things are drawn at their real
// size for this distance: trees a few pixels, walls 2-4 px tall.

import { M } from '../../palette/materials.js';
import { Layer } from '../../core/buffer.js';
import { rng } from '../../core/rng.js';
import { foliage, roof, wall, blossoms } from '../../core/paint.js';
import { drawTower, towerHalo } from '../tower.js';

export const ISLAND_WATER = 199;
export const FAR_WATER = 188;
export const TOWER_X = 498;

const E = (x, y, rx, ry) => ({ x, y, rx, ry });

// Tiny house: white wall with a dark roof line.
function tinyHouse(layer, x, y, w, h, roofRamp = M.farRoof, wallRamp = M.farWall) {
  for (let k = 0; k < w + 2; k++) { layer.set(x - 1 + k, y, roofRamp[1]); layer.set(x - 1 + k, y + 1, roofRamp[0]); }
  layer.set(x - 2, y, roofRamp[1]); layer.set(x + w + 1, y, roofRamp[1]);
  for (let yy = y + 2; yy < y + 2 + h; yy++) for (let k = 0; k < w; k++) layer.set(x + k, yy, wallRamp[k === w - 1 ? 1 : 2]);
}

export const farShore = {
  id: 'farShore',
  label: 'Far shore',
  depth: 0.16,
  draw(layer) {
    const r = rng(21);
    // Low tree line along the shore.
    const trees = [];
    for (let x = 100; x < 400; x += r.int(5, 9)) trees.push(E(x, r.int(181, 184), r.int(3, 6), r.int(3, 5)));
    foliage(layer, M.farTree, trees, { seed: 22, leaf: [1, 2], wobble: 1.5, density: 0.7 });
    // Houses peeking out.
    [[204, 181, 8, 3], [236, 180, 6, 3], [270, 181, 9, 3], [296, 178, 12, 5], [330, 180, 8, 4], [348, 181, 10, 3], [380, 180, 7, 4]]
      .forEach(([x, y, w, h]) => tinyHouse(layer, x, y, w, h));
    // A few blossom trees.
    blossoms(layer, M.farPink, [E(152, 180, 5, 3), E(222, 179, 4, 3), E(316, 178, 5, 3), E(366, 177, 6, 4), E(258, 181, 4, 2)], { seed: 23, size: [0, 0] });
    // More trees in front of the houses, then the embankment.
    const front = [];
    for (let x = 110; x < 400; x += r.int(8, 14)) front.push(E(x, r.int(185, 186), r.int(3, 6), 2));
    foliage(layer, M.farTree, front, { seed: 24, leaf: [1, 2], wobble: 1, density: 0.7 });
    for (let x = 100; x < 400; x++) { layer.set(x, FAR_WATER - 1, M.farWall[1]); layer.set(x, FAR_WATER, M.farRoof[0]); }
  },
};

export const island = {
  id: 'island',
  label: 'Island and Chaoran Tower',
  depth: 0.2,
  draw(layer, { glow }) {
    // Trees behind the tower.
    foliage(layer, M.leafFar, [E(455, 182, 16, 10), E(540, 180, 18, 10), E(420, 184, 14, 8), E(585, 182, 18, 9), E(625, 180, 16, 10)],
      { seed: 31, leaf: [1.5, 3], wobble: 2, density: 0.6 });
    // The tower, drawn separately so it can carry a halo.
    const tower = new Layer('tower');
    drawTower(tower, TOWER_X, 123);
    towerHalo(glow, tower);
    for (let p = 0; p < tower.data.length; p++) if (tower.data[p]) layer.data[p] = tower.data[p];

    // Buildings around the base.
    roof(layer, M.roof, { x0: 436, x1: 470, ridgeY: 182, eaveY: 187, inset: 5, curl: 2, seed: 32 });
    wall(layer, M.wall, { x0: 440, x1: 466, y0: 188, y1: 192, windows: [{ x: 444, y: 189, w: 2, h: 2 }, { x: 452, y: 189, w: 2, h: 2 }, { x: 460, y: 189, w: 2, h: 2 }], winRamp: M.window });
    for (let y = 188; y <= 192; y++) [441, 449, 457, 465].forEach((x) => layer.set(x, y, M.red[1]));
    roof(layer, M.roof, { x0: 530, x1: 566, ridgeY: 175, eaveY: 179, inset: 5, curl: 2, seed: 33 });
    wall(layer, M.wall, { x0: 533, x1: 563, y0: 180, y1: 185, windows: [{ x: 538, y: 181, w: 2, h: 2 }, { x: 548, y: 181, w: 2, h: 2 }, { x: 557, y: 181, w: 2, h: 2 }], winRamp: M.window });
    roof(layer, M.roof, { x0: 606, x1: 640, ridgeY: 171, eaveY: 175, inset: 5, curl: 2, seed: 34 });
    wall(layer, M.wall, { x0: 609, x1: 640, y0: 176, y1: 181, windows: [{ x: 614, y: 177, w: 2, h: 2 }, { x: 624, y: 177, w: 2, h: 2 }], winRamp: M.window });

    // Trees in front, hiding the tower's podium.
    foliage(layer, M.leafFar, [
      E(392, 190, 12, 7), E(414, 188, 10, 8), E(478, 189, 14, 8), E(500, 190, 10, 6), E(520, 190, 13, 7),
      E(575, 190, 14, 7), E(598, 191, 10, 6), E(632, 190, 12, 7),
    ], { seed: 35, leaf: [1.5, 3], wobble: 2, density: 0.65, lightBias: 0.08 });
    // Willows and blossoms on the island.
    blossoms(layer, M.blossom, [E(431, 186, 7, 5), E(527, 186, 8, 6), E(566, 186, 6, 4), E(603, 186, 7, 5), E(635, 183, 6, 5)],
      { seed: 36, size: [0, 1], density: 1.2 });

    // White stone balustrade along the water, then the embankment.
    for (let x = 378; x < 640; x++) {
      layer.set(x, ISLAND_WATER - 5, M.stone[4]);
      layer.set(x, ISLAND_WATER - 4, x % 3 === 0 ? M.stone[3] : M.stone[1]);
      layer.set(x, ISLAND_WATER - 3, x % 3 === 0 ? M.stone[2] : M.stone[1]);
      layer.set(x, ISLAND_WATER - 2, M.stone[2]);
      layer.set(x, ISLAND_WATER - 1, M.stone[0]);
    }
    for (let x = 378; x < 640; x += 6) layer.set(x, ISLAND_WATER - 6, M.stone[4]);
  },
};
