// The village on the slope: grey-tile courtyard houses stepping down the
// hill among trees and blossom, with the lake glinting behind.

import { M } from '../../palette/materials.js';
import { foliage, roof, wall, blossoms } from '../../core/paint.js';

const E = (x, y, rx, ry) => ({ x, y, rx, ry });

// A courtyard house: tiled roof, white wall, dark windows that light at night.
function house(layer, { x0, x1, ridge, eave, wallTo, inset = 8, curl = 3, seed, windows = [] }) {
  wall(layer, M.wall, { x0: x0 + 3, x1: x1 - 3, y0: eave + 1, y1: wallTo, footing: M.rock, windows, winRamp: M.window });
  roof(layer, M.roof, { x0, x1, ridgeY: ridge, eaveY: eave, inset, curl, seed });
}

// Gable end seen from the side: a white triangle framed by the roof edge
// and a red-brown trim.
function gable(layer, { cx, peak, base, hw, wallTo }) {
  for (let y = peak; y <= wallTo; y++) {
    const t = Math.min(1, (y - peak) / (base - peak));
    const half = hw * t;
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const edge = Math.abs(x - cx) >= half - 1.2 && y <= base;
      const i = edge ? M.trim[1] : y === base + 1 ? M.wall[1] : M.wall[x > cx + half * 0.5 ? 2 : 3];
      layer.set(x, y, i);
    }
  }
  // Roof edge riding over the trim
  for (let y = peak - 1; y <= base; y++) {
    const half = hw * Math.min(1, (y - peak + 1) / (base - peak)) + 2;
    layer.set(Math.round(cx - half), y, M.roof[2]); layer.set(Math.round(cx - half) - 1, y, M.roof[4]);
    layer.set(Math.round(cx + half), y, M.roof[1]); layer.set(Math.round(cx + half) + 1, y, M.roof[0]);
  }
  for (let x = Math.round(cx - hw - 3); x <= Math.round(cx + hw + 3); x++) layer.set(x, base + 1, M.roof[1]);
}

export default {
  id: 'village',
  label: 'Village',
  depth: 0.34,
  draw(layer) {
    // Woods behind and between the houses.
    foliage(layer, M.leafFar, [
      E(150, 196, 26, 12), E(200, 192, 30, 10), E(250, 194, 30, 10), E(296, 197, 28, 12), E(328, 212, 16, 18),
      E(345, 232, 14, 20), E(140, 228, 30, 26), E(60, 214, 60, 28), E(20, 240, 40, 30), E(100, 236, 40, 24),
    ], { seed: 51, leaf: [2, 3.5], density: 0.6, lightBias: 0.05 });
    foliage(layer, M.leaf, [
      E(150, 215, 30, 22), E(200, 228, 40, 24), E(262, 214, 30, 14), E(304, 244, 44, 20), E(240, 300, 90, 22),
      E(335, 300, 40, 26), E(385, 300, 25, 20), E(392, 268, 20, 30), E(120, 270, 30, 30),
      E(150, 250, 34, 24), E(205, 262, 44, 22), E(270, 270, 46, 22), E(330, 268, 30, 30), E(370, 280, 30, 24),
      E(260, 236, 30, 14), E(300, 225, 26, 12),
    ], { seed: 52, leaf: [2, 4], density: 0.6 });

    // Back row
    house(layer, { x0: 166, x1: 238, ridge: 201, eave: 213, wallTo: 228, inset: 10, seed: 53, windows: [{ x: 178, y: 219, w: 3, h: 3 }] });
    gable(layer, { cx: 216, peak: 203, base: 213, hw: 13, wallTo: 228 });
    house(layer, { x0: 298, x1: 320, ridge: 216, eave: 222, wallTo: 230, inset: 4, curl: 2, seed: 54, windows: [{ x: 307, y: 225, w: 2, h: 2 }] });
    house(layer, { x0: 232, x1: 284, ridge: 221, eave: 233, wallTo: 240, inset: 8, seed: 55 });
    house(layer, { x0: 288, x1: 352, ridge: 232, eave: 243, wallTo: 250, inset: 8, seed: 56 });

    blossoms(layer, M.blossom, [E(250, 240, 12, 7), E(272, 236, 10, 6), E(232, 246, 8, 5)], { seed: 57, leafRamp: M.leaf, size: [0, 2] });

    // Front house with its gable end turned toward us.
    house(layer, { x0: 218, x1: 300, ridge: 242, eave: 259, wallTo: 270, inset: 12, curl: 3, seed: 58, windows: [{ x: 236, y: 264, w: 4, h: 3 }, { x: 262, y: 264, w: 4, h: 3 }] });
    gable(layer, { cx: 314, peak: 243, base: 259, hw: 16, wallTo: 272 });
    for (let x = 300; x <= 330; x++) layer.set(x, 266, M.window[0]);
    // Little house tucked behind the willows.
    house(layer, { x0: 384, x1: 404, ridge: 280, eave: 288, wallTo: 300, inset: 4, curl: 2, seed: 59, windows: [{ x: 392, y: 292, w: 2, h: 3 }] });

    // Shrubs and blossom in front of the houses.
    foliage(layer, M.leaf, [E(190, 280, 30, 12), E(250, 285, 30, 12), E(300, 284, 22, 12), E(355, 300, 30, 16)], { seed: 60, leaf: [2, 4], density: 0.7, lightBias: 0.08 });
    blossoms(layer, M.blossom, [E(255, 272, 18, 8), E(282, 276, 10, 6), E(172, 260, 8, 5)], { seed: 61, leafRamp: M.leaf, size: [0, 3] });
  },
};
